# Frontend API Gaps

This document tracks backend endpoints that are either missing, unclear, or not yet confirmed as implemented.
It is updated as the integration progresses.

Last updated: 2026-05-31 (updated with wallet, schedule, sessions, training plan verification; learner identity and receipt gaps documented 2026-05-31)

---

## Coach Wallet API Verification

Confirmed from `CoachWalletsController.cs` (role: Coach).

| Purpose | Frontend Function | Confirmed Backend Endpoint | Method | Auth Role | Notes |
|---|---|---|---|---|---|
| Get coach wallet | `backend.wallet()` → `api.fetchEarningsTotal()` | `GET /api/coaches/me/wallet` | GET | Coach | Returns `Result<CoachWalletResponse>`: availableBalance, pendingBalance, totalEarned, totalWithdrawn |
| Get wallet transactions | `backend.walletTransactions()` → `api.fetchEarnings()` | `GET /api/coaches/me/wallet/transactions` | GET | Coach | Paged; filter: Type, Direction, PageNumber, PageSize |
| Get withdrawal requests | `backend.myWithdrawals()` → `api.fetchPayouts()` | `GET /api/coaches/me/withdrawal-requests` | GET | Coach | Paged |
| Create withdrawal | `backend.createWithdrawal(amount)` → `api.createWithdrawal()` | `POST /api/coaches/me/withdrawal-requests` | POST | Coach | Body: `{ amount }` |
| Get withdrawal receipt | Not yet implemented in frontend | `GET /api/coaches/me/withdrawal-requests/{id}/receipt` | GET | Coach | Returns `WithdrawalReceiptResponse` |
| Get payout account | `backend.payoutAccount()` → `api.fetchPayoutAccount()` | `GET /api/coaches/me/payout-account` | GET | Coach | Returns `CoachPayoutAccountResponse` |
| Save payout account | `backend.upsertPayoutAccount(body)` → `api.upsertPayoutAccount()` | `PUT /api/coaches/me/payout-account` | PUT | Coach | Body: payoutMethod, bankName, bankAccountNumber, bankAccountHolder |

**Coach Earnings page fix**: Removed dependency on `api.fetchCoach()` (public coach profile). The earnings page now loads independently using auth token. Empty earnings shows a wallet summary instead of an error state.

---

## Schedule / Availability API Verification

Confirmed from `CoachAvailabilitySlotsController.cs` (roles: Coach/Authorized).

| Purpose | Frontend Function | Confirmed Backend Endpoint | Method | Auth Role | Notes |
|---|---|---|---|---|---|
| Coach: fetch own slots | `api.fetchMySlots(p?)` | `GET /api/coaches/me/availability-slots` | GET | Coach | Filter: Status, StartFrom, StartTo, PageNumber, PageSize |
| Coach: create slot | `api.createSlot(body)` | `POST /api/coaches/me/availability-slots` | POST | Coach | Body: startTime, endTime, location, isOnline, meetingUrl, note |
| Coach: cancel slot | `api.cancelSlot(id)` | `PUT /api/coaches/me/availability-slots/{id}/cancel` | PUT | Coach | No body required |
| Learner: view coach slots | `api.fetchCoachSlots(coachId, p?)` | `GET /api/coaches/{coachId}/availability-slots` | GET | Any Auth | Filter: StartFrom, StartTo |

---

## Training Sessions API Verification

Confirmed from `TrainingSessionsController.cs`.

| Purpose | Frontend Function | Confirmed Backend Endpoint | Method | Auth Role | Notes |
|---|---|---|---|---|---|
| Learner: get own sessions | `api.fetchSessionsForLearner()` | `GET /api/learners/me/training-sessions` | GET | Learner | Paged; Filter: Status, StartFrom, StartTo |
| Coach: get own sessions | `api.fetchSessionsForCoach()` | `GET /api/coaches/me/training-sessions` | GET | Coach | Paged; Filter: Status, StartFrom, StartTo |
| Get sessions for booking | `backend.bookingSessions(bookingId)` | `GET /api/bookings/{bookingId}/sessions` | GET | Any Auth | Accessible by both learner and coach |
| Learner: create session | `api.bookSession(bookingId, slotId)` | `POST /api/bookings/{bookingId}/sessions` | POST | Learner | Body: `{ availabilitySlotId, learnerNote }` |
| Coach: confirm session | `api.confirmSession(id, body)` | `PUT /api/training-sessions/{id}/confirm` | PUT | Coach | Body: `{ location, meetingUrl, coachNote }` |
| Coach or Learner: cancel | `api.cancelSession(id, reason)` | `PUT /api/training-sessions/{id}/cancel` | PUT | Any Auth | Body: `{ reason }` |
| Coach: complete session | `api.completeSession(id)` | `PUT /api/training-sessions/{id}/complete` | PUT | Coach | No body |

---

## Training Plan API Verification

Confirmed from `TrainingPlansController.cs` (Coach-only write; Any Auth read).

| Purpose | Frontend Function | Confirmed Backend Endpoint | Method | Auth Role | Notes |
|---|---|---|---|---|---|
| Create plan for booking | `backend.createTrainingPlan()` | `POST /api/bookings/{bookingId}/training-plan` | POST | Coach | |
| Get plan for booking | `api.fetchTrainingPlan(bookingId)` | `GET /api/bookings/{bookingId}/training-plan` | GET | Any Auth | Both learner and coach can read |
| Update plan header | `backend.updateTrainingPlan()` | `PUT /api/training-plans/{id}` | PUT | Coach | |
| Add week to plan | `backend.addPlanWeek()` | `POST /api/training-plans/{id}/weeks` | POST | Coach | |
| Add day to week | `backend.addPlanDay()` | `POST /api/training-plan-weeks/{weekId}/days` | POST | Coach | |
| Add exercise to day | `backend.addExercise()` | `POST /api/training-plan-days/{dayId}/exercises` | POST | Coach | |
| Update exercise | `backend.updateExercise()` | `PUT /api/training-plan-exercises/{id}` | PUT | Coach | |
| Delete exercise | `backend.deleteExercise()` | `DELETE /api/training-plan-exercises/{id}` | DELETE | Coach | |

---

## Public Coaches API Verification

Confirmed by direct inspection of `D:\sportico-platform\src\SporticoApp.Api\Controllers\PublicCoachesController.cs`.

| Purpose | Frontend Call | Backend Confirmed Endpoint | Auth | Notes |
|---|---|---|---|---|
| Get all public coaches | `backend.publicCoaches({ pageSize: 50 })` | `GET /api/public/coaches` | AllowAnonymous | ✅ Confirmed. Class-level `[AllowAnonymous]`. Max pageSize = 50 enforced by service. Previous bug: frontend sent `pageSize: 60` causing validation failure. Fixed to 50. |
| Get public coach detail | `backend.publicCoach(id)` | `GET /api/public/coaches/{coachId:guid}` | AllowAnonymous | ✅ Confirmed. Route uses `{coachId:guid}` constraint — no conflict with `/api/coaches/me` or availability slot routes. |

**Response shape confirmed:**
```ts
Result<PagedResult<PublicCoachListItemResponse>> // list
Result<PublicCoachDetailResponse>                // detail
```

**Query params (PascalCase, matching backend):**
- `Keyword`, `SportId`, `City`, `District`, `IsOnlineAvailable`, `IsOfflineAvailable`, `MinRating`, `PageNumber`, `PageSize` (max 50)

**Private coach endpoints remain protected:**
- `GET /api/coaches/me` → `[Authorize(Roles = "Coach")]`
- `PUT /api/coaches/me` → `[Authorize(Roles = "Coach")]`
- `POST /api/coaches/register` → `[Authorize]` (any authenticated user)

---

## ✅ Confirmed and Integrated

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/auth/login` | POST | Integrated in `auth-api.ts` |
| `/api/auth/register` | POST | Integrated in `auth-api.ts` |
| `/api/auth/verify-email` | GET | Integrated — page at `/verify-email` |
| `/api/auth/refresh-token` | POST | Integrated in `auth-api.ts` |
| `/api/auth/me` | GET | Integrated via `auth-session.ts` |
| `/api/auth/change-password` | POST | Integrated in coach/learner settings |
| `/api/users/me` | GET/PUT | Integrated via `backend.usersMe()` / `backend.updateMe()` |
| `/api/public/coaches` | GET | Integrated — public coach directory |
| `/api/public/coaches/{id}` | GET | Integrated — public coach detail |
| `/api/public/training-packages` | GET | Integrated via `backend.publicTrainingPackages()` |
| `/api/public/training-packages/{id}` | GET | Integrated via `backend.publicTrainingPackage()` |
| `/api/training-packages/me` | GET | Integrated — coach package management |
| `/api/training-packages` | POST | Integrated — coach create package |
| `/api/training-packages/{id}` | PUT | Integrated — coach edit package |
| `/api/training-packages/{id}/archive` | PUT | Integrated — coach archive package |
| `/api/bookings/me` | GET | Integrated — learner booking list |
| `/api/bookings/coach` | GET | Integrated — coach booking list |
| `/api/bookings/{id}` | GET | Integrated |
| `/api/bookings/purchase/manual` | POST | Integrated |
| `/api/bookings/purchase/payos` | POST | Integrated |
| `/api/bookings/{id}/sessions` | GET | Integrated |
| `/api/bookings/{id}/training-plan` | GET | Integrated |
| `/api/bookings/{id}/progress-checkins` | GET/POST | Integrated |
| `/api/bookings/{id}/assessment` | GET/POST/PUT | Integrated |
| `/api/chat/rooms` | GET | Integrated |
| `/api/chat/rooms/{id}/messages` | GET/POST | Integrated |
| `/api/notifications/me` | GET | Integrated |
| `/api/notifications/me/unread-count` | GET | Integrated |
| `/api/notifications/{id}/read` | PUT | Integrated |
| `/api/notifications/me/read-all` | PUT | Integrated |
| `/api/coaches/me/wallet` | GET | Integrated |
| `/api/coaches/me/wallet/transactions` | GET | Integrated |
| `/api/coaches/me/withdrawal-requests` | GET/POST | Integrated |
| `/api/coaches/me/payout-account` | GET/PUT | Integrated |
| `/api/coaches/register` | POST | Integrated — coach onboarding |
| `/api/coaches/me` | GET/PUT | Integrated — coach profile |
| `/api/coaches/me/media` | GET/POST/PUT/DELETE | Integrated — coach media |

---

## ⚠️ Added to Frontend — Backend Confirmation Needed

These endpoints were added to the frontend endpoint map (`src/lib/backend/endpoints.ts`) and client (`src/lib/backend/client.ts`) based on the task specification. They need to be confirmed against the actual backend before going live.

### Auth — Password Reset

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/auth/forgot-password` | POST | **UNCONFIRMED** — UI built, endpoint may not exist yet |
| `/api/auth/reset-password` | POST | **UNCONFIRMED** — UI built, endpoint may not exist yet |
| `/api/auth/resend-verification` | POST | **UNCONFIRMED** — UI not built yet |

**Fallback behavior:** In mock mode, the pages simulate success. In live mode, if the endpoint returns a non-2xx or `isSuccess: false`, the error message is shown.

---

### Availability Slots

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/coaches/me/availability-slots` | GET/POST | **UNCONFIRMED** — added to client |
| `/api/coaches/me/availability-slots/{id}/cancel` | PUT | **UNCONFIRMED** |
| `/api/coaches/{coachId}/availability-slots` | GET | **UNCONFIRMED** |

**Impact:** Coach schedule page currently uses mock data for availability slot creation. When confirmed, wire `backend.createAvailabilitySlot()` and `backend.cancelAvailabilitySlot()` into the schedule page.

---

### Training Sessions (Global Views)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/learners/me/training-sessions` | GET | **UNCONFIRMED** |
| `/api/coaches/me/training-sessions` | GET | **UNCONFIRMED** |
| `/api/training-sessions/{id}/confirm` | PUT | **UNCONFIRMED** |
| `/api/training-sessions/{id}/cancel` | PUT | **UNCONFIRMED** |
| `/api/training-sessions/{id}/complete` | PUT | **UNCONFIRMED** |
| `/api/bookings/{id}/sessions` | POST | **UNCONFIRMED** — learner books a session |

**Current fallback:** Coach learner detail page (`/coach/learners/[bookingId]`) renders sessions from mock data when in mock mode. Session actions (confirm/cancel/complete) are no-ops in mock mode.

---

### Training Plan CRUD

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/bookings/{id}/training-plan` | POST | **UNCONFIRMED** — create new plan |
| `/api/training-plans/{id}` | PUT | **UNCONFIRMED** — update plan header |
| `/api/training-plans/{id}/weeks` | POST | **UNCONFIRMED** |
| `/api/training-plan-weeks/{weekId}/days` | POST | **UNCONFIRMED** |
| `/api/training-plan-days/{dayId}/exercises` | POST | **UNCONFIRMED** |
| `/api/training-plan-exercises/{id}` | PUT/DELETE | **UNCONFIRMED** |

**Current fallback:** Training plan builder in `/coach/learners/[bookingId]` uses mock state updates when `isMockMode()` is true.

---

### Chat Room Creation

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/chat/rooms` | POST | **UNCONFIRMED** — `backend.createChatRoom(coachId)` added |

**Note:** The current `api.findChatRoomWith()` only searches existing rooms. If `POST /api/chat/rooms` exists, `createChatRoom` can be wired into the coach detail page "Chat" button.

---

## ❌ Missing from Backend (Not Implemented)

These features were requested in the task but no corresponding backend endpoint was found in the swagger/controller inspection.

### Coach schedule — Learner display name / avatar in sessions

**Confirmed gap** (verified from `TrainingSessionResponse.cs`):

`GET /api/coaches/me/training-sessions` returns only `learnerId` (GUID). There is no `learnerName`, `learnerFullName`, `learnerAvatarUrl`, or nested learner object.

**Frontend impact:** Coach schedule page (`/coach/schedule`) uses `useLearner(session.learnerId)` which looks up a local mock-data map. In live mode with real UUIDs this always misses, so the UI falls back to:
- Avatar: indigo initials tile derived from the first 2 chars of the UUID
- Name: `"Học viên {id.slice(0, 6).toUpperCase()}"` (shown in PendingConfirmations) or blank (session block + sidebar rows)

**Recommended backend fix:** Extend `TrainingSessionResponse` with `learnerDisplayName?: string` and `learnerAvatarUrl?: string` populated from the `User` table. Until then, the frontend fallback is the best available UX.

---

### Receipt endpoint — availability per withdrawal status

`GET /api/coaches/me/withdrawal-requests/{id}/receipt` confirmed in `WithdrawalRequestsController.cs`.

**Known limitation:** Receipt may only be generated for withdrawals that were processed through PayOS (i.e. `payOsPayoutId` is not null). For withdrawals approved/paid manually by admin, the receipt data may be partial. The frontend gracefully handles `null` receipts by showing "Biên nhận chưa khả dụng cho yêu cầu này."

**Live test:** Could not be performed — no live browser session with an authenticated coach having a `paid` withdrawal was available.

---

### Learner assessments via coach

- Coach read-only view of learner assessment: currently works via `GET /api/bookings/{id}/assessment` — this should be accessible by the coach assigned to the booking.
- **Assumption:** Coach can call this endpoint because they are the `coachId` on the booking. Needs backend auth check confirmation.

### Progress check-ins — coach view

- Coach viewing all check-ins of their learners: currently only accessible per booking via `GET /api/bookings/{id}/progress-checkins`.
- No global `GET /api/coaches/me/learner-checkins` endpoint found.

---

## 📋 Pages Status

| Page | Route | Real API | Notes |
|------|-------|----------|-------|
| Login | `/login` | ✅ | |
| Register | `/register` | ✅ | |
| Verify email | `/verify-email` | ✅ | |
| Forgot password | `/forgot-password` | ⚠️ | Backend endpoint unconfirmed |
| Reset password | `/reset-password` | ⚠️ | Backend endpoint unconfirmed |
| Learner dashboard | `/learner/dashboard` | Partial | Uses mock coach data |
| Learner coaches | `/learner/coaches` | ✅ | Public directory |
| Learner coach detail | `/learner/coaches/[id]` | ✅ | |
| Public coaches | `/coaches` | ✅ | |
| Public coach detail | `/coaches/[id]` | ✅ | |
| Learner schedule | `/learner/schedule` | Partial | Mock sessions |
| Learner messages | `/learner/messages` | ✅ | Real chat API |
| Learner bookings | `/learner/bookings` | ✅ | New page |
| Learner training plan | `/learner/plan` | ✅ | Read-only view |
| Learner progress | `/learner/progress` | Partial | Assessment + check-ins |
| Coach dashboard | `/coach/dashboard` | Partial | Mock session data |
| Coach schedule | `/coach/schedule` | Partial | Mock availability |
| Coach messages | `/coach/messages` | ✅ | Real chat API |
| Coach packages | `/coach/packages` + `/coach/training-packages` | ✅ | Full CRUD |
| Coach learners | `/coach/learners` | Partial | Mock learner data |
| Coach learner detail | `/coach/learners/[bookingId]` | ⚠️ | New; session actions unconfirmed |
| Coach earnings | `/coach/earnings` | ✅ | Real wallet API |
| Admin dashboard | `/admin/dashboard` | Partial | |
| Admin users | `/admin/users` | Partial | |
| Admin verifications | `/admin/verifications` | ✅ | |
