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
  CoachWalletResponse,
  CoachWalletTransactionResponse,
  CurrentUserResponse,
  LearnerAssessmentResponse,
  NotificationResponse,
  PostResponse,
  ProgressCheckInResponse,
  PublicCoachDetailResponse,
  PublicCoachListItemResponse,
  TrainingPackageResponse,
  TrainingPlanResponse,
  TrainingSessionResponse,
  WithdrawalRequestResponse,
} from "@/lib/backend/dto";
import { avatarFor } from "@/lib/utils";

const SPORTS: Sport[] = [
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

/** Best-effort map of a backend sport name to the UI Sport union. */
export function toSport(name?: string | null): Sport {
  if (!name) return "Strength";
  const found = SPORTS.find((s) => s.toLowerCase() === name.trim().toLowerCase());
  return found ?? "Strength";
}

/** Short, stable display name derived from a coach id (no name endpoint). */
function coachDisplayName(coachId: string): string {
  return `Coach ${coachId.slice(0, 4).toUpperCase()}`;
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
export function bookingToUi(b: BookingResponse): Booking {
  return {
    id: b.id,
    title: b.trainingPackageTitle ?? "Gói huấn luyện",
    coachId: b.coachId,
    totalSessions: b.totalSessions,
    completedSessions: b.completedSessions,
    status: b.status ?? "Active",
    totalAmount: b.totalAmount,
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
    sport: toSport(p.sportName),
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
    sport: toSport(p.sportName),
    status: p.status ?? "Pending",
    isOnline: p.isOnline,
    createdAt: p.createdAt,
    imageUrls: p.imageUrls ?? undefined,
  };
}

// ---- Training session (+ booking context) → Session ------------------------
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
    case "pending":
    case "pendingconfirmation":
    case "pending_confirmation":
      return "pending_confirmation";
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
    start: s.startTime,
    durationMinutes: durationMinutes || 60,
    status: toSessionStatus(s.status),
    type: "1-on-1",
    notes: s.coachNote ?? s.learnerNote ?? undefined,
    location: s.location ?? (s.meetingUrl ? "Online" : undefined),
    price: booking?.perSessionCoachAmount ?? 0,
  };
}

// ---- Chat ------------------------------------------------------------------
export function roomToThread(
  r: ChatRoomResponse,
  meId: string | null,
  preview?: { text: string; at: string; unread: number },
): MessageThread {
  return {
    id: r.id,
    participantIds: [r.user1Id, r.user2Id].filter((id) => id !== meId),
    lastMessagePreview: preview?.text ?? "",
    lastMessageAt: preview?.at ?? r.createdAt,
    unreadCount: preview?.unread ?? 0,
  };
}

export function chatMessageToMessage(m: ChatMessageResponse): Message {
  return {
    id: m.id,
    threadId: m.roomId,
    senderId: m.senderId,
    text: m.content ?? "",
    sentAt: m.sentAt,
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
    gross: w.totalEarned,
    net: w.availableBalance + w.pendingBalance,
    sessions: 0,
  };
}

// ---- Withdrawals → Payout --------------------------------------------------
function toPayoutStatus(raw?: string | null): Payout["status"] {
  switch ((raw ?? "").toLowerCase()) {
    case "paid":
      return "paid";
    case "approved":
    case "processing":
      return "processing";
    case "rejected":
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

export function payoutAccountToUi(a: CoachPayoutAccountResponse): PayoutAccount {
  return {
    id: a.id,
    payoutMethod: a.payoutMethod ?? undefined,
    bankName: a.bankName ?? undefined,
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
  };
}

// ---- Admin moderation queues → VerificationRequest -------------------------
export function postToVerification(p: PostResponse): VerificationRequest {
  return {
    id: p.id,
    coachId: p.coachId,
    coachName: coachDisplayName(p.coachId),
    coachAvatar: avatarFor(p.coachId),
    sport: toSport(p.sportName),
    submittedAt: p.createdAt,
    status: "pending",
    documents: [{ id: p.id, name: p.title ?? "Bài đăng", type: "post" }],
    notes: p.description ?? undefined,
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
    sport: toSport(p.sportName),
    submittedAt: p.createdAt,
    status: "pending",
    documents: [
      { id: p.id, name: p.title ?? "Gói huấn luyện", type: "training-package" },
    ],
    notes: p.description ?? undefined,
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
  };
}
