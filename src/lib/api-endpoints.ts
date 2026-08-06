import type { Role } from "@/types";

// ============================================================================
// Centralized endpoint map — the ONLY place backend paths live.
//
// ⚠️  PLACEHOLDER CONTRACT: the real backend API has not been provided yet.
//     These paths follow conventional REST shapes but are NOT confirmed.
//     When the backend contract lands, edit the URLs HERE — pages and
//     components must never hard-code a fetch URL.
// ============================================================================

export const endpoints = {
  // ---- Auth (real backend contract — routes live under /api) -------------
  // Base = NEXT_PUBLIC_API_BASE_URL (the Azure host). `me` returns the current
  // user with backend roles + profiles. There is NO logout endpoint.
  auth: {
    register: "/api/auth/register",
    verifyEmail: (token: string) =>
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    login: "/api/auth/login",
    refreshToken: "/api/auth/refresh-token",
    me: "/api/auth/me",
    // Google sign-in. POST = Google Identity Services ID-token login (default
    // flow). GET = start the redirect OAuth fallback — it answers 302 and MUST
    // be opened with a browser navigation, never fetch()/apiFetch.
    google: "/api/auth/google",
    googleExchange: "/api/auth/google/exchange",
  },
  // ---- Users -------------------------------------------------------------
  coaches: "/coaches",
  coachById: (id: string) => `/coaches/${encodeURIComponent(id)}`,
  learners: "/learners",
  learnerById: (id: string) => `/learners/${encodeURIComponent(id)}`,
  admins: "/admins",
  adminById: (id: string) => `/admins/${encodeURIComponent(id)}`,
  userById: (id: string) => `/users/${encodeURIComponent(id)}`,

  // ---- Sessions ----------------------------------------------------------
  sessions: "/sessions",
  sessionById: (id: string) => `/sessions/${encodeURIComponent(id)}`,
  sessionsForCoach: (id: string) =>
    `/sessions?coachId=${encodeURIComponent(id)}`,
  sessionsForLearner: (id: string) =>
    `/sessions?learnerId=${encodeURIComponent(id)}`,
  upcoming: (filter?: { coachId?: string; learnerId?: string }) => {
    const qs = new URLSearchParams();
    if (filter?.coachId) qs.set("coachId", filter.coachId);
    if (filter?.learnerId) qs.set("learnerId", filter.learnerId);
    const query = qs.toString();
    return `/sessions/upcoming${query ? `?${query}` : ""}`;
  },

  // ---- Messages ----------------------------------------------------------
  threads: (userId: string) =>
    `/messages/threads?userId=${encodeURIComponent(userId)}`,
  threadById: (id: string) => `/messages/threads/${encodeURIComponent(id)}`,
  messages: (threadId: string) =>
    `/messages/threads/${encodeURIComponent(threadId)}/messages`,

  // ---- Earnings / payouts (coach) ---------------------------------------
  earnings: "/coach/earnings",
  payouts: "/coach/payouts",
  earningsTotal: "/coach/earnings/total",

  // ---- Analytics / progress ---------------------------------------------
  analyticsDailyActiveUsers: "/admin/analytics/daily-active-users",
  progressMetrics: (learnerId: string) =>
    `/learners/${encodeURIComponent(learnerId)}/progress/metrics`,
  progressTrend: "/progress/trend",

  // ---- Wellness (learner dashboard) -------------------------------------
  wellness: (learnerId: string) =>
    `/learners/${encodeURIComponent(learnerId)}/wellness`,
  activityHeatmap: (learnerId: string) =>
    `/learners/${encodeURIComponent(learnerId)}/activity-heatmap`,

  // ---- AI insights / notifications / verifications ----------------------
  insights: (audience: Role) => `/insights?audience=${audience}`,
  notifications: "/notifications",
  verifications: "/admin/verifications",

  // ---- Reference data ----------------------------------------------------
  sports: "/reference/sports",
} as const;
