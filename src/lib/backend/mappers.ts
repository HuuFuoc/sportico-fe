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
  LearnerAssessmentResponse,
  NotificationResponse,
  PostResponse,
  ProgressCheckInResponse,
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

// ---- Training package → Coach card -----------------------------------------
// Backend has no coach directory; we surface each public training package as a
// browsable "coach card" so the existing CoachCard UI keeps working.
export function packageToCoach(p: TrainingPackageResponse): Coach {
  const perSession = p.sessionCount > 0 ? p.price / p.sessionCount : p.price;
  return {
    id: p.coachId,
    packageId: p.id,
    name: coachDisplayName(p.coachId),
    avatarUrl: avatarFor(p.coachId),
    email: "",
    joinedAt: p.createdAt,
    role: "coach",
    headline: p.title ?? "Gói huấn luyện",
    bio: p.description ?? "",
    hourlyRate: Math.round(perSession),
    currency: "VND",
    rating: 0,
    reviewCount: 0,
    sport: toSport(p.sportName),
    specialties: [p.goalType, p.level].filter(Boolean) as string[],
    yearsExperience: 0,
    verified: p.status === "Approved" || p.status === "Active",
    location: p.location ?? (p.isOnline ? "Online" : ""),
    activeLearners: 0,
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
