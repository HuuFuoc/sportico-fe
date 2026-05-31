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
    changePassword: "/api/auth/change-password",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    resendVerification: "/api/auth/resend-verification",
  },

  // ---- Users -------------------------------------------------------------
  usersMe: "/api/users/me",

  // ---- Coaches (public + self) -------------------------------------------
  publicCoaches: "/api/public/coaches",
  publicCoachById: (id: string) =>
    `/api/public/coaches/${encodeURIComponent(id)}`,
  coachRegister: "/api/coaches/register",
  coachMe: "/api/coaches/me",
  coachMedia: "/api/coaches/me/media",
  coachMediaById: (id: string) =>
    `/api/coaches/me/media/${encodeURIComponent(id)}`,
  coachPayoutAccount: "/api/coaches/me/payout-account",
  coachWallet: "/api/coaches/me/wallet",
  coachWalletTransactions: "/api/coaches/me/wallet/transactions",
  coachWithdrawals: "/api/coaches/me/withdrawal-requests",

  // ---- Availability slots -----------------------------------------------
  /** Coach manages their own slots */
  myAvailabilitySlots: "/api/coaches/me/availability-slots",
  myAvailabilitySlotById: (id: string) =>
    `/api/coaches/me/availability-slots/${encodeURIComponent(id)}`,
  myAvailabilitySlotCancel: (id: string) =>
    `/api/coaches/me/availability-slots/${encodeURIComponent(id)}/cancel`,
  /** Learner views coach's available slots */
  coachAvailabilitySlots: (coachId: string) =>
    `/api/coaches/${encodeURIComponent(coachId)}/availability-slots`,

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
  /** Coach-role booking detail — requires Coach JWT role (separate from learner endpoint). */
  coachBookingById: (id: string) => `/api/bookings/coach/${encodeURIComponent(id)}`,
  purchaseManual: "/api/bookings/purchase/manual",
  purchasePayos: "/api/bookings/purchase/payos",

  // ---- Sessions (per booking) -------------------------------------------
  bookingSessions: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/sessions`,
  /** Learner books a session against an availability slot */
  createBookingSession: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/sessions`,

  // ---- Training sessions (global views) ---------------------------------
  /** Learner's own sessions across all bookings */
  myTrainingSessions: "/api/learners/me/training-sessions",
  /** Coach's sessions across all learners */
  coachTrainingSessions: "/api/coaches/me/training-sessions",
  /** Mutate a single training session */
  trainingSessionById: (id: string) =>
    `/api/training-sessions/${encodeURIComponent(id)}`,
  trainingSessionConfirm: (id: string) =>
    `/api/training-sessions/${encodeURIComponent(id)}/confirm`,
  trainingSessionCancel: (id: string) =>
    `/api/training-sessions/${encodeURIComponent(id)}/cancel`,
  trainingSessionComplete: (id: string) =>
    `/api/training-sessions/${encodeURIComponent(id)}/complete`,

  // ---- Training plan (per booking) --------------------------------------
  bookingTrainingPlan: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/training-plan`,
  trainingPlanById: (id: string) =>
    `/api/training-plans/${encodeURIComponent(id)}`,
  trainingPlanWeeks: (planId: string) =>
    `/api/training-plans/${encodeURIComponent(planId)}/weeks`,
  trainingPlanWeekDays: (weekId: string) =>
    `/api/training-plan-weeks/${encodeURIComponent(weekId)}/days`,
  trainingPlanDayExercises: (dayId: string) =>
    `/api/training-plan-days/${encodeURIComponent(dayId)}/exercises`,
  trainingPlanExerciseById: (id: string) =>
    `/api/training-plan-exercises/${encodeURIComponent(id)}`,

  // ---- Progress / assessment (per booking) ------------------------------
  bookingProgressCheckIns: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/progress-checkins`,
  bookingAssessment: (bookingId: string) =>
    `/api/bookings/${encodeURIComponent(bookingId)}/assessment`,

  // ---- Chat --------------------------------------------------------------
  chatRooms: "/api/chat/rooms",
  createChatRoom: "/api/chat/rooms",
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
