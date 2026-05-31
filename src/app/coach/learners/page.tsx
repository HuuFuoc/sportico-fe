"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Dumbbell,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const BOOKING_STATUS: Record<
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
  const s = (status ?? "").toLowerCase();
  return (
    BOOKING_STATUS[s] ?? {
      label: status || "Không rõ",
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.05, ease: EASE }}
      className="flex flex-col gap-4 rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_rgba(53,37,205,0.18)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08]">
            <Users size={18} className="text-primary" />
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
          <StatusIcon size={11} />
          {label}
        </span>
      </div>

      {/* Session progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-on-surface-variant">Tiến độ buổi tập</span>
          <span className="tabular-nums font-semibold text-on-surface">
            {booking.completedSessions}/{booking.totalSessions} buổi
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3">
        <span className="text-[12px] text-on-surface-variant">
          {progress}% hoàn thành
        </span>
        <Link
          href={`/coach/learners/${booking.id}`}
          className="inline-flex items-center gap-1 rounded-[8px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
        >
          Xem chi tiết
          <ArrowRight size={13} />
        </Link>
      </div>
    </motion.article>
  );
}

export default function CoachLearnersPage() {
  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoachBookings(), []);

  const allBookings = useMemo(() => bookingsData ?? [], [bookingsData]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (
        statusFilter !== "all" &&
        b.status?.toLowerCase() !== statusFilter
      )
        return false;
      if (query) {
        const q = query.toLowerCase();
        if (!b.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allBookings, query, statusFilter]);

  const activeCount = useMemo(
    () =>
      allBookings.filter((b) => b.status?.toLowerCase() === "active").length,
    [allBookings],
  );

  if (loading) {
    return (
      <AppShell role="coach" title="Học viên">
        <LoadingState label="Đang tải danh sách học viên…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Học viên">
        <ErrorState
          message="Không tải được danh sách học viên."
          onRetry={refetch}
          className="mx-auto mt-10 max-w-md"
        />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="Học viên">
      <div className="mx-auto max-w-[1000px] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
            Học viên của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            {allBookings.length} gói tập · {activeCount} đang học
          </p>
        </header>

        {/* Search + filter row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 transition-colors focus-within:border-primary">
            <Search size={16} className="shrink-0 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm theo tên gói tập…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-on-surface-variant"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 cursor-pointer appearance-none rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest pl-3 pr-8 text-[13px] font-medium text-on-surface outline-none transition-colors hover:border-primary/40 focus:border-primary"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang học</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã huỷ</option>
          </select>
        </div>

        {/* Results grid */}
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low">
              <Dumbbell size={24} className="text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-on-surface">
                {allBookings.length === 0
                  ? "Chưa có học viên nào"
                  : "Không tìm thấy kết quả"}
              </p>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                {allBookings.length === 0
                  ? "Học viên sẽ xuất hiện ở đây sau khi mua gói tập của bạn."
                  : "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {bookings.map((b, i) => (
              <BookingCard key={b.id} booking={b} index={i} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
