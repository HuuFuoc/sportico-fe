"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const STATUS_MAP: Record<
  string,
  { label: string; chip: string; icon: React.ElementType }
> = {
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

function BookingCard({ booking, index }: { booking: Booking; index: number }) {
  const { label, chip, icon: StatusIcon } = statusInfo(booking.status);
  const progress =
    booking.totalSessions > 0
      ? Math.round((booking.completedSessions / booking.totalSessions) * 100)
      : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: EASE }}
      className="group flex flex-col gap-4 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_rgba(53,37,205,0.2)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08]">
            <Dumbbell size={18} className="text-primary" />
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

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-on-surface-variant">Tiến độ buổi tập</span>
          <span className="font-semibold text-on-surface tabular-nums">
            {booking.completedSessions}/{booking.totalSessions} buổi
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] tabular-nums text-on-surface-variant">
          {progress}% hoàn thành
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3">
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
        <Link
          href={`/learner/plan?booking=${booking.id}`}
          className="inline-flex items-center gap-1 rounded-[8px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
        >
          Xem lộ trình
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </motion.article>
  );
}

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
  const otherBookings = useMemo(
    () => bookings.filter((b) => b.status?.toLowerCase() !== "active"),
    [bookings],
  );

  return (
    <AppShell role="learner" title="Gói tập của tôi">
      <div className="mx-auto max-w-[880px] space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
            Gói tập của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            Quản lý các gói tập đã mua, theo dõi tiến độ và truy cập lộ trình.
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
              href="/coaches"
              className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              Tìm huấn luyện viên
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {activeBookings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
              Đang học ({activeBookings.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeBookings.map((b, i) => (
                <BookingCard key={b.id} booking={b} index={i} />
              ))}
            </div>
          </section>
        )}

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
                  index={activeBookings.length + i}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
