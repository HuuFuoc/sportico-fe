// ============================================================================
// Real backend endpoint map (from swagger). The ONLY place backend paths live.
// Base URL = NEXT_PUBLIC_API_BASE_URL (the Azure host); paths start with "/api".
// ============================================================================

export const backendEndpoints = {
  // ---- Auth (handled in auth-api.ts, listed for completeness) ------------
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    verifyEmail: (token: string) =>
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    refreshToken: "/api/auth/refresh-token",
    me: "/api/auth/me",
  },

  // ---- Coaches -----------------------------------------------------------
  coachRegister: "/api/coaches/register",
  coachMe: "/api/coaches/me",
  coachMedia: "/api/coaches/me/media",
  coachMediaById: (id: string) =>
    `/api/coaches/me/media/${encodeURIComponent(id)}`,
  coachPayoutAccount: "/api/coaches/me/payout-account",
  coachWallet: "/api/coaches/me/wallet",
  coachWalletTransactions: "/api/coaches/me/wallet/transactions",
  coachWithdrawals: "/api/coaches/me/withdrawal-requests",

  // ---- Training packages -------------------------------------------------
  publicTrainingPackages: "/api/public/training-packages",
  publicTrainingPackageById: (id: string) =>
    `/api/public/training-packages/${encodeURIComponent(id)}`,
  myTrainingPackages: "/api/training-packages/me",
  myTrainingPackageById: (id: string) =>
    `/api/training-packages/me/${encodeURIComponent(id)}`,
  trainingPackages: "/api/training-packages",
  trainingPackageById: (id: string) =>
    `/api/training-packages/${encodeURIComponent(id)}`,
  trainingPackageArchive: (id: string) =>
    `/api/training-packages/${encodeURIComponent(id)}/archive`,

  // ---- Bookings ----------------------------------------------------------
  myBookings: "/api/bookings/me",
  coachBookings: "/api/bookings/coach",
  bookingById: (id: string) => `/api/bookings/${encodeURIComponent(id)}`,
  purchaseManual: "/api/bookings/purchase/manual",
  purchasePayos: "/api/bookings/purchase/payos",

  // ---- Sessions / plan / progress / assessment (per booking) ------------
  bookingSessions: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/sessions`,
  bookingTrainingPlan: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/training-plan`,
  bookingProgressCheckIns: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/progress-checkins`,
  bookingAssessment: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/assessment`,

  // ---- Chat --------------------------------------------------------------
  chatRooms: "/api/chat/rooms",
  roomMessages: (roomId: string) =>
    `/api/chat/rooms/${encodeURIComponent(roomId)}/messages`,

  // ---- Notifications -----------------------------------------------------
  notifications: "/api/notifications/me",
  notificationsUnreadCount: "/api/notifications/me/unread-count",
  notificationRead: (id: string) =>
    `/api/notifications/${encodeURIComponent(id)}/read`,
  notificationsReadAll: "/api/notifications/me/read-all",

  // ---- Posts -------------------------------------------------------------
  myPosts: "/api/posts/me",

  // ---- Admin moderation queues ------------------------------------------
  adminPendingPosts: "/api/admin/posts/pending",
  adminApprovePost: (id: string) =>
    `/api/admin/posts/${encodeURIComponent(id)}/approve`,
  adminRejectPost: (id: string) =>
    `/api/admin/posts/${encodeURIComponent(id)}/reject`,
  adminPendingTrainingPackages: "/api/admin/training-packages/pending",
  adminApproveTrainingPackage: (id: string) =>
    `/api/admin/training-packages/${encodeURIComponent(id)}/approve`,
  adminRejectTrainingPackage: (id: string) =>
    `/api/admin/training-packages/${encodeURIComponent(id)}/reject`,
  adminPendingPayoutAccounts: "/api/admin/coach-payout-accounts/pending",
  adminVerifyPayoutAccount: (id: string) =>
    `/api/admin/coach-payout-accounts/${encodeURIComponent(id)}/verify`,
  adminRejectPayoutAccount: (id: string) =>
    `/api/admin/coach-payout-accounts/${encodeURIComponent(id)}/reject`,
  adminPendingWithdrawals: "/api/admin/withdrawal-requests/pending",
  adminApproveWithdrawal: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/approve`,
  adminRejectWithdrawal: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/reject`,
} as const;
