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
  completedSessions: number;
  status?: string | null;
  paidAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
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
  createdAt: string;
  updatedAt: string;
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

// ---- Coach profile ---------------------------------------------------------

export interface CoachProfileResponse {
  userId: string;
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
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
  weeks?: TrainingPlanWeekResponse[] | null;
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
