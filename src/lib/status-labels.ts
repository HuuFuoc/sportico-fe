// ============================================================================
// Centralised Vietnamese status labels + presentation tokens for the
// fixed-schedule booking model. One source of truth so the learner calendar,
// coach calendar, bookings list and detail modals stay in sync.
//
// Business model (Bookings API):
//   • Learner buys a fixed-schedule training package.
//   • Backend reserves slots and auto-creates TrainingSessions (status
//     "scheduled") once the booking is paid/active. There is NO manual
//     learner-initiated session booking.
//   • Coaches are paid per COMPLETED session — never on purchase.
// ============================================================================

import type { BookingStatus, SessionStatus } from "@/types";

export interface StatusToken {
  label: string;
  /** Tailwind classes for a pill/chip (bg + text + border). */
  chip: string;
  /** Tailwind class for a small status dot. */
  dot: string;
}

// ---- Booking statuses ------------------------------------------------------

export const BOOKING_STATUS: Record<BookingStatus, StatusToken> = {
  pending_payment: {
    label: "Chờ thanh toán",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  active: {
    label: "Đang hoạt động",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Đã hoàn thành",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  cancelled: {
    label: "Đã hủy",
    chip: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
  refunded: {
    label: "Đã hoàn tiền",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-400",
  },
};

const FALLBACK: StatusToken = {
  label: "Không rõ",
  chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
  dot: "bg-on-surface-variant",
};

/** Resolve a (possibly raw/cased) booking status string to its VI token. */
export function bookingStatus(raw?: string | null): StatusToken {
  const key = (raw ?? "").toLowerCase() as BookingStatus;
  return BOOKING_STATUS[key] ?? { ...FALLBACK, label: raw || FALLBACK.label };
}

// ---- Session statuses ------------------------------------------------------
// Auto-created sessions arrive as "scheduled". "pending_confirmation" is a
// legacy state kept only for defensive display — the new model never creates it.

export const SESSION_STATUS: Record<SessionStatus, StatusToken> = {
  scheduled: {
    label: "Sắp diễn ra",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Đang diễn ra",
    chip: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  completed: {
    label: "Đã hoàn thành",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Đã hủy",
    chip: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
  pending_confirmation: {
    label: "Chờ xác nhận",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
};

/** Resolve a (possibly raw/cased) session status string to its VI token. */
export function sessionStatus(raw?: string | null): StatusToken {
  const key = (raw ?? "").toLowerCase() as SessionStatus;
  return SESSION_STATUS[key] ?? { ...FALLBACK, label: raw || FALLBACK.label };
}
