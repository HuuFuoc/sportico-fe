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
  /** GET /api/users/{userId} — resolve any user's public profile (name, avatar). */
  userById: (id: string) => `/api/users/${encodeURIComponent(id)}`,

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
  coachWithdrawalReceipt: (id: string) =>
    `/api/coaches/me/withdrawal-requests/${encodeURIComponent(id)}/receipt`,
  /** Aggregate dashboard for the authenticated coach. Optional FromDate/ToDate query. */
  coachDashboard: "/api/coaches/me/dashboard",

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
  reconcilePayos: (orderCode: string | number) =>
    `/api/payments/payos/${orderCode}/reconcile`,

  // ---- Sessions (per booking) -------------------------------------------
  /** GET only — list a booking's auto-created TrainingSessions (read-only).
   *  The legacy POST (manual session booking) has been removed. */
  bookingSessions: (bookingId: string) =>
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
  /** PUT /api/progress-checkins/{id}/coach-feedback — coach submits feedback */
  progressCheckInFeedback: (id: string) =>
    `/api/progress-checkins/${encodeURIComponent(id)}/coach-feedback`,

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
  myPostById: (id: string) => `/api/posts/me/${encodeURIComponent(id)}`,
  createPost: "/api/posts",
  postById: (id: string) => `/api/posts/${encodeURIComponent(id)}`,
  postArchive: (id: string) => `/api/posts/${encodeURIComponent(id)}/archive`,

  // ---- Admin dashboard ---------------------------------------------------
  /** Aggregate platform dashboard for admins. Optional FromDate/ToDate query. */
  adminDashboard: "/api/admin/dashboard",
  /** All admin withdrawal requests (any status). */
  adminAllWithdrawals: "/api/admin/withdrawal-requests",
  /** Single withdrawal request detail. */
  adminWithdrawalById: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}`,

  // ---- Reviews -----------------------------------------------------------
  /** Public: list active reviews for a coach. Optional auth: canEdit flag set when learner owns the review. */
  coachReviews: (coachId: string) =>
    `/api/coaches/${encodeURIComponent(coachId)}/reviews`,
  /** Public: aggregate rating summary (averageRating, totalReviews, ratingBreakdown). */
  coachReviewSummary: (coachId: string) =>
    `/api/coaches/${encodeURIComponent(coachId)}/reviews/summary`,
  /** Learner: fetch own review for a specific coach. 404 = not yet reviewed. */
  myReviewForCoach: (coachId: string) =>
    `/api/coaches/${encodeURIComponent(coachId)}/reviews/me`,
  /** Learner: create a review for a coach. */
  createCoachReview: (coachId: string) =>
    `/api/coaches/${encodeURIComponent(coachId)}/reviews`,
  /** Learner: update (PUT) or soft-delete (DELETE) an existing review by id. */
  reviewById: (id: string) => `/api/reviews/${encodeURIComponent(id)}`,
  /** Coach: report a review on their own profile. */
  reviewReport: (id: string) =>
    `/api/reviews/${encodeURIComponent(id)}/report`,
  /** Admin: paged queue of review reports. */
  adminReviewReports: "/api/admin/review-reports",
  /** Admin: resolve or reject a review report. */
  adminResolveReviewReport: (id: string) =>
    `/api/admin/review-reports/${encodeURIComponent(id)}/resolve`,

  // ---- Coach teaching locations -----------------------------------------
  coachTeachingLocations: "/api/coaches/me/teaching-locations",
  coachTeachingLocationById: (id: string) =>
    `/api/coaches/me/teaching-locations/${encodeURIComponent(id)}`,
  coachTeachingLocationSetDefault: (id: string) =>
    `/api/coaches/me/teaching-locations/${encodeURIComponent(id)}/set-default`,

  // ---- Platform packages (admin-managed subscription tiers) ------------
  platformPackages: "/api/packages",
  platformPackageById: (id: number) => `/api/packages/${id}`,
  platformPackageStatus: (id: number) => `/api/packages/${id}/status`,

  // ---- Coach subscription packages -------------------------------------
  coachSubscriptionCurrent: "/api/coach-packages/me/current",
  coachSubscriptionHistory: "/api/coach-packages/me/history",
  coachSubscriptionPurchasePayos: "/api/coach-packages/purchase/payos",
  coachSubscriptionPurchaseManual: "/api/coach-packages/purchase/manual",

  // ---- Payments (reconcile all) ----------------------------------------
  reconcileAllPayos: "/api/payments/payos/reconcile",

  // ---- Advisory (AI coach-matching assistant) --------------------------
  // NOTE: the only versioned (/api/v1/...) path on this backend so far. Keep
  // the version segment verbatim — the same-origin proxy forwards any path.
  advisoryMessages: "/api/v1/advisory/messages",

  // ---- Admin user management --------------------------------------------
  adminUsers: "/api/admin/users",
  adminUserById: (id: string) => `/api/admin/users/${encodeURIComponent(id)}`,

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
  adminMarkPaidWithdrawal: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/mark-paid`,
  adminRefreshPayoutStatus: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/refresh-payout-status`,
  adminRetryPayout: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/retry-payout`,
  adminWithdrawalReceipt: (id: string) =>
    `/api/admin/withdrawal-requests/${encodeURIComponent(id)}/receipt`,
} as const;
