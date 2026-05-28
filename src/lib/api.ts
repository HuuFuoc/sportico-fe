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
  Coach,
  EarningPoint,
  Learner,
  Message,
  MessageThread,
  NotificationItem,
  Payout,
  ProgressMetric,
  ProgressTrendPoint,
  Role,
  Session,
  Sport,
  VerificationRequest,
} from "@/types";
import { isMockMode } from "@/lib/api-client";
import { backend } from "@/lib/backend/client";
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
  // Coach directory derives from public training packages (no coach-list API).
  fetchCoaches: (): Promise<Coach[]> =>
    live(async () => {
      const page = await backend.publicTrainingPackages({ pageSize: 60 });
      return (page.items ?? []).map(map.packageToCoach);
    }, () => getCoaches()),
  fetchCoach: (id: string): Promise<Coach | undefined> =>
    live(async () => {
      const page = await backend.publicTrainingPackages({
        coachId: id,
        pageSize: 1,
      });
      const first = (page.items ?? [])[0];
      return first ? map.packageToCoach(first) : undefined;
    }, () => getCoachById(id)),

  // No backend endpoints → always mock.
  fetchLearners: (): Promise<Learner[]> => Promise.resolve(getLearners()),
  fetchLearner: (id: string): Promise<Learner | undefined> =>
    Promise.resolve(getLearnerById(id)),
  fetchAdmins: (): Promise<Admin[]> => Promise.resolve(getAdmins()),
  fetchAdmin: (id: string): Promise<Admin | undefined> =>
    Promise.resolve(getAdminById(id)),
  fetchUser: (id: string): Promise<AnyUser | undefined> =>
    Promise.resolve(getUserById(id)),

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

  // ---- Messages ----------------------------------------------------------
  fetchThreads: (userId: string): Promise<MessageThread[]> =>
    liveAuthed(async () => {
      const rooms = await backend.chatRooms();
      const me = getCurrentUserId();
      return rooms.map((r) => map.roomToThread(r, me));
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
  fetchEarningsTotal: (): Promise<EarningsTotal> =>
    liveAuthed(async () => {
      const wallet = await backend.wallet();
      return map.walletToTotal(wallet);
    }, () => getEarningsTotal()),

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
