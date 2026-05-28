// ============================================================================
// Sportico data access layer — THE backend swap point.
//
// Every page/component reads data through `api.*`; this is the ONLY module that
// imports from `@/lib/mock/*`. Each method delegates to `getResource`, which:
//
//   • returns the local mock fixture when NEXT_PUBLIC_API_BASE_URL is unset
//     (dev / demo — the current behaviour), or
//   • performs a typed `fetch()` against the backend when it IS set.
//
// To go live: set NEXT_PUBLIC_API_BASE_URL and, if needed, adjust the paths in
// `src/lib/api-endpoints.ts`. No page changes required.
//
// Response shapes are the domain types in `src/types/index.ts` — that file is
// the contract the backend must match.
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
import { getResource } from "@/lib/api-client";
import { endpoints } from "@/lib/api-endpoints";
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

export const api = {
  // ---- Users -------------------------------------------------------------
  fetchCoaches: (): Promise<Coach[]> =>
    getResource(endpoints.coaches, () => getCoaches()),
  fetchCoach: (id: string): Promise<Coach | undefined> =>
    getResource(endpoints.coachById(id), () => getCoachById(id)),
  fetchLearners: (): Promise<Learner[]> =>
    getResource(endpoints.learners, () => getLearners()),
  fetchLearner: (id: string): Promise<Learner | undefined> =>
    getResource(endpoints.learnerById(id), () => getLearnerById(id)),
  fetchAdmins: (): Promise<Admin[]> =>
    getResource(endpoints.admins, () => getAdmins()),
  fetchAdmin: (id: string): Promise<Admin | undefined> =>
    getResource(endpoints.adminById(id), () => getAdminById(id)),
  fetchUser: (id: string): Promise<AnyUser | undefined> =>
    getResource(endpoints.userById(id), () => getUserById(id)),

  // ---- Sessions ----------------------------------------------------------
  fetchSessions: (): Promise<Session[]> =>
    getResource(endpoints.sessions, () => getSessions()),
  fetchSession: (id: string): Promise<Session | undefined> =>
    getResource(endpoints.sessionById(id), () => getSessionById(id)),
  fetchSessionsForCoach: (id: string): Promise<Session[]> =>
    getResource(endpoints.sessionsForCoach(id), () => getSessionsForCoach(id)),
  fetchSessionsForLearner: (id: string): Promise<Session[]> =>
    getResource(endpoints.sessionsForLearner(id), () =>
      getSessionsForLearner(id),
    ),
  fetchUpcoming: (filter?: {
    coachId?: string;
    learnerId?: string;
  }): Promise<Session[]> =>
    getResource(endpoints.upcoming(filter), () => getUpcomingSessions(filter)),

  // ---- Messages ----------------------------------------------------------
  fetchThreads: (userId: string): Promise<MessageThread[]> =>
    getResource(endpoints.threads(userId), () => getThreadsForUser(userId)),
  fetchThread: (id: string): Promise<MessageThread | undefined> =>
    getResource(endpoints.threadById(id), () => getThreadById(id)),
  fetchMessages: (threadId: string): Promise<Message[]> =>
    getResource(endpoints.messages(threadId), () =>
      getMessagesForThread(threadId),
    ),

  // ---- Earnings / payouts ------------------------------------------------
  fetchEarnings: (): Promise<EarningPoint[]> =>
    getResource(endpoints.earnings, () => getEarnings()),
  fetchPayouts: (): Promise<Payout[]> =>
    getResource(endpoints.payouts, () => getPayouts()),
  fetchEarningsTotal: (): Promise<EarningsTotal> =>
    getResource(endpoints.earningsTotal, () => getEarningsTotal()),

  // ---- Analytics / progress ---------------------------------------------
  fetchDailyActiveUsers: (): Promise<AnalyticsDailyPoint[]> =>
    getResource(endpoints.analyticsDailyActiveUsers, () =>
      getDailyActiveUsers(),
    ),
  fetchProgressMetrics: (learnerId: string): Promise<ProgressMetric[]> =>
    getResource(endpoints.progressMetrics(learnerId), () =>
      getProgressMetricsForLearner(learnerId),
    ),
  fetchProgressTrend: (): Promise<ProgressTrendPoint[]> =>
    getResource(endpoints.progressTrend, () => getProgressTrend()),

  // ---- Wellness (learner dashboard) -------------------------------------
  fetchWellness: (learnerId: string): Promise<LearnerWellness> =>
    getResource(endpoints.wellness(learnerId), () => getLearnerWellness()),
  fetchActivityHeatmap: (learnerId: string): Promise<number[][]> =>
    getResource(endpoints.activityHeatmap(learnerId), () => activityHeatmap),

  // ---- AI insights / notifications / verifications ----------------------
  fetchInsights: (audience: Role): Promise<AIInsight[]> =>
    getResource(endpoints.insights(audience), () =>
      getInsightsForRole(audience),
    ),
  fetchNotifications: (): Promise<NotificationItem[]> =>
    getResource(endpoints.notifications, () => getNotifications()),
  fetchVerifications: (): Promise<VerificationRequest[]> =>
    getResource(endpoints.verifications, () => getVerifications()),

  // ---- Reference data ----------------------------------------------------
  fetchSports: (): Promise<Sport[]> =>
    getResource(endpoints.sports, () => AVAILABLE_SPORTS),
};

export default api;
