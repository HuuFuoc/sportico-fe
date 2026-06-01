"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { BookSessionModal } from "@/components/common/BookSessionModal";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

// ---- Status config ---------------------------------------------------------

const STATUS_MAP: Record<string, { label: string; chip: string; icon: React.ElementType }> = {
  active: {
    label: "Đang học",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  completed: {
    label: "Hoàn thành",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Đã huỷ",
    chip: "bg-red-50 text-red-600 border-red-200",
    icon: XCircle,
  },
  pending_payment: {
    label: "Chờ thanh toán",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
};

function statusInfo(status: string) {
  return (
    STATUS_MAP[status?.toLowerCase()] ?? {
      label: status ?? "Không rõ",
      chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
      icon: BookOpen,
    }
  );
}

// ---- SyncPaymentButton ----------------------------------------------------

function SyncPaymentButton({ bookingId }: { bookingId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<"success" | "pending" | "error" | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      let orderCode: string | number | null = null;
      try {
        const raw = sessionStorage.getItem("pendingPayosPayment");
        if (raw) {
          const p = JSON.parse(raw) as { orderCode?: number; bookingId?: string };
          if (p.bookingId === bookingId && p.orderCode) orderCode = p.orderCode;
        }
      } catch { /**/ }

      if (!orderCode) {
        setResult("error");
        return;
      }
      const r = await api.reconcilePayment(orderCode);
      if (r.activated || r.bookingStatus?.toLowerCase() === "active") {
        setResult("success");
        try { sessionStorage.removeItem("pendingPayosPayment"); } catch { /**/ }
      } else {
        setResult("pending");
      }
    } catch {
      setResult("error");
    } finally {
      setSyncing(false);
    }
  }

  if (result === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
        <CheckCircle2 size={13} />
        Đã kích hoạt - tải lại trang để xem
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => void handleSync()}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
      >
        {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {syncing ? "Đang đồng bộ…" : "Đồng bộ thanh toán"}
      </button>
      {result === "pending" && (
        <p className="text-[11px] text-amber-700">Thanh toán đang xử lý. Thử lại sau vài phút.</p>
      )}
      {result === "error" && (
        <p className="text-[11px] text-red-600">Không tìm thấy mã đơn hàng. Vui lòng thử từ trang thanh toán.</p>
      )}
    </div>
  );
}

// ---- BookingCard ----------------------------------------------------------

function BookingCard({
  booking,
  index,
  onBookSession,
}: {
  booking: Booking;
  index: number;
  onBookSession: (b: Booking) => void;
}) {
  const { label, chip, icon: StatusIcon } = statusInfo(booking.status);
  const status = booking.status?.toLowerCase();
  const isActive = status === "active";
  const isPendingPayment = status === "pending_payment";
  const isTerminal = status === "completed" || status === "cancelled";

  const progress =
    booking.totalSessions > 0
      ? Math.round((booking.completedSessions / booking.totalSessions) * 100)
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: EASE }}
      className={cn(
        "group flex flex-col gap-4 rounded-[16px] border bg-surface-container-lowest p-5 transition-all",
        isActive
          ? "border-primary/20 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_28px_-12px_rgba(53,37,205,0.22)]"
          : "border-[var(--color-border-soft)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-10px_rgba(15,15,30,0.12)]",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
            isActive ? "bg-gradient-to-br from-primary/15 to-[#7d6dff]/10" : "bg-surface-container-low",
          )}>
            <Dumbbell size={18} className={isActive ? "text-primary" : "text-on-surface-variant"} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-on-surface">
              {booking.title}
            </p>
            <p className="text-[12px] text-on-surface-variant">
              Đặt ngày {new Date(booking.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            chip,
          )}
        >
          <StatusIcon size={12} />
          {label}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-on-surface-variant">Tiến độ buổi tập</span>
          <span className="font-semibold text-on-surface tabular-nums">
            {booking.completedSessions}/{booking.totalSessions} buổi
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isActive ? "bg-gradient-to-r from-primary to-[#7d6dff]" : "bg-on-surface/20",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] tabular-nums text-on-surface-variant">
          {progress}% hoàn thành
        </p>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border-soft)] pt-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[12px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} />
              {booking.totalSessions} buổi
            </span>
            {booking.totalAmount > 0 && (
              <span className="inline-flex items-center gap-1">
                <ShoppingBag size={13} />
                {new Intl.NumberFormat("vi-VN").format(booking.totalAmount)}đ
              </span>
            )}
          </div>

          {/* Primary CTA per status */}
          {isActive && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onBookSession(booking)}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] px-3.5 py-1.5 text-[12.5px] font-semibold text-on-primary shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <CalendarPlus size={13} />
                Đặt buổi tập
              </button>
              <Link
                href={`/learner/plan?booking=${booking.id}`}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-1.5 text-[12px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Lộ trình
                <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {!isActive && !isPendingPayment && !isTerminal && (
            <Link
              href={`/learner/plan?booking=${booking.id}`}
              className="inline-flex items-center gap-1 rounded-[8px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              Xem lộ trình
              <ArrowRight size={13} />
            </Link>
          )}

          {isTerminal && (
            <Link
              href={`/learner/plan?booking=${booking.id}`}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Xem lộ trình
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* Pending payment sync */}
        {isPendingPayment && <SyncPaymentButton bookingId={booking.id} />}

        {/* Learner prompt for active booking with no sessions yet */}
        {isActive && booking.completedSessions === 0 && booking.totalSessions > 0 && (
          <div className="flex items-start gap-2 rounded-[10px] bg-primary/[0.05] border border-primary/10 px-3 py-2 text-[12px] text-primary/80">
            <CalendarPlus size={13} className="mt-0.5 shrink-0" />
            <span>
              Nhấn <strong>Đặt buổi tập</strong> để chọn lịch với huấn luyện viên của bạn.
            </span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

// ---- Page -----------------------------------------------------------------

export default function LearnerBookingsPage() {
  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyBookings(), []);

  const bookings = useMemo(() => bookingsData ?? [], [bookingsData]);

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status?.toLowerCase() === "active"),
    [bookings],
  );
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status?.toLowerCase() === "pending_payment"),
    [bookings],
  );
  const otherBookings = useMemo(
    () => bookings.filter(
      (b) =>
        b.status?.toLowerCase() !== "active" &&
        b.status?.toLowerCase() !== "pending_payment",
    ),
    [bookings],
  );

  const [bookSessionTarget, setBookSessionTarget] = useState<Booking | null>(null);

  return (
    <AppShell role="learner" title="Gói tập của tôi">
      <div className="mx-auto max-w-[880px] space-y-6">
        {/* Page header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
            Gói tập của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            Quản lý các gói đã mua, đặt buổi tập, và theo dõi tiến độ của bạn.
          </p>
        </header>

        {loading && <LoadingState label="Đang tải gói tập…" />}
        {error && (
          <ErrorState
            message="Không tải được danh sách gói tập."
            onRetry={refetch}
            className="mx-auto max-w-md"
          />
        )}

        {/* Empty */}
        {!loading && !error && bookings.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low">
              <ShoppingBag size={24} className="text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-on-surface">
                Chưa có gói tập nào
              </p>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Khám phá các huấn luyện viên và chọn gói tập phù hợp với bạn.
              </p>
            </div>
            <Link
              href="/learner/coaches"
              className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              Tìm huấn luyện viên
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Pending payment */}
        {pendingBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-amber-600">
              Chờ thanh toán ({pendingBookings.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingBookings.map((b, i) => (
                <BookingCard key={b.id} booking={b} index={i} onBookSession={setBookSessionTarget} />
              ))}
            </div>
          </section>
        )}

        {/* Active bookings */}
        {activeBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-emerald-700">
              Đang học ({activeBookings.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeBookings.map((b, i) => (
                <BookingCard key={b.id} booking={b} index={i} onBookSession={setBookSessionTarget} />
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {otherBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
              Lịch sử ({otherBookings.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {otherBookings.map((b, i) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  index={activeBookings.length + pendingBookings.length + i}
                  onBookSession={setBookSessionTarget}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Book Session Modal */}
      <AnimatePresence>
        {bookSessionTarget && (
          <BookSessionModal
            booking={bookSessionTarget}
            onClose={() => setBookSessionTarget(null)}
            onBooked={() => {
              setBookSessionTarget(null);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
