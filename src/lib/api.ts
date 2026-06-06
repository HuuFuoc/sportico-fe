// ============================================================================
// Sportico data access layer — hybrid mock/live backend.
//
// Every page/component reads data through `api.*`. Each method is one of:
//
//   • LIVE-OR-MOCK — the real backend has a matching endpoint. In live mode
//     (NEXT_PUBLIC_API_BASE_URL set) it calls `backend.*` and adapts the DTO to
//     the UI domain type via `src/lib/backend/mappers.ts`; in mock mode it
//     returns the local fixture.
//   • MOCK-ALWAYS — the backend has NO matching endpoint yet (coach directory,
//     learner list, AI insights, analytics, wellness). These always return the
//     local fixture so the corresponding pages keep working.
//
// The UI domain types in `src/types` stay the contract; adapters bridge the gap
// so pages render unchanged.
// ============================================================================

import type {
  Admin,
  AIInsight,
  AnalyticsDailyPoint,
  AnyUser,
  AvailabilitySlot,
  Booking,
  Coach,
  CoachPost,
  EarningPoint,
  Learner,
  LearnerAssessment,
  ProgressCheckIn,
  Review,
  ReviewReport,
  ReviewSummary,
  TrainingPlan,
  Message,
  MessageThread,
  NotificationItem,
  Payout,
  PayoutAccount,
  ProgressMetric,
  ProgressTrendPoint,
  Role,
  Session,
  Sport,
  TrainingPackage,
  VerificationRequest,
} from "@/types";
import { isMockMode, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { backend } from "@/lib/backend/client";
import type { AssessmentBody } from "@/lib/backend/client";
import { getCurrentRole, getCurrentUserId } from "@/lib/auth-session";
import * as map from "@/lib/backend/mappers";
import { NOW } from "@/lib/mock/clock";
import { getPublicUserCached, setPublicUserCached, seedPublicUserCache } from "@/lib/public-user-cache";
import type {
  BookingResponse,
  CreateDayRequest,
  CreateExerciseRequest,
  CreateReviewRequest,
  CreateReviewReportRequest,
  CreateTrainingPlanRequest,
  CreateWeekRequest,
  ReconcilePayOsResponse,
  ResolveReviewReportRequest,
  ReviewFilterRequest,
  UpdateExerciseRequest,
  UpdateReviewRequest,
  UpdateTrainingPlanRequest,
  WithdrawalReceiptResponse,
} from "@/lib/backend/dto";
export type { ReconcilePayOsResponse };
export type { WithdrawalReceiptResponse };
import { AVAILABLE_SPORTS } from "@/lib/constants";

// --- mock fixtures: imported in THIS FILE ONLY ------------------------------
import {
  getCoaches,
  getCoachById,
  getLearners,
  getLearnerById,
  getAdmins,
  getAdminById,
  getUserById,
} from "@/lib/mock/users";
import {
  getSessions,
  getSessionById,
  getSessionsForCoach,
  getSessionsForLearner,
  getUpcomingSessions,
} from "@/lib/mock/sessions";
import {
  getThreadsForUser,
  getMessagesForThread,
  getThreadById,
} from "@/lib/mock/messages";
import { getEarnings, getPayouts, getEarningsTotal } from "@/lib/mock/earnings";
import {
  getDailyActiveUsers,
  getProgressMetricsForLearner,
  getProgressTrend,
} from "@/lib/mock/analytics";
import {
  getInsightsForRole,
  getNotifications,
  getVerifications,
} from "@/lib/mock/insights";
import {
  getLearnerWellness,
  activityHeatmap,
  type LearnerWellness,
} from "@/lib/mock/wellness";

export interface EarningsTotal {
  /** Tổng thu nhập đã ghi nhận vào ví — maps to CoachWalletResponse.totalEarned */
  totalEarned: number;
  /** Số dư có thể rút ngay — maps to CoachWalletResponse.availableBalance */
  availableBalance: number;
  /** Đang chờ quyết toán — maps to CoachWalletResponse.pendingBalance */
  pendingBalance: number;
  /** Đã rút về ngân hàng (lịch sử tích lũy) — maps to CoachWalletResponse.totalWithdrawn */
  totalWithdrawn: number;
  sessions: number;
}

/** Moderation entity kind, taken from a verification's document type. */
export type VerificationKind = "post" | "training-package" | "payout-account";

/** Run the live implementation when the backend is configured, else the mock.
 *  For PUBLIC endpoints. Falls back to the mock during SSR / static generation:
 *  the browser reaches the backend through the same-origin `/api-proxy` rewrite,
 *  but that relative URL cannot be fetched server-side (no origin), so Server
 *  Components render deterministic demo data. Client Components fetch live. */
function live<T>(
  liveFn: () => Promise<T>,
  mockFn: () => T | Promise<T>,
): Promise<T> {
  return isMockMode() || typeof window === "undefined"
    ? Promise.resolve(mockFn())
    : liveFn();
}

/** Like {@link live} but for AUTHENTICATED endpoints.
 *
 *  Mock mode  → always use the local fixture (no real backend).
 *  Server-side (typeof window === "undefined") → SSR cannot read localStorage,
 *    so fall back to mock to avoid crashing async Server Components with a 401.
 *    Dashboard pages that matter are all "use client" with useApiResource hooks
 *    that only fire after mount — they never hit this SSR path.
 *  Client live mode → always call liveFn(). CoachGuard / LearnerGuard ensure
 *    the user is authenticated before any data hook fires, so missing-token is
 *    an edge case handled by apiFetch's built-in 401 → /login redirect. */
function liveAuthed<T>(
  liveFn: () => Promise<T>,
  mockFn: () => T | Promise<T>,
): Promise<T> {
  if (isMockMode()) return Promise.resolve(mockFn());
  if (typeof window === "undefined") return Promise.resolve(mockFn());
  return liveFn();
}

/**
 * Aggregate per-booking sessions into a flat, UI-shaped Session[].
 * Uses Promise.all so all booking-session fetches run in parallel instead of
 * sequentially — reduces wall-clock time from O(N) serial to ~O(1) parallel.
 */
async function liveSessionsForBookings(
  bookings: BookingResponse[],
): Promise<Session[]> {
  if (bookings.length === 0) return [];
  const results = await Promise.all(
    bookings.map(async (b) => {
      const page = await backend.bookingSessions(b.id, { pageSize: 100 });
      return (page.items ?? []).map((s) => map.sessionToSession(s, b));
    }),
  );
  return results.flat();
}

async function liveLearnerSessions(): Promise<Session[]> {
  const page = await backend.myBookings({ pageSize: 50 });
  // Only fetch sessions for active bookings — completed/cancelled bookings
  // have no upcoming sessions and would add unnecessary network requests.
  const active = (page.items ?? []).filter((b) => b.status === "active");
  return liveSessionsForBookings(active);
}

async function liveCoachSessions(): Promise<Session[]> {
  const page = await backend.coachBookings({ pageSize: 50 });
  const active = (page.items ?? []).filter((b) => b.status === "active");
  return liveSessionsForBookings(active);
}

// ---- Helpers ---------------------------------------------------------------

function slotToUi(s: import("@/lib/backend/dto").AvailabilitySlotResponse): AvailabilitySlot {
  return {
    id: s.id,
    coachId: s.coachId,
    startTime: s.startTime,
    endTime: s.endTime,
    status: (s.status ?? "available").toLowerCase(),
    location: s.location ?? undefined,
    isOnline: s.isOnline,
    meetingUrl: s.meetingUrl ?? undefined,
    note: s.note ?? undefined,
    createdAt: s.createdAt,
    maxParticipants: s.maxParticipants ?? undefined,
    bookedParticipants: s.bookedParticipants ?? undefined,
    remainingParticipants: s.remainingParticipants ?? undefined,
    isFull: s.isFull ?? undefined,
  };
}

export const api = {
  // ---- Users -------------------------------------------------------------
  fetchCoaches: (): Promise<Coach[]> =>
    live(async () => {
      // pageSize capped at 50 — backend service enforces this maximum.
      const page = await backend.publicCoaches({ pageSize: 50 });
      return (page.items ?? []).map(map.publicCoachListItemToCoach);
    }, () => getCoaches()),
  fetchCoach: (id: string): Promise<Coach | undefined> =>
    live(async () => {
      try {
        return map.publicCoachDetailToCoach(await backend.publicCoach(id));
      } catch (err) {
        // True 404 → coach does not exist → caller shows notFound().
        // Anything else (500, network, mapping error) → rethrow so the
        // caller's error state fires instead of a misleading frontend 404.
        if (err instanceof ApiError && err.status === 404) return undefined;
        throw err;
      }
    }, () => getCoachById(id)),

  // ---- Coach's own listings ---------------------------------------------
  fetchMyPackages: (): Promise<TrainingPackage[]> =>
    liveAuthed(async () => {
      const page = await backend.myTrainingPackages({ pageSize: 100 });
      return (page.items ?? []).map(map.packageToUi);
    }, () => []),
  fetchMyPosts: (): Promise<CoachPost[]> =>
    liveAuthed(async () => {
      const page = await backend.myPosts({ pageSize: 100 });
      return (page.items ?? []).map(map.postToUi);
    }, () => []),

  // No backend endpoints → always mock.
  fetchLearners: (): Promise<Learner[]> => Promise.resolve(getLearners()),
  fetchLearner: (id: string): Promise<Learner | undefined> =>
    Promise.resolve(getLearnerById(id)),
  fetchAdmins: (): Promise<Admin[]> => Promise.resolve(getAdmins()),
  fetchAdmin: (id: string): Promise<Admin | undefined> =>
    Promise.resolve(getAdminById(id)),
  fetchUser: (id: string): Promise<AnyUser | undefined> =>
    Promise.resolve(getUserById(id)),

  // ---- User profile lookup (any user by id) -----------------------------
  /** Resolve a user's display name + avatar by their id.
   *  GET /api/users/{id} is AllowAnonymous — works even when not signed in.
   *  Returns null on 404/network error (safe fallback for UI enrichment). */
  fetchUserProfile: (
    userId: string,
  ): Promise<{ name: string; avatarUrl?: string } | null> => {
    if (!userId) return Promise.resolve(null);
    const cached = getPublicUserCached(userId);
    if (cached) return Promise.resolve(cached);
    return live(
      async () => {
        try {
          const u = await backend.userById(userId);
          const result = {
            name: u.fullName?.trim() || "Người dùng",
            avatarUrl: u.avatarUrl ?? undefined,
          };
          setPublicUserCached(userId, result);
          return result;
        } catch {
          return null;
        }
      },
      () => null,
    );
  },

  // ---- Current user (settings page) -------------------------------------
  /** Load the signed-in learner via `/api/users/me`. Falls back to the dev
   *  mock when there is no session (so the page still renders). */
  fetchCurrentLearner: (): Promise<Learner> =>
    liveAuthed<Learner>(
      async () => {
        const u = await backend.usersMe();
        const fallback = getLearnerById(getCurrentUserId() ?? "learner-1");
        return map.currentUserToLearner(u, fallback);
      },
      () => getLearnerById(getCurrentUserId() ?? "learner-1") ?? getLearners()[0],
    ),
  updateMyProfile: (body: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    dateOfBirth?: string;
  }): Promise<Learner> =>
    liveAuthed<Learner>(
      async () => {
        const u = await backend.updateMe(body);
        // Immediately update the auth store so sidebar/navbar show new name/avatar.
        useAuthStore.getState().setUser(u);
        const fallback = getLearnerById(getCurrentUserId() ?? "learner-1");
        return map.currentUserToLearner(u, fallback);
      },
      () => {
        const base =
          getLearnerById(getCurrentUserId() ?? "learner-1") ??
          getLearners()[0];
        return {
          ...base,
          name: body.fullName ?? base.name,
          avatarUrl: body.avatarUrl ?? base.avatarUrl,
        };
      },
    ),
  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> =>
    liveAuthed<void>(
      () => backend.changePassword(body),
      () => undefined,
    ),

  // ---- Bookings / purchase ----------------------------------------------
  // Buy a training package. Live mode starts a real PayOS checkout and returns
  // the full response (including orderCode) so the caller can save it to
  // sessionStorage before redirecting. Mock mode returns { booked: true }.
  purchasePackage: (
    trainingPackageId: string,
  ): Promise<
    | { checkoutUrl: string; bookingId: string; paymentId: string; orderCode: number; status?: string | null; expiredAt?: string | null }
    | { booked: true }
  > =>
    liveAuthed<
      | { checkoutUrl: string; bookingId: string; paymentId: string; orderCode: number; status?: string | null; expiredAt?: string | null }
      | { booked: true }
    >(
      async () => {
        const r = await backend.purchasePayos(trainingPackageId);
        if (!r.checkoutUrl) {
          throw new Error("Không nhận được liên kết thanh toán từ PayOS.");
        }
        return {
          checkoutUrl: r.checkoutUrl,
          bookingId: r.bookingId,
          paymentId: r.paymentId,
          orderCode: r.orderCode,
          status: r.status,
          expiredAt: r.expiredAt,
        };
      },
      () => ({ booked: true as const }),
    ),

  /** Reconcile a PayOS payment by orderCode. Call this on /payment/success.
   *  Accepts an optional AbortSignal so the caller can enforce a per-attempt
   *  timeout (the Azure backend can be slow to respond on a cold start). */
  reconcilePayment: (
    orderCode: string | number,
    signal?: AbortSignal,
  ): Promise<ReconcilePayOsResponse> =>
    liveAuthed(
      () => backend.reconcilePayos(orderCode, { signal }),
      () => ({ activated: true, bookingStatus: "active" }),
    ),

  // ---- Sessions ----------------------------------------------------------
  fetchSessions: (): Promise<Session[]> =>
    liveAuthed(
      () => (getCurrentRole() === "coach" ? liveCoachSessions() : liveLearnerSessions()),
      () => getSessions(),
    ),
  // No session-by-id endpoint → mock.
  fetchSession: (id: string): Promise<Session | undefined> =>
    Promise.resolve(getSessionById(id)),
  fetchSessionsForCoach: (id: string): Promise<Session[]> =>
    liveAuthed(liveCoachSessions, () => getSessionsForCoach(id)),
  fetchSessionsForLearner: (id: string): Promise<Session[]> =>
    liveAuthed(liveLearnerSessions, () => getSessionsForLearner(id)),

  /** Direct call to /api/learners/me/training-sessions — richer than the bookings aggregate. */
  fetchMyTrainingSessions: (p?: {
    status?: string;
    startFrom?: string;
    startTo?: string;
    pageSize?: number;
  }): Promise<Session[]> =>
    liveAuthed(async () => {
      const page = await backend.myTrainingSessions({
        status: p?.status,
        startFrom: p?.startFrom,
        startTo: p?.startTo,
        pageSize: p?.pageSize ?? 100, // backend caps PageSize at 100 (400 otherwise)
      });
      return (page.items ?? []).map((s) => map.sessionToSession(s));
    }, () => getSessions()),

  /** Direct call to /api/coaches/me/training-sessions — richer than the bookings aggregate. */
  fetchMyCoachTrainingSessions: (p?: {
    status?: string;
    startFrom?: string;
    startTo?: string;
    pageSize?: number;
  }): Promise<Session[]> =>
    liveAuthed(async () => {
      const page = await backend.coachTrainingSessions({
        status: p?.status,
        startFrom: p?.startFrom,
        startTo: p?.startTo,
        pageSize: p?.pageSize ?? 100, // backend caps PageSize at 100 (400 otherwise)
      });
      return (page.items ?? []).map((s) => map.sessionToSession(s));
    }, () => getSessionsForCoach(getCurrentUserId() ?? "")),

  /** Fetch all sessions for a specific booking. */
  fetchBookingSessions: (bookingId: string, p?: {
    status?: string;
    pageSize?: number;
  }): Promise<Session[]> =>
    liveAuthed(async () => {
      const page = await backend.bookingSessions(bookingId, {
        status: p?.status,
        pageSize: p?.pageSize ?? 100,
      });
      return (page.items ?? []).map((s) => map.sessionToSession(s));
    }, () => []),
  fetchUpcoming: (filter?: {
    coachId?: string;
    learnerId?: string;
  }): Promise<Session[]> =>
    liveAuthed(async () => {
      const all = filter?.coachId
        ? await liveCoachSessions()
        : filter?.learnerId
          ? await liveLearnerSessions()
          : getCurrentRole() === "coach"
            ? await liveCoachSessions()
            : await liveLearnerSessions();
      const now = new Date(NOW).getTime();
      return all
        .filter(
          (s) =>
            s.status !== "cancelled" && new Date(s.start).getTime() >= now,
        )
        .sort((a, b) => +new Date(a.start) - +new Date(b.start));
    }, () => getUpcomingSessions(filter)),

  // ---- Bookings detail / plan / progress / assessment -------------------
  fetchMyBookings: (): Promise<Booking[]> =>
    liveAuthed(async () => {
      const page = await backend.myBookings({ pageSize: 50 });
      return (page.items ?? []).map(map.bookingToUi);
    }, () => []),
  fetchCoachBookings: (): Promise<Booking[]> =>
    liveAuthed(async () => {
      const page = await backend.coachBookings({ pageSize: 100 });
      return (page.items ?? []).map(map.bookingToUi);
    }, () => []),
  fetchBooking: (id: string): Promise<Booking | null> =>
    liveAuthed<Booking | null>(
      () => {
        // GET /api/bookings/{id} requires Learner role.
        // GET /api/bookings/coach/{id} requires Coach role.
        // Use the correct endpoint based on the authenticated role.
        const role = getCurrentRole();
        const fetch = role === "coach"
          ? backend.bookingByIdCoach(id)
          : backend.booking(id);
        return fetch.then(map.bookingToUi).catch(() => null);
      },
      () => null,
    ),
  fetchTrainingPlan: (bookingId: string): Promise<TrainingPlan | null> =>
    liveAuthed<TrainingPlan | null>(
      () =>
        backend
          .bookingTrainingPlan(bookingId)
          .then(map.trainingPlanToUi)
          .catch(() => null),
      () => null,
    ),
  fetchProgressCheckIns: (
    bookingId: string,
    params?: { pageNumber?: number; pageSize?: number },
  ): Promise<{ items: ProgressCheckIn[]; hasNext: boolean; totalCount: number }> =>
    liveAuthed(async () => {
      const page = await backend.bookingProgressCheckIns(bookingId, {
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 20,
      });
      return {
        items: (page.items ?? []).map(map.progressCheckInToUi),
        hasNext: page.hasNext,
        totalCount: page.totalCount,
      };
    }, () => ({ items: [], hasNext: false, totalCount: 0 })),
  createProgressCheckIn: (
    bookingId: string,
    body: {
      checkInDate: string;
      weightKg?: number;
      bodyFatPercent?: number;
      waistCm?: number;
      energyLevel?: string;
      sleepQuality?: string;
      learnerNote?: string;
    },
  ): Promise<ProgressCheckIn> =>
    liveAuthed(
      async () =>
        map.progressCheckInToUi(
          await backend.createProgressCheckIn(bookingId, body),
        ),
      () => ({ id: `ci-${Date.now()}`, ...body }),
    ),
  updateCheckInFeedback: (
    id: string,
    coachFeedback: string,
  ): Promise<ProgressCheckIn> =>
    liveAuthed(
      async () =>
        map.progressCheckInToUi(
          await backend.updateCheckInFeedback(id, { coachFeedback }),
        ),
      () => ({ id, coachFeedback } as ProgressCheckIn),
    ),
  fetchAssessment: (bookingId: string): Promise<LearnerAssessment | null> =>
    liveAuthed<LearnerAssessment | null>(
      () =>
        backend
          .bookingAssessment(bookingId)
          .then(map.assessmentToUi)
          .catch(() => null),
      () => null,
    ),
  saveAssessment: (
    bookingId: string,
    body: AssessmentBody,
    exists: boolean,
  ): Promise<LearnerAssessment> =>
    liveAuthed(
      async () =>
        map.assessmentToUi(
          exists
            ? await backend.updateBookingAssessment(bookingId, body)
            : await backend.createBookingAssessment(bookingId, body),
        ),
      () => ({ ...body }),
    ),

  // ---- Training plan write (coach) --------------------------------------
  createTrainingPlan: (bookingId: string, body: CreateTrainingPlanRequest): Promise<import("@/types").TrainingPlan> =>
    liveAuthed(
      async () => map.trainingPlanToUi(await backend.createTrainingPlan(bookingId, body)),
      () => ({ id: `mock-plan-${Date.now()}`, totalWeeks: body.totalWeeks, startDate: body.startDate, endDate: body.endDate, isReadOnly: false, weeks: [] } as import("@/types").TrainingPlan),
    ),
  updateTrainingPlan: (id: string, body: UpdateTrainingPlanRequest): Promise<import("@/types").TrainingPlan> =>
    liveAuthed(
      async () => map.trainingPlanToUi(await backend.updateTrainingPlan(id, body)),
      () => ({ id, totalWeeks: body.totalWeeks, startDate: body.startDate, endDate: body.endDate, isReadOnly: false, weeks: [] } as import("@/types").TrainingPlan),
    ),
  addPlanWeek: (planId: string, body: CreateWeekRequest): Promise<import("@/lib/backend/dto").TrainingPlanWeekResponse> =>
    liveAuthed(
      () => backend.addPlanWeek(planId, body),
      () => ({ id: `mock-week-${Date.now()}`, trainingPlanId: planId, weekNumber: body.weekNumber, focus: body.focus ?? null, notes: body.notes ?? null, days: [] }),
    ),
  addPlanDay: (weekId: string, body: CreateDayRequest): Promise<import("@/lib/backend/dto").TrainingPlanDayResponse> =>
    liveAuthed(
      () => backend.addPlanDay(weekId, body),
      () => ({ id: `mock-day-${Date.now()}`, trainingPlanWeekId: weekId, dayNumber: body.dayNumber, title: body.title ?? null, notes: body.notes ?? null, exercises: [] }),
    ),
  addExercise: (dayId: string, body: CreateExerciseRequest): Promise<import("@/lib/backend/dto").TrainingPlanExerciseResponse> =>
    liveAuthed(
      () => backend.addExercise(dayId, body),
      () => ({ id: `mock-ex-${Date.now()}`, trainingPlanDayId: dayId, exerciseName: body.exerciseName, orderIndex: body.orderIndex, sets: body.sets ?? null, reps: body.reps ?? null, intensity: body.intensity ?? null, restSeconds: body.restSeconds ?? null, notes: body.notes ?? null }),
    ),
  updateExercise: (id: string, body: UpdateExerciseRequest): Promise<import("@/lib/backend/dto").TrainingPlanExerciseResponse> =>
    liveAuthed(
      () => backend.updateExercise(id, body),
      () => ({ id, trainingPlanDayId: "", exerciseName: body.exerciseName, orderIndex: body.orderIndex, sets: body.sets ?? null, reps: body.reps ?? null, intensity: body.intensity ?? null, restSeconds: body.restSeconds ?? null, notes: body.notes ?? null }),
    ),
  deleteExercise: (id: string): Promise<void> =>
    liveAuthed<void>(
      () => backend.deleteExercise(id),
      () => undefined,
    ),

  // ---- Messages ----------------------------------------------------------
  fetchThreads: (userId: string): Promise<MessageThread[]> =>
    liveAuthed(async () => {
      const rooms = await backend.chatRooms();
      const me = getCurrentUserId();

      // Step 1: seed participant map from the public coaches list (batch-efficient).
      const participantMap = new Map<string, { name: string; avatarUrl?: string }>();
      try {
        const page = await backend.publicCoaches({ pageSize: 50 });
        const seeds: Array<{ id: string; name: string; avatarUrl?: string }> = [];
        for (const c of page.items ?? []) {
          const entry = {
            name: c.fullName?.trim() || `Coach ${c.coachId.slice(0, 4).toUpperCase()}`,
            avatarUrl: c.avatarUrl ?? undefined,
          };
          participantMap.set(c.coachId, entry);
          seeds.push({ id: c.coachId, ...entry });
        }
        seedPublicUserCache(seeds);
      } catch {
        // Best-effort; missing it just shows initials.
      }

      // Step 2: collect participant IDs not yet resolved (non-coaches, learners, etc.).
      const unknownIds = [
        ...new Set(
          rooms
            .map((r) => (r.user1Id === me ? r.user2Id : r.user1Id))
            .filter((id) => !!id && id !== me && !participantMap.has(id)),
        ),
      ];

      // Step 3: try cache first, then GET /api/users/{id} for each still-unknown id.
      // Promise.allSettled — one missing user must not break the entire list.
      if (unknownIds.length > 0) {
        const results = await Promise.allSettled(
          unknownIds.map(async (id) => {
            const cached = getPublicUserCached(id);
            if (cached) return { id, ...cached };
            try {
              const u = await backend.userById(id);
              const entry = {
                name: u.fullName?.trim() || "Người dùng",
                avatarUrl: u.avatarUrl ?? undefined,
              };
              setPublicUserCached(id, entry);
              return { id, ...entry };
            } catch {
              return null;
            }
          }),
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            participantMap.set(r.value.id, {
              name: r.value.name,
              avatarUrl: r.value.avatarUrl,
            });
          }
        }
      }

      return rooms.map((r) => {
        const otherId = r.user1Id === me ? r.user2Id : r.user1Id;
        const participant = otherId ? participantMap.get(otherId) : undefined;
        return map.roomToThread(r, me, undefined, participant);
      });
    }, () => getThreadsForUser(userId)),
  fetchThread: (id: string): Promise<MessageThread | undefined> =>
    liveAuthed(async () => {
      const rooms = await backend.chatRooms();
      const room = rooms.find((r) => r.id === id);
      return room ? map.roomToThread(room, getCurrentUserId()) : undefined;
    }, () => getThreadById(id)),
  fetchMessages: (threadId: string): Promise<Message[]> =>
    liveAuthed(async () => {
      const page = await backend.roomMessages(threadId, { pageSize: 100 });
      return (page.items ?? [])
        .map(map.chatMessageToMessage)
        .sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt));
    }, () => getMessagesForThread(threadId)),
  sendMessage: (threadId: string, content: string): Promise<Message> =>
    liveAuthed(
      async () => map.chatMessageToMessage(await backend.sendMessage(threadId, content)),
      () => ({
        id: `local-${Date.now()}`,
        threadId,
        senderId: getCurrentUserId() ?? "",
        text: content,
        sentAt: new Date().toISOString(),
      }),
    ),
  /** Look up an existing 1-1 chat room with `otherUserId`. Returns the room id
   *  if one exists, otherwise null.
   *  @deprecated Use `createOrGetChatRoom` instead — POST /api/chat/rooms is
   *  idempotent (returns existing room if already created). */
  findChatRoomWith: (otherUserId: string): Promise<string | null> =>
    liveAuthed<string | null>(
      async () => {
        const rooms = await backend.chatRooms();
        const me = getCurrentUserId();
        const room = rooms.find(
          (r) =>
            (r.user1Id === me && r.user2Id === otherUserId) ||
            (r.user2Id === me && r.user1Id === otherUserId),
        );
        return room?.id ?? null;
      },
      () => {
        const me = getCurrentUserId() ?? "learner-1";
        const threads = getThreadsForUser(me);
        const t = threads.find((th) => th.participantIds.includes(otherUserId));
        return t?.id ?? null;
      },
    ),

  /** Create (or get existing) 1-1 chat room with a coach.
   *
   *  POST /api/chat/rooms is idempotent — calling it repeatedly for the same
   *  user-coach pair returns the same room. Auth is required; the function
   *  throws ApiError(401) when called without a valid token in live mode.
   *
   *  Returns the chat room id so the caller can navigate directly to it.
   */
  createOrGetChatRoom: (coachId: string): Promise<string> =>
    liveAuthed<string>(
      async () => {
        const room = await backend.createChatRoom(coachId);
        return room.id;
      },
      () => {
        // Mock: find or fabricate a thread for this coach id.
        const me = getCurrentUserId() ?? "learner-1";
        const threads = getThreadsForUser(me);
        const t = threads.find((th) => th.participantIds.includes(coachId));
        return t?.id ?? `mock-room-${coachId.slice(0, 8)}`;
      },
    ),

  // ---- Dashboard (coach + admin) ----------------------------------------
  /**
   * Coach aggregate dashboard. Returns null in mock mode or on error so pages
   * can fall back to mock/skeleton data gracefully.
   */
  fetchCoachDashboard: (filter?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<import("@/lib/backend/dto").CoachDashboardResponse | null> =>
    liveAuthed(
      () => backend.coachDashboard(filter).catch(() => null),
      () => null,
    ),

  /**
   * Admin aggregate dashboard. Returns null in mock mode or on error so the
   * page can fall back to its existing mock constants gracefully.
   */
  fetchAdminDashboard: (filter?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<import("@/lib/backend/dto").AdminDashboardResponse | null> =>
    liveAuthed(
      () => backend.adminDashboard(filter).catch(() => null),
      () => null,
    ),

  // ---- Earnings / payouts ------------------------------------------------
  fetchEarnings: (): Promise<EarningPoint[]> =>
    liveAuthed(async () => {
      const page = await backend.walletTransactions({ pageSize: 100 });
      return map.transactionsToEarnings(page.items ?? []);
    }, () => getEarnings()),
  fetchPayouts: (): Promise<Payout[]> =>
    liveAuthed(async () => {
      const page = await backend.myWithdrawals({ pageSize: 100 });
      return (page.items ?? []).map(map.withdrawalToPayout);
    }, () => getPayouts()),
  fetchPendingWithdrawals: (): Promise<Payout[]> =>
    liveAuthed(async () => {
      const page = await backend.pendingWithdrawals({ pageSize: 100 });
      return (page.items ?? []).map(map.withdrawalToPayout);
    }, () => getPayouts().filter((p) => p.status !== "paid")),
  /** All admin withdrawal requests, optionally filtered by status. */
  fetchAllWithdrawals: (status?: string): Promise<Payout[]> =>
    liveAuthed(async () => {
      const page = await backend.allWithdrawals({ pageSize: 100, status });
      return (page.items ?? []).map(map.withdrawalToPayout);
    }, () => getPayouts()),
  approveWithdrawal: (id: string): Promise<Payout> =>
    liveAuthed<Payout>(
      async () => map.withdrawalToPayout(await backend.approveWithdrawal(id)),
      () => ({
        id,
        coachId: "",
        amount: 0,
        currency: "VND",
        status: "approved",
        date: new Date().toISOString(),
        method: "Chuyển khoản ngân hàng",
      }),
    ),
  rejectWithdrawal: (id: string, note: string): Promise<void> =>
    liveAuthed<void>(async () => {
      await backend.rejectWithdrawal(id, note);
    }, () => undefined),
  fetchEarningsTotal: (): Promise<EarningsTotal> =>
    liveAuthed(async () => {
      const wallet = await backend.wallet();
      return map.walletToTotal(wallet);
    }, () => getEarningsTotal()),
  createWithdrawal: (amount: number): Promise<Payout> =>
    liveAuthed(
      async () => map.withdrawalToPayout(await backend.createWithdrawal(amount)),
      () => ({
        id: `wd-${Date.now()}`,
        coachId: getCurrentUserId() ?? "",
        amount,
        currency: "VND",
        status: "pending",
        date: new Date().toISOString(),
        method: "Chuyển khoản ngân hàng",
      }),
    ),
  /** Coach: fetch receipt for a completed/approved withdrawal. Returns null on 404. */
  fetchWithdrawalReceipt: (withdrawalId: string): Promise<WithdrawalReceiptResponse | null> =>
    liveAuthed<WithdrawalReceiptResponse | null>(
      () => backend.withdrawalReceipt(withdrawalId).catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
        throw err;
      }),
      () => null,
    ),
  /** Admin: fetch receipt for any withdrawal. Returns null on 404. */
  fetchAdminWithdrawalReceipt: (withdrawalId: string): Promise<WithdrawalReceiptResponse | null> =>
    liveAuthed<WithdrawalReceiptResponse | null>(
      () => backend.adminWithdrawalReceipt(withdrawalId).catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
        throw err;
      }),
      () => null,
    ),
  markPaidWithdrawal: (id: string): Promise<void> =>
    liveAuthed<void>(async () => { await backend.markPaidWithdrawal(id); }, () => undefined),
  refreshPayoutStatus: (id: string): Promise<Payout> =>
    liveAuthed<Payout>(
      async () => map.withdrawalToPayout(await backend.refreshPayoutStatus(id)),
      () => ({ id, coachId: "", amount: 0, currency: "VND", status: "processing", date: new Date().toISOString(), method: "Chuyển khoản ngân hàng" }),
    ),
  retryPayout: (id: string): Promise<Payout> =>
    liveAuthed<Payout>(
      async () => map.withdrawalToPayout(await backend.retryPayout(id)),
      () => ({ id, coachId: "", amount: 0, currency: "VND", status: "failed", date: new Date().toISOString(), method: "Chuyển khoản ngân hàng" }),
    ),

  fetchPayoutAccount: (): Promise<PayoutAccount | null> =>
    liveAuthed<PayoutAccount | null>(
      () => backend.payoutAccount().then(map.payoutAccountToUi).catch(() => null),
      () => null,
    ),
  upsertPayoutAccount: (body: {
    payoutMethod?: string;
    bankName?: string;
    bankBin?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
  }): Promise<PayoutAccount> =>
    liveAuthed(
      async () => map.payoutAccountToUi(await backend.upsertPayoutAccount(body)),
      () => ({ id: "mock-payout", ...body, status: "Pending" }),
    ),

  // ---- Analytics / progress (no backend) → mock --------------------------
  fetchDailyActiveUsers: (): Promise<AnalyticsDailyPoint[]> =>
    Promise.resolve(getDailyActiveUsers()),
  fetchProgressMetrics: (learnerId: string): Promise<ProgressMetric[]> =>
    Promise.resolve(getProgressMetricsForLearner(learnerId)),
  fetchProgressTrend: (): Promise<ProgressTrendPoint[]> =>
    Promise.resolve(getProgressTrend()),

  // ---- Wellness (no backend) → mock --------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchWellness: (learnerId: string): Promise<LearnerWellness> =>
    Promise.resolve(getLearnerWellness()),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchActivityHeatmap: (learnerId: string): Promise<number[][]> =>
    Promise.resolve(activityHeatmap),

  // ---- AI insights / notifications / verifications ----------------------
  fetchInsights: (audience: Role): Promise<AIInsight[]> =>
    Promise.resolve(getInsightsForRole(audience)),
  fetchNotifications: (): Promise<NotificationItem[]> =>
    liveAuthed(async () => {
      const page = await backend.notifications({ pageSize: 50 });
      return (page.items ?? []).map(map.notificationToItem);
    }, () => getNotifications()),
  markNotificationRead: (id: string): Promise<void> =>
    liveAuthed<void>(() => backend.markNotificationRead(id), () => undefined),
  markAllNotificationsRead: (): Promise<void> =>
    liveAuthed<void>(() => backend.markAllNotificationsRead(), () => undefined),
  approveVerification: (id: string, kind: VerificationKind): Promise<void> =>
    liveAuthed<void>(async () => {
      if (kind === "post") await backend.approvePost(id);
      else if (kind === "training-package")
        await backend.approveTrainingPackage(id);
      else await backend.verifyPayoutAccount(id);
    }, () => undefined),
  rejectVerification: (
    id: string,
    kind: VerificationKind,
    reason: string,
  ): Promise<void> =>
    liveAuthed<void>(async () => {
      if (kind === "post") await backend.rejectPost(id, reason);
      else if (kind === "training-package")
        await backend.rejectTrainingPackage(id, reason);
      else await backend.rejectPayoutAccount(id, reason);
    }, () => undefined),
  fetchVerifications: (): Promise<VerificationRequest[]> =>
    liveAuthed(async () => {
      const [posts, packages, payouts] = await Promise.all([
        backend.pendingPosts({ pageSize: 50 }),
        backend.pendingTrainingPackages({ pageSize: 50 }),
        backend.pendingPayoutAccounts({ pageSize: 50 }),
      ]);
      return [
        ...(packages.items ?? []).map(map.trainingPackageToVerification),
        ...(posts.items ?? []).map(map.postToVerification),
        ...(payouts.items ?? []).map(map.payoutAccountToVerification),
      ];
    }, () => getVerifications()),

  // ---- Availability slots (coach CRUD + learner view) --------------------
  /** Coach: fetch own availability slots. */
  fetchMySlots: (p?: {
    startFrom?: string;
    startTo?: string;
    status?: string;
  }): Promise<AvailabilitySlot[]> =>
    liveAuthed(async () => {
      const page = await backend.myAvailabilitySlots({
        pageSize: 100,
        startFrom: p?.startFrom,
        startTo: p?.startTo,
        status: p?.status,
      });
      return (page.items ?? []).map(slotToUi);
    }, () => []),

  /** Coach: create a new availability slot. */
  createSlot: (body: {
    startTime: string;
    endTime: string;
    location?: string;
    isOnline?: boolean;
    meetingUrl?: string;
    note?: string;
    /** Max learners. Omit or 1 = individual; >1 = group slot. */
    maxParticipants?: number;
  }): Promise<AvailabilitySlot> =>
    liveAuthed(
      async () => slotToUi(await backend.createAvailabilitySlot(body)),
      () => ({
        id: `mock-slot-${Date.now()}`,
        coachId: getCurrentUserId() ?? "coach-1",
        ...body,
        isOnline: body.isOnline ?? false,
        status: "available",
        createdAt: new Date().toISOString(),
        maxParticipants: body.maxParticipants ?? 1,
        bookedParticipants: 0,
        remainingParticipants: body.maxParticipants ?? 1,
        isFull: false,
      }),
    ),

  /** Coach: cancel an availability slot. */
  cancelSlot: (id: string): Promise<AvailabilitySlot> =>
    liveAuthed(
      async () => slotToUi(await backend.cancelAvailabilitySlot(id)),
      () => ({ id, coachId: "", startTime: "", endTime: "", status: "cancelled", isOnline: false, createdAt: "" }),
    ),

  /** Learner: view a coach's available slots. */
  fetchCoachSlots: (
    coachId: string,
    p?: { startFrom?: string; startTo?: string },
  ): Promise<AvailabilitySlot[]> =>
    liveAuthed(async () => {
      const page = await backend.coachAvailabilitySlots(coachId, p);
      return (page.items ?? []).map(slotToUi);
    }, () => []),

  /** Learner: book a session against an availability slot within a booking. */
  bookSession: (
    bookingId: string,
    availabilitySlotId: string,
    learnerNote?: string,
  ): Promise<Session> =>
    liveAuthed(
      async () => {
        const s = await backend.createSession(bookingId, { availabilitySlotId, learnerNote });
        return map.sessionToSession(s);
      },
      () => ({
        id: `mock-sess-${Date.now()}`,
        title: "Buổi tập",
        coachId: "",
        learnerId: getCurrentUserId() ?? "learner-1",
        bookingId,
        start: new Date().toISOString(),
        durationMinutes: 60,
        status: "pending_confirmation" as const,
        type: "1-on-1" as const,
        price: 0,
      }),
    ),

  /** Coach: confirm a session (optionally set location/note). */
  confirmSession: (
    sessionId: string,
    body?: { location?: string; meetingUrl?: string; coachNote?: string },
  ): Promise<void> =>
    liveAuthed<void>(
      async () => { await backend.confirmSession(sessionId, body); },
      () => undefined,
    ),

  /** Coach or learner: cancel a session. */
  cancelSession: (sessionId: string, reason?: string): Promise<void> =>
    liveAuthed<void>(
      async () => { await backend.cancelSession(sessionId, reason); },
      () => undefined,
    ),

  /** Coach: mark a session as completed. */
  completeSession: (sessionId: string): Promise<void> =>
    liveAuthed<void>(
      async () => { await backend.completeSession(sessionId); },
      () => undefined,
    ),

  // ---- Reference data (no GET sports endpoint) → mock --------------------
  fetchSports: (): Promise<Sport[]> => Promise.resolve(AVAILABLE_SPORTS),

  // ---- Reviews (public + learner + coach + admin) ------------------------

  /** Public: list active reviews for a coach. Optional auth (canEdit flag). */
  fetchReviews: (
    coachId: string,
    filter?: ReviewFilterRequest,
  ): Promise<{ items: Review[]; totalCount: number; hasNext: boolean }> =>
    live(
      async () => {
        const page = await backend.fetchReviews(coachId, filter);
        return {
          items: (page.items ?? []).map(map.reviewToUi),
          totalCount: page.totalCount,
          hasNext: page.hasNext,
        };
      },
      () => ({ items: [], totalCount: 0, hasNext: false }),
    ),

  /** Public: aggregate rating summary (averageRating, totalReviews, ratingBreakdown). */
  fetchReviewSummary: (coachId: string): Promise<ReviewSummary> =>
    live(
      async () => map.reviewSummaryToUi(await backend.fetchReviewSummary(coachId)),
      () => ({ averageRating: 0, totalReviews: 0, ratingBreakdown: {} }),
    ),

  /** Learner: get own review for a coach. Returns null if not yet reviewed (404). */
  fetchMyReviewForCoach: (coachId: string): Promise<Review | null> =>
    liveAuthed<Review | null>(
      async () => {
        try {
          return map.reviewToUi(await backend.fetchMyReviewForCoach(coachId));
        } catch (err) {
          if (
            err instanceof ApiError &&
            (err.status === 404 ||
              (typeof (err as { body?: { code?: string } }).body === "object" &&
                (err as { body?: { code?: string } }).body?.code === "REVIEW_NOT_FOUND"))
          ) {
            return null;
          }
          throw err;
        }
      },
      () => null,
    ),

  /** Learner: submit a new review. Throws on permission/validation errors. */
  createReview: (coachId: string, body: CreateReviewRequest): Promise<Review> =>
    liveAuthed<Review>(
      async () => map.reviewToUi(await backend.createReview(coachId, body)),
      () => Promise.reject(new Error("Đánh giá cần đăng nhập và kết nối backend.")),
    ),

  /** Learner: update own review. Throws on expired/permission errors. */
  updateReview: (id: string, body: UpdateReviewRequest): Promise<Review> =>
    liveAuthed<Review>(
      async () => map.reviewToUi(await backend.updateReview(id, body)),
      () => Promise.reject(new Error("Đánh giá cần đăng nhập và kết nối backend.")),
    ),

  /** Learner: soft-delete own review. */
  deleteReview: (id: string): Promise<void> =>
    liveAuthed<void>(
      () => backend.deleteReview(id),
      () => Promise.reject(new Error("Xoá đánh giá cần đăng nhập và kết nối backend.")),
    ),

  /** Coach: report a review on their own profile. */
  reportReview: (id: string, body: CreateReviewReportRequest): Promise<void> =>
    liveAuthed<void>(
      async () => { await backend.reportReview(id, body); },
      () => Promise.reject(new Error("Báo cáo cần đăng nhập và kết nối backend.")),
    ),

  /** Admin: paged review report queue. */
  fetchReviewReports: (filter?: {
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<{ items: ReviewReport[]; totalCount: number; hasNext: boolean }> =>
    liveAuthed(
      async () => {
        const page = await backend.fetchReviewReports(filter);
        return {
          items: (page.items ?? []).map(map.reviewReportToUi),
          totalCount: page.totalCount,
          hasNext: page.hasNext,
        };
      },
      () => ({ items: [], totalCount: 0, hasNext: false }),
    ),

  /** Admin: resolve or reject a review report. */
  resolveReviewReport: (id: string, body: ResolveReviewReportRequest): Promise<ReviewReport> =>
    liveAuthed<ReviewReport>(
      async () => map.reviewReportToUi(await backend.resolveReviewReport(id, body)),
      () => Promise.reject(new Error("Cần đăng nhập và kết nối backend.")),
    ),
};

export default api;
