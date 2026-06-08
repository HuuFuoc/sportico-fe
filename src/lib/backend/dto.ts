// ============================================================================
// Backend DTOs — mirror the Sportico API swagger (japaneast Azure host).
//
// These are the RAW shapes returned by the backend, wrapped in the `Result<T>`
// envelope. They are intentionally separate from the UI domain types in
// `src/types` — `src/lib/backend/mappers.ts` adapts these into UI types so the
// existing pages keep rendering unchanged.
// ============================================================================

export interface BackendError {
  code?: string | null;
  message?: string | null;
  type?: string | null;
  details?: string[] | null;
}

/** Standard success/failure envelope used by every endpoint. */
export interface Result<T> {
  isSuccess: boolean;
  data?: T | null;
  error?: BackendError | null;
}

/** Paged collection envelope (lives inside `Result.data` for list endpoints). */
export interface PagedResult<T> {
  items: T[] | null;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PageQuery {
  pageNumber?: number;
  pageSize?: number;
}

// ---- Public coach directory ------------------------------------------------

export interface PublicCoachSportResponse {
  id: number;
  name?: string | null;
}

export interface PublicCoachListItemResponse {
  coachId: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  experienceYears: number;
  coverImageUrl?: string | null;
  teachingCity?: string | null;
  teachingDistrict?: string | null;
  isOnlineAvailable?: boolean | null;
  isOfflineAvailable?: boolean | null;
  specialties?: string | null;
  rating: number;
  totalReviews: number;
  sports?: PublicCoachSportResponse[] | null;
}

export interface PublicCoachMediaResponse {
  id: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  title?: string | null;
  description?: string | null;
  orderIndex: number;
}

export interface PublicCoachTrainingPackageResponse {
  id: string;
  sportId: number;
  sportName?: string | null;
  title?: string | null;
  description?: string | null;
  price: number;
  sessionCount: number;
  durationDays: number;
  location?: string | null;
  isOnline: boolean;
  level?: string | null;
  goalType?: string | null;
  status?: string | null;
}

export interface PublicCoachDetailResponse extends PublicCoachListItemResponse {
  teachingAddress?: string | null;
  certificationsSummary?: string | null;
  achievementsSummary?: string | null;
  media?: PublicCoachMediaResponse[] | null;
  trainingPackages?: PublicCoachTrainingPackageResponse[] | null;
}

// ---- Sports / packages -----------------------------------------------------

export interface SportResponse {
  id: number;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TrainingPackageResponse {
  id: string;
  coachId: string;
  sportId: number;
  sportName?: string | null;
  title?: string | null;
  description?: string | null;
  price: number;
  sessionCount: number;
  durationDays: number;
  location?: string | null;
  isOnline: boolean;
  level?: string | null;
  goalType?: string | null;
  status?: string | null;
  rejectionReason?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Bookings / sessions ---------------------------------------------------

export interface BookingResponse {
  id: string;
  learnerId: string;
  coachId: string;
  trainingPackageId: string;
  trainingPackageTitle?: string | null;
  totalAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  coachReceiveAmount: number;
  perSessionCoachAmount: number;
  totalSessions: number;
  /** Count of sessions in terminal "completed" state only. */
  completedSessions: number;
  /** Count of all sessions that consume a slot (requested + scheduled + completed + missed). */
  usedSessions: number;
  /** totalSessions - usedSessions. Cancelled sessions free a slot. */
  remainingSessions: number;
  /** False when remainingSessions <= 0 or booking is not active. Use this to gate booking buttons. */
  canBookSession: boolean;
  /** Breakdown by status string key → count (e.g. { "scheduled": 2, "completed": 1 }). */
  sessionCountsByStatus?: Record<string, number> | null;
  status?: string | null;
  paidAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePayOsResponse {
  bookingId: string;
  paymentId: string;
  orderCode: number;
  checkoutUrl?: string | null;
  status?: string | null;
  expiredAt?: string | null;
}

export interface ReconcilePayOsResponse {
  activated: boolean;
  bookingId?: string | null;
  paymentId?: string | null;
  orderCode?: number | null;
  paymentStatus?: string | null;
  bookingStatus?: string | null;
  payOsStatus?: string | null;
  message?: string | null;
}

export interface TrainingSessionResponse {
  id: string;
  bookingId: string;
  learnerId: string;
  coachId: string;
  startTime: string;
  endTime: string;
  status?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
  learnerNote?: string | null;
  coachNote?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Chat ------------------------------------------------------------------

export interface ChatRoomResponse {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

export interface ChatMessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  content?: string | null;
  isRead: boolean;
  sentAt: string;
}

// ---- Notifications ---------------------------------------------------------

export interface NotificationResponse {
  id: string;
  title?: string | null;
  content?: string | null;
  type?: string | null;
  isRead: boolean;
  createdAt: string;
}

// ---- Coach wallet / payouts / withdrawals ---------------------------------

export interface CoachWalletResponse {
  id: string;
  coachId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoachWalletTransactionResponse {
  id: string;
  coachWalletId: string;
  coachId: string;
  type?: string | null;
  direction?: string | null;
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface CoachPayoutAccountResponse {
  id: string;
  coachId: string;
  payoutMethod?: string | null;
  bankName?: string | null;
  /** 6-digit Napas/VietQR BIN code. */
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequestResponse {
  id: string;
  coachId: string;
  coachWalletId: string;
  coachPayoutAccountId?: string | null;
  amount: number;
  status?: string | null;
  adminNote?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  payOsPayoutId?: string | null;
  payOsReferenceId?: string | null;
  payOsPayoutStatus?: string | null;
  failureReason?: string | null;
  processingAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Receipt returned by GET /api/coaches/me/withdrawal-requests/{id}/receipt */
export interface WithdrawalReceiptResponse {
  receiptNumber: string;
  withdrawalRequestId: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  amount: number;
  currency: string;
  status: string;
  payOsPayoutId?: string | null;
  payOsReferenceId?: string | null;
  payOsPayoutStatus?: string | null;
  failureReason?: string | null;
  createdAt: string;
  processingAt?: string | null;
  paidAt?: string | null;
  bankName: string;
  bankBin?: string | null;
  maskedAccountNumber: string;
  accountHolderName: string;
  adminNote?: string | null;
  note?: string | null;
}

// ---- Posts -----------------------------------------------------------------

export interface PostResponse {
  id: string;
  coachId: string;
  sportId: number;
  sportName?: string | null;
  title?: string | null;
  description?: string | null;
  price: number;
  location?: string | null;
  isOnline: boolean;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[] | null;
}

// ---- Coach profile / media -------------------------------------------------

export interface CoachProfileMediaResponse {
  id: string;
  coachId: string;
  mediaType: string;
  mediaUrl: string;
  title?: string | null;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoachTeachingLocationResponse {
  id: string;
  coachId: string;
  address: string;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full coach profile returned by GET/PUT /api/coaches/me and POST register. */
export interface CoachProfileResponse {
  userId: string;
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  coverImageUrl?: string | null;
  teachingAddress?: string | null;
  teachingCity?: string | null;
  teachingDistrict?: string | null;
  teachingLatitude?: number | null;
  teachingLongitude?: number | null;
  isOnlineAvailable?: boolean | null;
  isOfflineAvailable?: boolean | null;
  specialties?: string | null;
  certificationsSummary?: string | null;
  achievementsSummary?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  media?: CoachProfileMediaResponse[] | null;
  teachingLocations?: CoachTeachingLocationResponse[] | null;
}

// ---- Current user (GET /api/auth/me) ---------------------------------------

export interface CoachProfileSummaryResponse {
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  coverImageUrl?: string | null;
  rating: number;
  totalReviews: number;
}

export interface LearnerProfileSummaryResponse {
  goal?: string | null;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  status: string;
  roles: string[];
  coachProfile?: CoachProfileSummaryResponse | null;
  learnerProfile?: LearnerProfileSummaryResponse | null;
}

// ---- Public user profile (GET /api/users/{id}) — AllowAnonymous ---------------
// Only safe public fields — the backend never returns email/phone/status/etc.
// DO NOT add sensitive fields here; they are not returned by this endpoint.

export interface PublicCoachProfileDto {
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  coverImageUrl?: string | null;
  rating?: number | null;
  totalReviews?: number | null;
}

export interface PublicLearnerProfileDto {
  goal?: string | null;
}

/** Safe public profile returned by GET /api/users/{id}. */
export interface PublicUserResponseDto {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  roles?: string[] | null;
  coachProfile?: PublicCoachProfileDto | null;
  learnerProfile?: PublicLearnerProfileDto | null;
}

/** Request body for `PUT /api/users/me`. All fields are partial updates. */
export interface UpdateMeRequest {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
}

/** Request body for `POST /api/auth/change-password`. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ---- Training plan ---------------------------------------------------------

export interface TrainingPlanExerciseResponse {
  id: string;
  trainingPlanDayId: string;
  exerciseName?: string | null;
  orderIndex: number;
  sets?: number | null;
  reps?: string | null;
  intensity?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface TrainingPlanDayResponse {
  id: string;
  trainingPlanWeekId: string;
  dayNumber: number;
  title?: string | null;
  notes?: string | null;
  exercises?: TrainingPlanExerciseResponse[] | null;
}

export interface TrainingPlanWeekResponse {
  id: string;
  trainingPlanId: string;
  weekNumber: number;
  focus?: string | null;
  notes?: string | null;
  days?: TrainingPlanDayResponse[] | null;
}

export interface TrainingPlanResponse {
  id: string;
  bookingId: string;
  learnerId: string;
  coachId: string;
  title?: string | null;
  goalType?: string | null;
  overview?: string | null;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  /** ISO datetime when the underlying booking package expires. */
  bookingExpiresAt?: string | null;
  /** True when the plan cannot be edited (expired booking or terminal status). */
  isReadOnly: boolean;
  /** Human-readable reason the plan is read-only. */
  readOnlyReason?: string | null;
  weeks?: TrainingPlanWeekResponse[] | null;
}

// ---- Availability slots ----------------------------------------------------

export interface AvailabilitySlotResponse {
  id: string;
  coachId: string;
  startTime: string;
  endTime: string;
  status?: string | null; // "available" | "booked" | "cancelled"
  location?: string | null;
  meetingUrl?: string | null;
  isOnline: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Max number of learners that can book this slot. 1 = individual; >1 = group. */
  maxParticipants?: number | null;
  /** Number of learners who have already booked this slot. */
  bookedParticipants?: number | null;
  /** Remaining open spots (maxParticipants - bookedParticipants). */
  remainingParticipants?: number | null;
  /** True when no spots remain (remainingParticipants === 0). */
  isFull?: boolean | null;
}

export interface CreateAvailabilitySlotRequest {
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  isOnline?: boolean;
  note?: string;
  /** Max learners per slot. Omit or set to 1 for 1-on-1; >1 for group slots. */
  maxParticipants?: number;
}

// ---- Training plan CRUD request bodies ------------------------------------

// Matches backend CreateTrainingPlanRequest exactly (all non-null fields required).
export interface CreateTrainingPlanRequest {
  title: string;
  goalType: string;
  overview?: string;
  startDate: string; // ISO datetime
  endDate: string;   // ISO datetime
  totalWeeks: number;
}

// Matches backend UpdateTrainingPlanRequest (includes status for plan lifecycle).
export interface UpdateTrainingPlanRequest {
  title: string;
  goalType: string;
  overview?: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  status?: string;
}

export interface CreateWeekRequest {
  weekNumber: number;
  focus?: string;
  notes?: string;
}

// Backend Title is required (empty string allowed, not null).
export interface CreateDayRequest {
  dayNumber: number;
  title: string; // send "" if no title
  notes?: string;
}

// Backend ExerciseName and OrderIndex are required.
export interface CreateExerciseRequest {
  exerciseName: string;
  orderIndex: number;
  sets?: number;
  reps?: string;
  intensity?: string;
  restSeconds?: number;
  notes?: string;
}

export interface UpdateExerciseRequest {
  exerciseName: string;
  orderIndex: number;
  sets?: number;
  reps?: string;
  intensity?: string;
  restSeconds?: number;
  notes?: string;
}

// ---- Progress check-in feedback -------------------------------------------

export interface UpdateCheckInFeedbackRequest {
  coachFeedback: string;
}

// ---- Session booking / actions --------------------------------------------

export interface CreateSessionRequest {
  availabilitySlotId: string;
  learnerNote?: string;
}

export interface ConfirmSessionRequest {
  location?: string;
  meetingUrl?: string;
  coachNote?: string;
}

export interface LearnerAssessmentResponse {
  id: string;
  bookingId: string;
  learnerId: string;
  coachId: string;
  goalType?: string | null;
  goalDescription?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  currentLevel?: string | null;
  healthNotes?: string | null;
  injuryNotes?: string | null;
  trainingHistory?: string | null;
  availableDaysPerWeek?: string | null;
  preferredSessionDurationMinutes?: number | null;
  equipmentAvailable?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressCheckInResponse {
  id: string;
  bookingId: string;
  learnerId: string;
  coachId: string;
  checkInDate: string;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  waistCm?: number | null;
  energyLevel?: string | null;
  sleepQuality?: string | null;
  learnerNote?: string | null;
  coachFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Dashboard responses ---------------------------------------------------

/** Optional date-range filter for dashboard endpoints. */
export interface DashboardFilterParams {
  fromDate?: string; // ISO datetime
  toDate?: string;   // ISO datetime
}

/** GET /api/coaches/me/dashboard */
export interface CoachDashboardResponse {
  coachId: string;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  requestedSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  sessionCompletionRate: number;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  pendingWithdrawalRequests: number;
}

/** GET /api/admin/dashboard */
export interface AdminDashboardResponse {
  totalUsers: number;
  totalLearners: number;
  totalCoaches: number;
  publishedPackages: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  grossRevenue: number;
  platformFeeRevenue: number;
  coachPayable: number;
  totalWithdrawnPaid: number;
  pendingWithdrawals: number;
  processingWithdrawals: number;
  paidWithdrawals: number;
  failedWithdrawals: number;
}

// ---- Reviews ---------------------------------------------------------------

/** Lightweight reviewer info embedded in ReviewResponse. */
export interface ReviewerInfoResponse {
  id?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

/** Single review as returned by GET /api/coaches/{coachId}/reviews and related endpoints. */
export interface ReviewResponse {
  id: string;
  coachId: string;
  learnerId?: string | null;
  rating: number;
  comment?: string | null;
  /** "active" | "hidden" | "deleted" */
  status?: string | null;
  /** True when the authenticated learner owns this review AND the edit window is still open. */
  canEdit?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Reviewer's display info, if the backend embeds it. */
  reviewer?: ReviewerInfoResponse | null;
}

/** GET /api/coaches/{coachId}/reviews/summary */
export interface CoachReviewSummaryResponse {
  averageRating: number;
  totalReviews: number;
  /** Map of star level (string key "1"–"5") → review count. */
  ratingBreakdown: Record<string, number>;
}

/** Query params for GET /api/coaches/{coachId}/reviews */
export interface ReviewFilterRequest {
  pageNumber?: number;
  pageSize?: number;
  /** Filter by exact star rating (1–5). Omit for all ratings. */
  rating?: number;
  /** "latest" | "highest" | "lowest" */
  sortBy?: "latest" | "highest" | "lowest";
}

/** POST /api/coaches/{coachId}/reviews */
export interface CreateReviewRequest {
  bookingId?: string;
  rating: number;
  comment?: string | null;
}

/** PUT /api/reviews/{id} */
export interface UpdateReviewRequest {
  rating: number;
  comment?: string | null;
}

/** POST /api/reviews/{id}/report */
export interface CreateReviewReportRequest {
  reason: string;
  description?: string | null;
}

/**
 * Item in GET /api/admin/review-reports (PUT /resolve returns the same shape).
 *
 * Verified against the LIVE backend (2026-06): the reported review is
 * FLATTENED into `review*` sibling fields — there is NO nested `review`
 * object. Reading a nested `review` previously left the admin snapshot blank
 * ("Không có snapshot review.").
 */
export interface ReviewReportResponse {
  id: string;
  reporterId?: string | null;
  reviewId?: string | null;
  reason?: string | null;
  description?: string | null;
  /** "pending" | "reviewing" | "resolved" | "rejected" */
  status: string;
  /** "none" | "review_hidden" | "review_deleted" */
  actionTaken?: string | null;
  handledByUserId?: string | null;
  handledAt?: string | null;
  resolutionNote?: string | null;
  createdAt?: string | null;
  // ── Flattened snapshot of the reported review ──────────────────────────────
  reviewRating?: number | null;
  reviewComment?: string | null;
  /** "active" | "hidden" | "deleted" */
  reviewStatus?: string | null;
  reviewCoachId?: string | null;
  reviewLearnerId?: string | null;
}

/** PUT /api/admin/review-reports/{id}/resolve */
export interface ResolveReviewReportRequest {
  isValid: boolean;
  hideOrDeleteReview: boolean;
  resolutionNote?: string | null;
}

// ---- Coach teaching locations -----------------------------------------------

export interface CreateTeachingLocationRequest {
  address: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateTeachingLocationRequest {
  address: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

// ---- Posts (coach listings) -------------------------------------------------

export interface CreatePostRequest {
  sportId: number;
  title: string;
  description?: string;
  price: number;
  location?: string;
  isOnline: boolean;
  imageUrls?: string[];
}

export interface UpdatePostRequest {
  sportId?: number;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  isOnline?: boolean;
  imageUrls?: string[];
}

// ---- Platform packages (admin-managed subscription tiers) -------------------

/** A platform subscription tier as managed by admin (GET/POST/PUT /api/packages). */
export interface PlatformPackageResponse {
  id: number;
  name?: string | null;
  description?: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformPackageRequest {
  name: string;
  description?: string;
  price: number;
  durationDays: number;
}

export interface UpdatePlatformPackageRequest {
  name?: string;
  description?: string;
  price?: number;
  durationDays?: number;
}

export interface UpdatePlatformPackageStatusRequest {
  isActive: boolean;
}

// ---- Coach subscription packages -------------------------------------------

/** A coach's subscription to a platform package tier. */
export interface CoachSubscriptionResponse {
  id: string;
  coachId: string;
  packageId: number;
  packageName?: string | null;
  startDate: string;
  endDate: string;
  status?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseCoachPackageRequest {
  packageId: number;
}

export interface PurchaseCoachPackagePayOsResponse {
  coachPackageId: string;
  paymentId: string;
  orderCode: number;
  checkoutUrl?: string | null;
  status?: string | null;
  expiredAt?: string | null;
}
