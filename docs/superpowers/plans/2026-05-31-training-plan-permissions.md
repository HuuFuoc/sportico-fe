# Training Plan + Route Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix backend DTO mismatches, add correct coach booking endpoint, implement learner route guard, fix coach learners page to use real API data, and make the training plan builder respect `isReadOnly`.

**Architecture:** Layer order: DTO → endpoints → client → api.ts → UI components. No fetch() calls inside pages. Deployed API via `/api-proxy` rewrite (NEXT_PUBLIC_API_BASE_URL=/api-proxy, BACKEND_ORIGIN=Azure URL). Mock mode off when env var is set.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, Zustand, motion/react, Lucide icons, Zod validation

**Deployed backend:** `https://sportico-api-khoi-g3bpg4a3dnhehng8.japaneast-01.azurewebsites.net`

---

## Confirmed Backend Endpoints (from source inspection)

| Purpose | Route | Method | Auth |
|---|---|---|---|
| Get training plan | `GET /api/bookings/{bookingId}/training-plan` | GET | Any authenticated |
| Create training plan | `POST /api/bookings/{bookingId}/training-plan` | POST | Coach role |
| Update training plan | `PUT /api/training-plans/{id}` | PUT | Coach role |
| Add week | `POST /api/training-plans/{id}/weeks` | POST | Coach role |
| Add day | `POST /api/training-plan-weeks/{weekId}/days` | POST | Coach role |
| Add exercise | `POST /api/training-plan-days/{dayId}/exercises` | POST | Coach role |
| Update exercise | `PUT /api/training-plan-exercises/{id}` | PUT | Coach role |
| Delete exercise | `DELETE /api/training-plan-exercises/{id}` | DELETE | Coach role |
| Coach all bookings | `GET /api/bookings/coach` | GET | Coach role |
| **Coach booking by id** | `GET /api/bookings/coach/{id}` | GET | **Coach role** |
| Learner all bookings | `GET /api/bookings/me` | GET | Learner role |
| Learner booking by id | `GET /api/bookings/{id}` | GET | Learner role |

**Critical:** `GET /api/bookings/{id}` requires LEARNER role. Coach must use `GET /api/bookings/coach/{id}`.

---

## Task 1: Fix TrainingPlanResponse DTO — add isReadOnly fields

**Files:**
- Modify: `src/lib/backend/dto.ts`

- [ ] Add `isReadOnly`, `readOnlyReason`, `bookingExpiresAt` to `TrainingPlanResponse`

```ts
export interface TrainingPlanResponse {
  id: string;
  bookingId: string;
  learnerId: string;
  coachId: string;
  title?: string | null;
  goalType?: string | null;
  overview?: string | null;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  bookingExpiresAt?: string | null;
  isReadOnly: boolean;
  readOnlyReason?: string | null;
  weeks?: TrainingPlanWeekResponse[] | null;
}
```

- [ ] Fix `CreateTrainingPlanRequest` to match required backend fields exactly

```ts
export interface CreateTrainingPlanRequest {
  title: string;         // required, non-empty
  goalType: string;      // required, non-empty
  overview?: string;
  startDate: string;     // ISO datetime
  endDate: string;       // ISO datetime
  totalWeeks: number;    // positive int
}
```

- [ ] Fix `CreateDayRequest` — backend `Title` is required (empty string fallback, not null)

```ts
export interface CreateDayRequest {
  dayNumber: number;
  title: string;         // required (send empty string if none)
  notes?: string;
}
```

- [ ] Fix `CreateExerciseRequest` — backend `ExerciseName` and `OrderIndex` are required

```ts
export interface CreateExerciseRequest {
  exerciseName: string;   // required
  orderIndex: number;     // required, 0-based
  sets?: number;
  reps?: string;
  intensity?: string;
  restSeconds?: number;
  notes?: string;
}
```

- [ ] Add `UpdateExerciseRequest` if missing (same shape as Create)

```ts
export interface UpdateExerciseRequest {
  exerciseName: string;
  orderIndex: number;
  sets?: number;
  reps?: string;
  intensity?: string;
  restSeconds?: number;
  notes?: string;
}
```

- [ ] Run: `npx tsc --noEmit` — expect 0 errors

---

## Task 2: Add coach booking-by-id endpoint and client method

**Files:**
- Modify: `src/lib/backend/endpoints.ts`
- Modify: `src/lib/backend/client.ts`

- [ ] Add to `backendEndpoints`:

```ts
// In the Bookings section:
coachBookingById: (id: string) =>
  `/api/bookings/coach/${encodeURIComponent(id)}`,
```

- [ ] Add to `backend` client object:

```ts
async bookingByIdCoach(id: string) {
  return unwrap(await GET<BookingResponse>(ep.coachBookingById(id)));
},
```

- [ ] Run: `npx tsc --noEmit` — expect 0 errors

---

## Task 3: Fix api.ts — fetchBooking to use correct endpoint per role

**Files:**
- Modify: `src/lib/api.ts`

The existing `fetchBooking(id)` calls `backend.booking(id)` → `GET /api/bookings/{id}` which requires LEARNER role. Coach needs `GET /api/bookings/coach/{id}`.

- [ ] Update `fetchBooking` to be role-aware:

```ts
fetchBooking: (id: string): Promise<Booking | null> =>
  liveAuthed<Booking | null>(
    () => {
      // Coach and Learner have different booking-by-id endpoints.
      const role = getCurrentRole();
      if (role === "coach") {
        return backend.bookingByIdCoach(id).then(map.bookingToUi).catch(() => null);
      }
      return backend.booking(id).then(map.bookingToUi).catch(() => null);
    },
    () => null,
  ),
```

- [ ] Run: `npx tsc --noEmit` — expect 0 errors

---

## Task 4: Add learner route guard

**Files:**
- Create: `src/components/auth/LearnerGuard.tsx`
- Create: `src/app/learner/layout.tsx`

Currently `/learner/**` has no auth guard. Any user can open learner pages.

- [ ] Create `src/components/auth/LearnerGuard.tsx` — modelled exactly after CoachGuard but for learner role:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore, hasRole } from "@/lib/store/useAuthStore";
import { LoadingState } from "@/components/common/AsyncStates";

const LEARNER_HOME = "/learner/dashboard";

export function LearnerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (isMockMode()) return;
    if (!getAccessToken()) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (status === "idle") {
      void hydrate();
    }
  }, [status, router, pathname, hydrate]);

  if (isMockMode()) return <>{children}</>;
  if (!getAccessToken()) return null;
  if (status === "idle" || status === "loading") {
    return <LoadingState label="Đang xác thực…" />;
  }
  if (status === "unauthenticated") return null;

  // User authenticated — any role can view learner pages
  // (coaches/admins who also have learner access can browse)
  // If strictly learner-only is needed, add: if (!hasRole(user, "learner")) { ... }
  return <>{children}</>;
}
```

- [ ] Create `src/app/learner/layout.tsx`:

```tsx
import { LearnerGuard } from "@/components/auth/LearnerGuard";

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearnerGuard>{children}</LearnerGuard>;
}
```

- [ ] Run: `npx tsc --noEmit` — expect 0 errors

---

## Task 5: Fix coach learners page — use real booking data

**Files:**
- Modify: `src/app/coach/learners/page.tsx`

The current page uses `api.fetchLearners()` which returns mock `Learner[]`. It must use `api.fetchCoachBookings()` which returns real booking data from `/api/bookings/coach`.

- [ ] Rewrite the coach learners page to use bookings-based data. Key approach:
  - Fetch `api.fetchCoachBookings()` → `Booking[]`
  - Show booking cards (learner name via booking title, package, status, sessions)
  - Link each to `/coach/learners/${booking.id}`
  - Keep the overall visual style consistent with existing pages

The rewrite is large — see the actual implementation file below in the plan execution step. Key props per card:
- `booking.title` (package title)
- `booking.coachId`, `booking.totalSessions`, `booking.completedSessions`
- `booking.status`
- CTA → `/coach/learners/${booking.id}`

- [ ] Run: `npx tsc --noEmit` — expect 0 errors
- [ ] Run: `pnpm build` — expect success

---

## Task 6: Fix coach learner detail — isReadOnly support + correct booking endpoint

**Files:**
- Modify: `src/app/coach/learners/[bookingId]/page.tsx`

The current detail page calls `api.fetchBooking(bookingId)` — after Task 3, this will correctly route to `GET /api/bookings/coach/{id}` for coach role.

Additionally, the training plan builder must:
- Read `plan.isReadOnly` and disable all edit actions when true
- Show `plan.readOnlyReason` when `isReadOnly` is true
- Use correct field names in create requests (`exerciseName` not `name`, `title` not `dayTitle`, etc.)
- `orderIndex` defaults to `exercises.length` for new exercises

- [ ] In `TrainingPlanBuilder`, add `isReadOnly` propagation through all child components
- [ ] Disable "Add week/day/exercise" buttons when `plan.isReadOnly`
- [ ] Show readOnly banner when `isReadOnly === true`
- [ ] Fix exercise create request to use `exerciseName` and compute `orderIndex`
- [ ] Run: `npx tsc --noEmit` — expect 0 errors

---

## Task 7: Update docs/frontend-api-gaps.md

**Files:**
- Modify: `docs/frontend-api-gaps.md`

- [ ] Add Training Plan API Verification table with all confirmed endpoints

---

## Task 8: Final verification

- [ ] Run: `pnpm lint` — expect 0 errors
- [ ] Run: `npx tsc --noEmit` — expect 0 errors
- [ ] Run: `pnpm build` — expect "Compiled successfully"
- [ ] Run: `findstr /s /i "localhost:5095" .env* src\lib\*.ts next.config.ts vercel.json` — expect no matches in src
- [ ] Verify `.env` has `NEXT_PUBLIC_API_BASE_URL=/api-proxy` and `BACKEND_ORIGIN` set to Azure URL
