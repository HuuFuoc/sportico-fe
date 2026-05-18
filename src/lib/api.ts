// ============================================================================
// API stub — currently returns mock data. Swap implementations with real
// fetch() calls when backend is ready. Keep signatures stable.
// ============================================================================

import { getCoaches, getCoachById, getLearners, getLearnerById, getAdmins, getAdminById, getUserById } from "@/lib/mock/users";
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

// Currently sync — wrap as async to ease later swap to fetch().
export const api = {
  fetchCoaches: async () => getCoaches(),
  fetchCoach: async (id: string) => getCoachById(id),
  fetchLearners: async () => getLearners(),
  fetchLearner: async (id: string) => getLearnerById(id),
  fetchAdmins: async () => getAdmins(),
  fetchAdmin: async (id: string) => getAdminById(id),
  fetchUser: async (id: string) => getUserById(id),

  fetchSessions: async () => getSessions(),
  fetchSession: async (id: string) => getSessionById(id),
  fetchSessionsForCoach: async (id: string) => getSessionsForCoach(id),
  fetchSessionsForLearner: async (id: string) => getSessionsForLearner(id),
  fetchUpcoming: async (f?: { coachId?: string; learnerId?: string }) =>
    getUpcomingSessions(f),

  fetchThreads: async (userId: string) => getThreadsForUser(userId),
  fetchThread: async (id: string) => getThreadById(id),
  fetchMessages: async (threadId: string) => getMessagesForThread(threadId),

  fetchEarnings: async () => getEarnings(),
  fetchPayouts: async () => getPayouts(),
  fetchEarningsTotal: async () => getEarningsTotal(),

  fetchDailyActiveUsers: async () => getDailyActiveUsers(),
  fetchProgressMetrics: async (learnerId: string) =>
    getProgressMetricsForLearner(learnerId),
  fetchProgressTrend: async () => getProgressTrend(),

  fetchInsights: async (audience: "learner" | "coach" | "admin") =>
    getInsightsForRole(audience),
  fetchNotifications: async () => getNotifications(),
  fetchVerifications: async () => getVerifications(),
};

export default api;
