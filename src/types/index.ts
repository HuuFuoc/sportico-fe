// ============================================================================
// Domain types for Smart Coach Hub. All UI components import from this file.
// ============================================================================

// ============================================================================
// Reviews
// ============================================================================

export interface Review {
  id: string;
  coachId: string;
  learnerId: string;
  rating: number;
  comment?: string;
  /** "active" | "hidden" | "deleted" */
  status: string;
  /** True when the authenticated learner owns this review and the edit window is open. */
  canEdit: boolean;
  createdAt: string;
  updatedAt?: string;
  learnerName?: string;
  learnerAvatarUrl?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  /** Keys are "1"–"5" (string), values are review counts. */
  ratingBreakdown: Record<string, number>;
}

export interface ReviewReport {
  id: string;
  /** User id of the reporter (a coach reporting a review on their own profile). */
  reporterId?: string;
  /** "pending" | "reviewing" | "resolved" | "rejected" */
  status: string;
  reason: string;
  description?: string;
  /** "none" | "review_hidden" | "review_deleted" */
  actionTaken?: string;
  resolutionNote?: string;
  handledAt?: string;
  createdAt: string;
  reviewSnapshot?: Review;
}

export type Role = "learner" | "coach" | "admin";

export type Sport =
  | "Badminton"
  | "Tennis"
  | "Yoga"
  | "HIIT"
  | "Strength"
  | "Running"
  | "Swimming"
  | "Boxing"
  | "Pilates"
  | "Cycling"
  | "Basketball"
  | "Football"
  | "Golf"
  | "Mindfulness";

export interface UserBase {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  joinedAt: string; // ISO date
  role: Role;
}

export interface Learner extends UserBase {
  role: "learner";
  totalHoursTrained: number;
  upcomingSessions: number;
  streakDays: number;
  goals: string[];
  preferredSports: Sport[];
  matchRate?: number; // 0..100
}

export interface Coach extends UserBase {
  role: "coach";
  headline: string; // short tagline
  bio: string;
  hourlyRate: number;
  currency: string;
  rating: number; // 0..5
  reviewCount: number;
  sport: Sport;
  specialties: string[];
  yearsExperience: number;
  verified: boolean;
  location: string;
  coverImage?: string;
  matchPercent?: number; // computed for current learner
  activeLearners: number;
  totalEarningsThisMonth?: number;
  packageId?: string; // backend training-package id this card derives from
}

export interface Admin extends UserBase {
  role: "admin";
  permissions: string[];
}

export type AnyUser = Learner | Coach | Admin;

// ============================================================================
// Sessions
// ============================================================================

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "pending_confirmation";

export interface Session {
  id: string;
  title: string;
  coachId: string;
  learnerId: string;
  bookingId?: string;
  start: string; // ISO datetime
  endTime?: string; // ISO datetime
  durationMinutes: number;
  status: SessionStatus;
  type: "1-on-1" | "Group" | "AI-Guided";
  notes?: string;
  location?: string;
  meetingUrl?: string;
  learnerNote?: string;
  coachNote?: string;
  price: number;
  aiPlan?: string; // optional AI suggestion preview
}

// ============================================================================
// Bookings / training plan / progress / assessment
// ============================================================================

export interface Booking {
  id: string;
  title: string;
  coachId: string;
  /** learnerId is returned by the backend but learnerName/avatar are not — use avatarFor(learnerId) as fallback */
  learnerId?: string;
  trainingPackageId?: string;
  totalSessions: number;
  /** Sessions in terminal "completed" state only. */
  completedSessions: number;
  /** Sessions that occupy a slot: requested + scheduled + completed + missed. Cancelled sessions free a slot. */
  usedSessions?: number;
  /** totalSessions - usedSessions. Use this (not totalSessions - completedSessions) to gate booking. */
  remainingSessions?: number;
  /** False when no slots remain or booking is not active. Primary gate for booking button visibility. */
  canBookSession?: boolean;
  /** Per-status session counts, e.g. { "scheduled": 2, "completed": 1 }. */
  sessionCountsByStatus?: Record<string, number>;
  status: string;
  totalAmount: number;
  /** ISO datetime when payment was confirmed. May be null for pending_payment bookings. */
  paidAt?: string;
  /** ISO datetime when the booking was cancelled. Only present for cancelled bookings. */
  cancelledAt?: string;
  /** ISO datetime when the booking was marked completed. Only present for completed bookings. */
  completedAt?: string;
  createdAt: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  intensity?: string;
  restSeconds?: number;
  notes?: string;
}

export interface PlanDay {
  id: string;
  dayNumber: number;
  title?: string;
  notes?: string;
  exercises: PlanExercise[];
}

export interface PlanWeek {
  id: string;
  weekNumber: number;
  focus?: string;
  notes?: string;
  days: PlanDay[];
}

export interface TrainingPlan {
  id: string;
  title?: string;
  goalType?: string;
  overview?: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  status?: string;
  isReadOnly?: boolean;
  readOnlyReason?: string;
  bookingExpiresAt?: string;
  weeks: PlanWeek[];
}

export interface ProgressCheckIn {
  id: string;
  checkInDate: string;
  weightKg?: number;
  bodyFatPercent?: number;
  waistCm?: number;
  energyLevel?: string;
  sleepQuality?: string;
  learnerNote?: string;
  coachFeedback?: string;
}

export interface LearnerAssessment {
  id?: string;
  goalType?: string;
  goalDescription?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  currentLevel?: string;
  healthNotes?: string;
  injuryNotes?: string;
  trainingHistory?: string;
  availableDaysPerWeek?: string;
  preferredSessionDurationMinutes?: number;
  equipmentAvailable?: string;
}

// ============================================================================
// Messages
// ============================================================================

export interface MessageThread {
  id: string;
  participantIds: string[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  isAI?: boolean;
  /** Display name of the other participant resolved from the backend. */
  otherName?: string;
  /** Avatar URL of the other participant, if available from the backend. */
  otherAvatarUrl?: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string; // 'ai' for AI assistant
  text: string;
  sentAt: string;
  isAI?: boolean;
  /** Whether the recipient has read this message (from backend `isRead`).
   *  Undefined when the source doesn't provide read state (e.g. AI / mock). */
  isRead?: boolean;
}

// ============================================================================
// Coach listings (training packages + posts)
// ============================================================================

export interface TrainingPackage {
  id: string;
  title: string;
  description?: string;
  price: number;
  sessionCount: number;
  durationDays: number;
  sport: Sport;
  level?: string;
  goalType?: string;
  status: string; // Draft / Pending / Approved / Active / Rejected
  isOnline: boolean;
  createdAt: string;
}

export interface CoachPost {
  id: string;
  title: string;
  description?: string;
  price: number;
  sport: Sport;
  status: string;
  isOnline: boolean;
  createdAt: string;
  imageUrls?: string[];
}

// ============================================================================
// Earnings / Analytics
// ============================================================================

export interface EarningPoint {
  month: string; // 'Jan', 'Feb'...
  gross: number;
  net: number;
  sessions: number;
}

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed"
  | "cancelled";

export interface Payout {
  id: string;
  coachId: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  date: string; // ISO
  method: string;
  payOsPayoutId?: string;
  payOsReferenceId?: string;
  payOsPayoutStatus?: string;
  failureReason?: string;
  adminNote?: string;
  processingAt?: string;
  paidAt?: string;
}

export interface PayoutAccount {
  id: string;
  payoutMethod?: string;
  bankName?: string;
  /** 6-digit Napas/VietQR BIN code (e.g. 970415). Required by the payout backend. */
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  status?: string; // backend verification status (Pending / Verified / Rejected)
}

export interface AnalyticsDailyPoint {
  date: string; // ISO date
  activeUsers: number;
  sessions: number;
  revenue: number;
}

// ============================================================================
// AI Insights
// ============================================================================

export interface AIInsight {
  id: string;
  audience: Role;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  severity?: "info" | "success" | "warning";
  createdAt: string;
}

// ============================================================================
// Progress
// ============================================================================

export interface ProgressMetric {
  id: string;
  learnerId: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export interface ProgressTrendPoint {
  week: string;
  score: number;
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  icon?: string;
}

// ============================================================================
// Availability Slots
// ============================================================================

export interface AvailabilitySlot {
  id: string;
  coachId: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  /**
   * "available" | "booked" | "cancelled"
   * NOTE: a group slot keeps status="available" while remainingParticipants > 0.
   * Do NOT treat "available" as "no one has booked yet" — check bookedParticipants.
   */
  status: "available" | "booked" | "cancelled" | string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  note?: string;
  createdAt: string;
  /** Max learners per slot. 1 = individual, >1 = group. */
  maxParticipants?: number;
  /** How many learners have already booked. May be >0 for an "available" group slot. */
  bookedParticipants?: number;
  /** Remaining open spots. 0 means fully booked even if status is still "available". */
  remainingParticipants?: number;
  /** True when no spots remain. Booking must be blocked regardless of status. */
  isFull?: boolean;
}

// ============================================================================
// Admin / Verification
// ============================================================================

export interface VerificationRequest {
  id: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  sport: Sport;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  documents: { id: string; name: string; type: string }[];
  notes?: string;
  /** Which moderation queue this item came from. */
  kind?: "training-package" | "post" | "payout-account";
  /** Real submission fields from the backend (present per kind). */
  title?: string;
  price?: number; // VND
  sessionCount?: number;
  durationDays?: number;
  level?: string;
  goalType?: string;
  isOnline?: boolean;
  location?: string;
}
