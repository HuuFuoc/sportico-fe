// ============================================================================
// Adapters: backend DTOs → UI domain types (`src/types`). These let the
// existing pages keep rendering unchanged while reading real backend data.
//
// Where the backend has no field the UI expects (coach avatar/name, ratings,
// monthly series), we derive a sensible value or a deterministic placeholder.
// ============================================================================

import type {
  Booking,
  Coach,
  CoachPost,
  EarningPoint,
  Learner,
  LearnerAssessment,
  Message,
  MessageThread,
  NotificationItem,
  Payout,
  PayoutAccount,
  ProgressCheckIn,
  Review,
  ReviewReport,
  ReviewSummary,
  Session,
  SessionStatus,
  Sport,
  TrainingPackage,
  TrainingPlan,
  VerificationRequest,
} from "@/types";
import type {
  BookingResponse,
  ChatMessageResponse,
  ChatRoomResponse,
  CoachPayoutAccountResponse,
  CoachReviewSummaryResponse,
  CoachWalletResponse,
  CoachWalletTransactionResponse,
  CurrentUserResponse,
  LearnerAssessmentResponse,
  NotificationResponse,
  PostResponse,
  ProgressCheckInResponse,
  PublicCoachDetailResponse,
  PublicCoachListItemResponse,
  PublicUserResponseDto,
  ReviewReportResponse,
  ReviewResponse,
  TrainingPackageResponse,
  TrainingPlanResponse,
  TrainingSessionResponse,
  WithdrawalRequestResponse,
} from "@/lib/backend/dto";
import { avatarFor } from "@/lib/utils";

const SPORTS: Sport[] = [
  "Badminton",
  "Pickleball",
  "Tennis",
  "Yoga",
  "HIIT",
  "Strength",
  "Running",
  "Swimming",
  "Boxing",
  "Pilates",
  "Cycling",
  "Basketball",
  "Football",
  "Golf",
  "Mindfulness",
];

/** Vietnamese → Sport enum. Handles backends that return Vietnamese sport names. */
const VI_TO_SPORT: Record<string, Sport> = {
  "cầu lông": "Badminton",
  "cau long": "Badminton",
  "pickleball": "Pickleball",
  "quần vợt": "Tennis",
  "quan vot": "Tennis",
  "yoga": "Yoga",
  "hiit": "HIIT",
  "sức mạnh": "Strength",
  "suc manh": "Strength",
  "chạy bộ": "Running",
  "chay bo": "Running",
  "bơi lội": "Swimming",
  "boi loi": "Swimming",
  "quyền anh": "Boxing",
  "quyen anh": "Boxing",
  "pilates": "Pilates",
  "đạp xe": "Cycling",
  "dap xe": "Cycling",
  "bóng rổ": "Basketball",
  "bong ro": "Basketball",
  "bóng đá": "Football",
  "bong da": "Football",
  "golf": "Golf",
  "thiền": "Mindfulness",
  "mindfulness": "Mindfulness",
};

/** Best-effort map of a backend sport name to the UI Sport union.
 *  Handles both English ("Badminton") and Vietnamese ("Cầu lông") names.
 *  Returns null when the backend sent no sport data or an unrecognised name. */
export function toSport(name?: string | null): Sport | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  const byEnum = SPORTS.find((s) => s.toLowerCase() === lower);
  if (byEnum) return byEnum;
  return VI_TO_SPORT[lower] ?? null;
}

/** Short, stable display name derived from a coach id (no name endpoint). */
function coachDisplayName(coachId: string): string {
  return `Coach ${coachId.slice(0, 4).toUpperCase()}`;
}

// ---- Public user profile (GET /api/users/{id}) → UI mini-profile ------------

/** UI shape for a public user resolved from GET /api/users/{id}. */
export interface PublicUserUi {
  name: string;
  avatarUrl?: string;
  roles: string[];
  /** Coach-only: short bio headline. */
  headline?: string;
  /** Coach-only: average rating (null → not yet rated). */
  rating?: number;
  /** Coach-only: total review count. */
  totalReviews: number;
  /** Learner-only: training goal. */
  goal?: string;
}

/**
 * Map GET /api/users/{id} response to a safe, display-ready shape.
 * All fields defensive: null/missing → sensible defaults.
 * NEVER exposes email, phone, dateOfBirth, status, tokens.
 */
export function publicUserToUi(u: PublicUserResponseDto): PublicUserUi {
  return {
    name: u.fullName?.trim() || "Người dùng",
    avatarUrl: u.avatarUrl ?? undefined,
    roles: u.roles ?? [],
    headline: u.coachProfile?.headline?.trim() || undefined,
    rating:
      u.coachProfile?.rating != null && u.coachProfile.rating > 0
        ? u.coachProfile.rating
        : undefined,
    totalReviews: u.coachProfile?.totalReviews ?? 0,
    goal: u.learnerProfile?.goal?.trim() || undefined,
  };
}

// ---- Public coach directory → Coach ----------------------------------------

function joinLocation(city?: string | null, district?: string | null): string {
  return [district?.trim(), city?.trim()].filter(Boolean).join(", ");
}

function splitSpecialties(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Cheapest per-session price across packages that are still bookable. */
function pickActivePackage(
  pkgs: NonNullable<PublicCoachDetailResponse["trainingPackages"]>,
) {
  const bookable = pkgs.filter((p) => {
    const s = (p.status ?? "").toLowerCase();
    // Accept both the real backend status ("published") and legacy values
    // ("approved", "active") so the picker survives any future enum changes.
    return !s || s === "published" || s === "approved" || s === "active";
  });
  if (bookable.length === 0) return undefined;
  return bookable.reduce((cheapest, p) => {
    const a = cheapest.sessionCount > 0
      ? cheapest.price / cheapest.sessionCount
      : cheapest.price;
    const b = p.sessionCount > 0 ? p.price / p.sessionCount : p.price;
    return b < a ? p : cheapest;
  });
}

export function publicCoachListItemToCoach(
  c: PublicCoachListItemResponse,
): Coach {
  const location = joinLocation(c.teachingCity, c.teachingDistrict);
  return {
    id: c.coachId,
    name: c.fullName?.trim() || coachDisplayName(c.coachId),
    avatarUrl: c.avatarUrl || avatarFor(c.coachId),
    email: "",
    joinedAt: "",
    role: "coach",
    headline: c.headline?.trim() || "Huấn luyện viên Sportico",
    bio: c.bio ?? "",
    hourlyRate: 0,
    currency: "VND",
    rating: c.rating ?? 0,
    reviewCount: c.totalReviews ?? 0,
    sport: toSport(c.sports?.[0]?.name),
    specialties: splitSpecialties(c.specialties),
    yearsExperience: c.experienceYears ?? 0,
    verified: true,
    location: location || (c.isOnlineAvailable ? "Online" : ""),
    coverImage: c.coverImageUrl ?? undefined,
    activeLearners: 0,
  };
}

// ---- Current user → UI Learner ---------------------------------------------
// Backend `CurrentUserResponse` only carries identity fields (fullName, email,
// avatarUrl). The UI `Learner` shape needs sport preferences, streak, goals etc.
// We merge real backend identity over a sensible default so the page renders.
export function currentUserToLearner(
  u: CurrentUserResponse,
  fallback?: Partial<Learner>,
): Learner {
  return {
    id: u.id,
    name: u.fullName?.trim() || fallback?.name || "Học viên Sportico",
    avatarUrl: u.avatarUrl || fallback?.avatarUrl || avatarFor(u.id),
    email: u.email,
    joinedAt: fallback?.joinedAt ?? "",
    role: "learner",
    totalHoursTrained: fallback?.totalHoursTrained ?? 0,
    upcomingSessions: fallback?.upcomingSessions ?? 0,
    streakDays: fallback?.streakDays ?? 0,
    goals: fallback?.goals ?? [],
    preferredSports: fallback?.preferredSports ?? [],
    matchRate: fallback?.matchRate,
  };
}

export function publicCoachDetailToCoach(c: PublicCoachDetailResponse): Coach {
  const base = publicCoachListItemToCoach(c);
  const cheapest = pickActivePackage(c.trainingPackages ?? []);
  const perSession = cheapest
    ? cheapest.sessionCount > 0
      ? cheapest.price / cheapest.sessionCount
      : cheapest.price
    : 0;
  return {
    ...base,
    hourlyRate: Math.round(perSession),
    location: base.location || c.teachingAddress || "",
    packageId: cheapest?.id,
  };
}

// ---- Booking → UI ----------------------------------------------------------

/** Guard against numeric-only titles — happens when backend sends totalAmount
 *  or another numeric field as trainingPackageTitle due to a mapping bug. */
function safePackageTitle(raw?: string | null): string {
  if (!raw) return "Gói tập chưa có tên";
  const trimmed = raw.trim();
  if (!trimmed) return "Gói tập chưa có tên";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return "Gói tập chưa có tên";
  return trimmed;
}

export function bookingToUi(b: BookingResponse): Booking {
  return {
    id: b.id,
    title: safePackageTitle(b.trainingPackageTitle),
    coachId: b.coachId,
    learnerId: b.learnerId,
    trainingPackageId: b.trainingPackageId,
    totalSessions: b.totalSessions,
    completedSessions: b.completedSessions,
    usedSessions: b.usedSessions,
    remainingSessions: b.remainingSessions,
    canBookSession: b.canBookSession,
    sessionCountsByStatus: b.sessionCountsByStatus ?? undefined,
    status: b.status ?? "Active",
    totalAmount: b.totalAmount,
    paidAt: b.paidAt ?? undefined,
    cancelledAt: b.cancelledAt ?? undefined,
    completedAt: b.completedAt ?? undefined,
    createdAt: b.createdAt,
  };
}

// ---- Training plan → UI ----------------------------------------------------
export function trainingPlanToUi(p: TrainingPlanResponse): TrainingPlan {
  return {
    id: p.id,
    title: p.title ?? undefined,
    goalType: p.goalType ?? undefined,
    overview: p.overview ?? undefined,
    startDate: p.startDate,
    endDate: p.endDate,
    totalWeeks: p.totalWeeks,
    status: p.status ?? undefined,
    isReadOnly: p.isReadOnly,
    readOnlyReason: p.readOnlyReason ?? undefined,
    bookingExpiresAt: p.bookingExpiresAt ?? undefined,
    weeks: (p.weeks ?? []).map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      focus: w.focus ?? undefined,
      notes: w.notes ?? undefined,
      days: (w.days ?? []).map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        title: d.title ?? undefined,
        notes: d.notes ?? undefined,
        exercises: (d.exercises ?? []).map((e) => ({
          id: e.id,
          name: e.exerciseName ?? "Bài tập",
          sets: e.sets ?? undefined,
          reps: e.reps ?? undefined,
          intensity: e.intensity ?? undefined,
          restSeconds: e.restSeconds ?? undefined,
          notes: e.notes ?? undefined,
        })),
      })),
    })),
  };
}

// ---- Progress check-in → UI ------------------------------------------------
export function progressCheckInToUi(c: ProgressCheckInResponse): ProgressCheckIn {
  return {
    id: c.id,
    checkInDate: c.checkInDate,
    weightKg: c.weightKg ?? undefined,
    bodyFatPercent: c.bodyFatPercent ?? undefined,
    waistCm: c.waistCm ?? undefined,
    energyLevel: c.energyLevel ?? undefined,
    sleepQuality: c.sleepQuality ?? undefined,
    learnerNote: c.learnerNote ?? undefined,
    coachFeedback: c.coachFeedback ?? undefined,
  };
}

// ---- Learner assessment → UI -----------------------------------------------
export function assessmentToUi(a: LearnerAssessmentResponse): LearnerAssessment {
  return {
    id: a.id,
    goalType: a.goalType ?? undefined,
    goalDescription: a.goalDescription ?? undefined,
    heightCm: a.heightCm ?? undefined,
    weightKg: a.weightKg ?? undefined,
    bodyFatPercent: a.bodyFatPercent ?? undefined,
    currentLevel: a.currentLevel ?? undefined,
    healthNotes: a.healthNotes ?? undefined,
    injuryNotes: a.injuryNotes ?? undefined,
    trainingHistory: a.trainingHistory ?? undefined,
    availableDaysPerWeek: a.availableDaysPerWeek ?? undefined,
    preferredSessionDurationMinutes: a.preferredSessionDurationMinutes ?? undefined,
    equipmentAvailable: a.equipmentAvailable ?? undefined,
  };
}

// ---- Coach's own listings (packages + posts) -------------------------------
export function packageToUi(p: TrainingPackageResponse): TrainingPackage {
  return {
    id: p.id,
    title: p.title ?? "Gói huấn luyện",
    description: p.description ?? undefined,
    price: p.price,
    sessionCount: p.sessionCount,
    durationDays: p.durationDays,
    sport: toSport(p.sportName) ?? "Strength",
    level: p.level ?? undefined,
    goalType: p.goalType ?? undefined,
    status: p.status ?? "Pending",
    isOnline: p.isOnline,
    createdAt: p.createdAt,
  };
}

export function postToUi(p: PostResponse): CoachPost {
  return {
    id: p.id,
    title: p.title ?? "Bài đăng",
    description: p.description ?? undefined,
    price: p.price,
    sport: toSport(p.sportName) ?? "Strength",
    status: p.status ?? "Pending",
    isOnline: p.isOnline,
    createdAt: p.createdAt,
    imageUrls: p.imageUrls ?? undefined,
  };
}

// ---- Training session (+ booking context) → Session ------------------------
// Backend status vocabulary (confirmed against the live API):
//   "requested"  → new session, awaiting coach confirmation
//   "scheduled"  → coach confirmed
//   "completed"  → session done
//   "cancelled"  → cancelled by coach or learner
// We also tolerate a few legacy/alias spellings defensively.
function toSessionStatus(raw?: string | null): SessionStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    case "requested":
    case "pending":
    case "pendingconfirmation":
    case "pending_confirmation":
      return "pending_confirmation";
    case "scheduled":
    case "confirmed":
      return "scheduled";
    default:
      return "scheduled";
  }
}

export function sessionToSession(
  s: TrainingSessionResponse,
  booking?: BookingResponse,
): Session {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  return {
    id: s.id,
    title: booking?.trainingPackageTitle ?? "Buổi tập",
    coachId: s.coachId,
    learnerId: s.learnerId,
    bookingId: s.bookingId,
    start: s.startTime,
    endTime: s.endTime,
    durationMinutes: durationMinutes || 60,
    status: toSessionStatus(s.status),
    type: "1-on-1",
    notes: s.coachNote ?? s.learnerNote ?? undefined,
    location: s.location ?? (s.meetingUrl ? "Online" : undefined),
    meetingUrl: s.meetingUrl ?? undefined,
    learnerNote: s.learnerNote ?? undefined,
    coachNote: s.coachNote ?? undefined,
    price: booking?.perSessionCoachAmount ?? 0,
  };
}

// ---- Chat ------------------------------------------------------------------
export function roomToThread(
  r: ChatRoomResponse,
  meId: string | null,
  preview?: { text: string; at: string; unread: number },
  participant?: { name?: string; avatarUrl?: string | null },
): MessageThread {
  return {
    id: r.id,
    participantIds: [r.user1Id, r.user2Id].filter((id) => id !== meId),
    lastMessagePreview: preview?.text ?? "",
    lastMessageAt: preview?.at ?? r.createdAt,
    unreadCount: preview?.unread ?? 0,
    otherName: participant?.name ?? undefined,
    otherAvatarUrl: participant?.avatarUrl ?? undefined,
  };
}

export function chatMessageToMessage(m: ChatMessageResponse): Message {
  return {
    id: m.id,
    threadId: m.roomId,
    senderId: m.senderId,
    text: m.content ?? "",
    sentAt: m.sentAt,
    isRead: m.isRead,
  };
}

// ---- Notifications ---------------------------------------------------------
export function notificationToItem(n: NotificationResponse): NotificationItem {
  return {
    id: n.id,
    title: n.title ?? "Thông báo",
    body: n.content ?? "",
    createdAt: n.createdAt,
    read: n.isRead,
  };
}

// ---- Coach earnings (wallet + transactions) --------------------------------
const MONTHS_VI = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

/** Build a monthly gross/net series from wallet credit transactions. */
export function transactionsToEarnings(
  txns: CoachWalletTransactionResponse[],
): EarningPoint[] {
  const byMonth = new Map<number, EarningPoint>();
  for (const t of txns) {
    const isCredit = (t.direction ?? "").toLowerCase().includes("credit");
    if (!isCredit) continue;
    const month = new Date(t.createdAt).getMonth();
    const point = byMonth.get(month) ?? {
      month: MONTHS_VI[month],
      gross: 0,
      net: 0,
      sessions: 0,
    };
    point.gross += t.amount;
    point.net += t.amount;
    point.sessions += 1;
    byMonth.set(month, point);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

export function walletToTotal(w: CoachWalletResponse) {
  return {
    totalEarned: w.totalEarned,
    availableBalance: w.availableBalance,
    pendingBalance: w.pendingBalance,
    totalWithdrawn: w.totalWithdrawn,
    sessions: 0,
  };
}

// ---- Withdrawals → Payout --------------------------------------------------
function toPayoutStatus(raw?: string | null): Payout["status"] {
  switch ((raw ?? "").toLowerCase()) {
    case "paid":
      return "paid";
    case "approved":
      return "approved";
    case "processing":
      return "processing";
    case "rejected":
      return "rejected";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function payoutAccountToUi(a: CoachPayoutAccountResponse): PayoutAccount {
  return {
    id: a.id,
    payoutMethod: a.payoutMethod ?? undefined,
    bankName: a.bankName ?? undefined,
    bankBin: a.bankBin ?? undefined,
    bankAccountNumber: a.bankAccountNumber ?? undefined,
    bankAccountHolder: a.bankAccountHolder ?? undefined,
    status: a.status ?? undefined,
  };
}

export function withdrawalToPayout(w: WithdrawalRequestResponse): Payout {
  return {
    id: w.id,
    coachId: w.coachId,
    amount: w.amount,
    currency: "VND",
    status: toPayoutStatus(w.status),
    date: w.createdAt,
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: w.payOsPayoutId ?? undefined,
    payOsReferenceId: w.payOsReferenceId ?? undefined,
    payOsPayoutStatus: w.payOsPayoutStatus ?? undefined,
    failureReason: w.failureReason ?? undefined,
    adminNote: w.adminNote ?? undefined,
    processingAt: w.processingAt ?? undefined,
    paidAt: w.paidAt ?? undefined,
  };
}

// ---- Admin moderation queues → VerificationRequest -------------------------
export function postToVerification(p: PostResponse): VerificationRequest {
  return {
    id: p.id,
    coachId: p.coachId,
    coachName: coachDisplayName(p.coachId),
    coachAvatar: avatarFor(p.coachId),
    sport: toSport(p.sportName) ?? "Strength",
    submittedAt: p.createdAt,
    status: "pending",
    documents: [{ id: p.id, name: p.title ?? "Bài đăng", type: "post" }],
    notes: p.description ?? undefined,
    kind: "post",
    title: p.title ?? undefined,
    price: p.price,
    isOnline: p.isOnline,
    location: p.location ?? undefined,
  };
}

export function trainingPackageToVerification(
  p: TrainingPackageResponse,
): VerificationRequest {
  return {
    id: p.id,
    coachId: p.coachId,
    coachName: coachDisplayName(p.coachId),
    coachAvatar: avatarFor(p.coachId),
    sport: toSport(p.sportName) ?? "Strength",
    submittedAt: p.createdAt,
    status: "pending",
    documents: [
      { id: p.id, name: p.title ?? "Gói huấn luyện", type: "training-package" },
    ],
    notes: p.description ?? undefined,
    kind: "training-package",
    title: p.title ?? undefined,
    price: p.price,
    sessionCount: p.sessionCount,
    durationDays: p.durationDays,
    level: p.level ?? undefined,
    goalType: p.goalType ?? undefined,
    isOnline: p.isOnline,
    location: p.location ?? undefined,
  };
}

export function payoutAccountToVerification(
  a: CoachPayoutAccountResponse,
): VerificationRequest {
  return {
    id: a.id,
    coachId: a.coachId,
    coachName: coachDisplayName(a.coachId),
    coachAvatar: avatarFor(a.coachId),
    sport: "Strength",
    submittedAt: a.createdAt,
    status: "pending",
    documents: [
      {
        id: a.id,
        name: `${a.bankName ?? "Ngân hàng"} • ${a.bankAccountNumber ?? ""}`,
        type: "payout-account",
      },
    ],
    notes: a.bankAccountHolder ?? undefined,
    kind: "payout-account",
    title: `${a.bankName ?? "Ngân hàng"} • ${a.bankAccountNumber ?? ""}`,
  };
}

// ---- Reviews ---------------------------------------------------------------

export function reviewToUi(r: ReviewResponse): Review {
  return {
    id: r.id,
    coachId: r.coachId,
    learnerId: r.learnerId ?? "",
    rating: r.rating,
    comment: r.comment ?? undefined,
    status: r.status ?? "active",
    canEdit: r.canEdit ?? false,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? undefined,
    learnerName: r.reviewer?.fullName ?? undefined,
    learnerAvatarUrl: r.reviewer?.avatarUrl ?? undefined,
  };
}

export function reviewSummaryToUi(r: CoachReviewSummaryResponse): ReviewSummary {
  return {
    averageRating: r.averageRating,
    totalReviews: r.totalReviews,
    ratingBreakdown: r.ratingBreakdown ?? {},
  };
}

export function reviewReportToUi(r: ReviewReportResponse): ReviewReport {
  // The backend flattens the reported review into review* sibling fields (no
  // nested `review` object). Rebuild the UI snapshot from those when present so
  // admins can see the actual review they are moderating.
  const hasReviewSnapshot =
    r.reviewId != null || r.reviewRating != null || r.reviewComment != null;
  return {
    id: r.id,
    reporterId: r.reporterId ?? undefined,
    status: r.status,
    reason: r.reason ?? "",
    description: r.description ?? undefined,
    actionTaken: r.actionTaken ?? undefined,
    resolutionNote: r.resolutionNote ?? undefined,
    handledAt: r.handledAt ?? undefined,
    createdAt: r.createdAt ?? new Date().toISOString(),
    reviewSnapshot: hasReviewSnapshot
      ? {
          id: r.reviewId ?? "",
          coachId: r.reviewCoachId ?? "",
          learnerId: r.reviewLearnerId ?? "",
          rating: r.reviewRating ?? 0,
          comment: r.reviewComment ?? undefined,
          status: r.reviewStatus ?? "active",
          canEdit: false,
          // Backend doesn't send a separate review timestamp here; fall back to
          // the report's createdAt so the snapshot still shows a date.
          createdAt: r.createdAt ?? new Date().toISOString(),
        }
      : undefined,
  };
}
