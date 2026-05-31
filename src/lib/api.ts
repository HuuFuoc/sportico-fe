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
  Booking,
  Coach,
  CoachPost,
  EarningPoint,
  Learner,
  LearnerAssessment,
  ProgressCheckIn,
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
import { getAccessToken } from "@/lib/auth-token";
import { getCurrentRole, getCurrentUserId } from "@/lib/auth-session";
import * as map from "@/lib/backend/mappers";
import { NOW } from "@/lib/mock/clock";
import type { BookingResponse } from "@/lib/backend/dto";
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
  gross: number;
  net: number;
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

/** Like {@link live} but for AUTHENTICATED endpoints. Falls back to the mock
 *  whenever there is no Bearer token — i.e. during SSR / static generation
 *  (no localStorage on the server) and for signed-out dev navigation. This
 *  keeps every page renderable; real data appears once the user logs in. */
function liveAuthed<T>(
  liveFn: () => Promise<T>,
  mockFn: () => T | Promise<T>,
): Promise<T> {
  return isMockMode() || !getAccessToken()
    ? Promise.resolve(mockFn())
    : liveFn();
}

/** Aggregate per-booking sessions into a flat, UI-shaped Session[]. */
async function liveSessionsForBookings(
  bookings: BookingResponse[],
): Promise<Session[]> {
  const out: Session[] = [];
  for (const b of bookings) {
    const page = await backend.bookingSessions(b.id, { pageSize: 100 });
    for (const s of page.items ?? []) out.push(map.sessionToSession(s, b));
  }
  return out;
}

async function liveLearnerSessions(): Promise<Session[]> {
  const page = await backend.myBookings({ pageSize: 50 });
  return liveSessionsForBookings(page.items ?? []);
}

async function liveCoachSessions(): Promise<Session[]> {
  const page = await backend.coachBookings({ pageSize: 50 });
  return liveSessionsForBookings(page.items ?? []);
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
  // the URL to redirect to; mock mode simulates an instant booking so the demo
  // flow still completes.
  purchasePackage: (
    trainingPackageId: string,
  ): Promise<{ checkoutUrl: string } | { booked: true }> =>
    liveAuthed<{ checkoutUrl: string } | { booked: true }>(
      async () => {
        const r = await backend.purchasePayos(trainingPackageId);
        if (!r.checkoutUrl) {
          throw new Error("Không nhận được liên kết thanh toán từ PayOS.");
        }
        return { checkoutUrl: r.checkoutUrl };
      },
      () => ({ booked: true }),
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
  fetchProgressCheckIns: (bookingId: string): Promise<ProgressCheckIn[]> =>
    liveAuthed(async () => {
      const page = await backend.bookingProgressCheckIns(bookingId, {
        pageSize: 100,
      });
      return (page.items ?? []).map(map.progressCheckInToUi);
    }, () => []),
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

  // ---- Messages ----------------------------------------------------------
  fetchThreads: (userId: string): Promise<MessageThread[]> =>
    liveAuthed(async () => {
      const rooms = await backend.chatRooms();
      const me = getCurrentUserId();

      // Build a participant map from the public coaches list.
      // Coaches are the most common chat counterpart; best-effort (never blocks
      // thread rendering even if this call fails or returns no results).
      const coachMap = new Map<string, { name: string; avatarUrl?: string }>();
      try {
        const page = await backend.publicCoaches({ pageSize: 50 });
        for (const c of page.items ?? []) {
          coachMap.set(c.coachId, {
            name: c.fullName?.trim() || `Coach ${c.coachId.slice(0, 4).toUpperCase()}`,
            avatarUrl: c.avatarUrl ?? undefined,
          });
        }
      } catch {
        // Participant lookup is best-effort; missing it just shows initials.
      }

      return rooms.map((r) => {
        const otherId = r.user1Id === me ? r.user2Id : r.user1Id;
        const participant = coachMap.get(otherId);
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

  // ---- Earnings / payouts ------------------------------------------------
  fetchEarnings: (): Promise<EarningPoint[]> =>
    liveAuthed(async () => {
      const page = await backend.walletTransactions({ pageSize: 200 });
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
  approveWithdrawal: (id: string): Promise<void> =>
    liveAuthed<void>(async () => {
      await backend.approveWithdrawal(id);
    }, () => undefined),
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
  fetchPayoutAccount: (): Promise<PayoutAccount | null> =>
    liveAuthed<PayoutAccount | null>(
      () => backend.payoutAccount().then(map.payoutAccountToUi).catch(() => null),
      () => null,
    ),
  upsertPayoutAccount: (body: {
    payoutMethod?: string;
    bankName?: string;
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

  // ---- Reference data (no GET sports endpoint) → mock --------------------
  fetchSports: (): Promise<Sport[]> => Promise.resolve(AVAILABLE_SPORTS),
};

export default api;
