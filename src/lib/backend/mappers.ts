// ============================================================================
// Adapters: backend DTOs → UI domain types (`src/types`). These let the
// existing pages keep rendering unchanged while reading real backend data.
//
// Where the backend has no field the UI expects (coach avatar/name, ratings,
// monthly series), we derive a sensible value or a deterministic placeholder.
// ============================================================================

import type {
  Coach,
  EarningPoint,
  Message,
  MessageThread,
  NotificationItem,
  Payout,
  Session,
  SessionStatus,
  Sport,
  VerificationRequest,
} from "@/types";
import type {
  BookingResponse,
  ChatMessageResponse,
  ChatRoomResponse,
  CoachPayoutAccountResponse,
  CoachWalletResponse,
  CoachWalletTransactionResponse,
  NotificationResponse,
  PostResponse,
  TrainingPackageResponse,
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
