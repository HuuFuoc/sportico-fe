"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  LayoutList,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn, formatCurrencyVnd, avatarFor } from "@/lib/utils";
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
    label: "Đã hủy",
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

function formatDateVi(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// MISSING BACKEND FIELD: BookingResponse.learnerName, BookingResponse.learnerAvatarUrl
// We use the learnerId to derive a display name and fetch profile via api.fetchUserProfile.
function learnerFallbackName(learnerId?: string): string {
  if (!learnerId) return "Học viên";
  return `HV #${learnerId.slice(0, 6).toUpperCase()}`;
}

// Priority badge: derived from booking DTO fields only.
function PriorityBadge({ booking }: { booking: Booking }) {
  const remaining = booking.totalSessions - booking.completedSessions;
  const s = booking.status.toLowerCase();

  if (s === "pending_payment") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
        <CreditCard size={10} />
        Chờ thanh toán
      </span>
    );
  }
  if (s === "active" && booking.completedSessions === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
        <AlertCircle size={10} />
        Mới bắt đầu
      </span>
    );
  }
  if (s === "active" && remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700">
        <CheckCircle2 size={10} />
        Đã hết buổi
      </span>
    );
  }
  return null;
}

function BookingCard({
  booking,
  index,
  profile,
  shouldAnimate,
}: {
  booking: Booking;
  index: number;
  profile?: { name: string; avatarUrl?: string } | null;
  shouldAnimate: boolean;
}) {
  const { label, chip, icon: StatusIcon } = statusInfo(booking.status);
  const progress =
    booking.totalSessions > 0
      ? Math.min(100, Math.round((booking.completedSessions / booking.totalSessions) * 100))
      : 0;
  const remaining = Math.max(0, booking.totalSessions - booking.completedSessions);
  const learnerId = booking.learnerId;
  const learnerAvatar = profile?.avatarUrl ?? avatarFor(learnerId ?? booking.id);
  const displayName = profile?.name ?? learnerFallbackName(learnerId);
  const isActive = booking.status?.toLowerCase() === "active";
  const paymentPaid = !!(booking.paidAt || isActive || booking.status?.toLowerCase() === "completed");

  return (
    <motion.article
      initial={shouldAnimate ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: Math.min(index * 0.05, 0.3), ease: EASE }}
      className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_rgba(53,37,205,0.15)]"
    >
      {/* Accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-[#7d6dff] to-[#c084fc]" />

      <div className="flex flex-col gap-3.5 p-5">
        {/* Learner identity row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={learnerAvatar}
              alt={displayName}
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-border-soft)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = avatarFor(booking.id);
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-on-surface">
                {displayName}
              </p>
              <p className="text-[11.5px] text-on-surface-variant">
                {booking.paidAt
                  ? `Thanh toán ${formatDateVi(booking.paidAt)}`
                  : `Đặt ${formatDateVi(booking.createdAt)}`}
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

        {/* Package name + amount */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-primary/[0.08]">
              <Users size={13} className="text-primary" />
            </div>
            <p className="truncate text-[13px] font-medium text-on-surface">
              {booking.title}
            </p>
          </div>
          {booking.totalAmount > 0 && (
            <p className="shrink-0 text-[12px] font-semibold tabular-nums text-on-surface-variant">
              {formatCurrencyVnd(booking.totalAmount)}
            </p>
          )}
        </div>

        {/* Session progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-on-surface-variant">Tiến độ buổi tập</span>
            <span className="tabular-nums font-semibold text-on-surface">
              {booking.completedSessions}/{booking.totalSessions} buổi
              {remaining > 0 && (
                <span className="ml-1 font-normal text-on-surface-variant">
                  · còn {remaining}
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Meta row: payment + date */}
        <div className="flex items-center gap-3 text-[11.5px] text-on-surface-variant">
          <span className={cn(
            "inline-flex items-center gap-1 font-semibold",
            paymentPaid ? "text-emerald-700" : "text-amber-700",
          )}>
            <CreditCard size={11} />
            {paymentPaid ? "Đã thanh toán" : "Chưa thanh toán"}
          </span>
          <span className="text-on-surface/20">·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            Ngày mua: {formatDateVi(booking.createdAt)}
          </span>
        </div>

        {/* Priority badge */}
        <PriorityBadge booking={booking} />

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3 mt-0.5">
          <span className="tabular-nums text-[12px] font-semibold text-on-surface-variant">
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
      </div>
    </motion.article>
  );
}

// ---- Summary cards ---------------------------------------------------------

function SummaryCards({
  bookings,
  shouldAnimate,
}: {
  bookings: Booking[];
  shouldAnimate: boolean;
}) {
  const active = bookings.filter((b) => b.status?.toLowerCase() === "active").length;
  const pending = bookings.filter((b) => b.status?.toLowerCase() === "pending_payment").length;
  const completed = bookings.filter((b) => b.status?.toLowerCase() === "completed").length;
  const needsPlan = bookings.filter(
    (b) => b.status?.toLowerCase() === "active" && b.completedSessions === 0,
  ).length;

  const cards = [
    {
      label: "Đang hoạt động",
      value: active,
      unit: "học viên",
      bg: "from-emerald-500/[0.07] to-emerald-400/[0.04]",
      iconBg: "from-emerald-500 to-emerald-400",
      icon: Users,
      valueColor: "text-emerald-700",
    },
    {
      label: "Chờ thanh toán",
      value: pending,
      unit: "gói",
      bg: "from-amber-500/[0.08] to-amber-400/[0.04]",
      iconBg: "from-amber-500 to-amber-400",
      icon: CreditCard,
      valueColor: "text-amber-700",
    },
    {
      label: "Mới bắt đầu",
      value: needsPlan,
      unit: "cần tạo lộ trình",
      bg: "from-primary/[0.07] to-[#7d6dff]/[0.04]",
      iconBg: "from-primary to-[#7d6dff]",
      icon: LayoutList,
      valueColor: "text-primary",
    },
    {
      label: "Hoàn thành",
      value: completed,
      unit: "gói",
      bg: "from-slate-500/[0.06] to-slate-400/[0.03]",
      iconBg: "from-slate-500 to-slate-400",
      icon: CheckCircle2,
      valueColor: "text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: i * 0.05, ease: EASE }}
          className={cn(
            "flex flex-col gap-2.5 rounded-[14px] border border-[var(--color-border-soft)] bg-gradient-to-br p-4",
            c.bg,
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br",
              c.iconBg,
            )}
          >
            <c.icon size={15} className="text-white" />
          </div>
          <div>
            <p className={cn("text-[24px] font-bold tabular-nums leading-none", c.valueColor)}>
              {c.value}
            </p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">{c.unit}</p>
          </div>
          <p className="text-[12px] font-medium text-on-surface">{c.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

const FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang học" },
  { value: "pending_payment", label: "Chờ thanh toán" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function CoachLearnersPage() {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoachBookings(), []);

  const allBookings = useMemo(() => bookingsData ?? [], [bookingsData]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Batch-fetch learner profiles for all unique learnerIds once bookings load.
  const [learnerProfiles, setLearnerProfiles] = useState<
    Map<string, { name: string; avatarUrl?: string }>
  >(new Map());

  useEffect(() => {
    if (!allBookings.length) return;
    const uniqueIds = [
      ...new Set(
        allBookings.map((b) => b.learnerId).filter((id): id is string => !!id),
      ),
    ];
    if (!uniqueIds.length) return;

    Promise.allSettled(
      uniqueIds.map((id) =>
        api.fetchUserProfile(id).then((profile) => ({ id, profile })),
      ),
    ).then((results) => {
      const m = new Map<string, { name: string; avatarUrl?: string }>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.profile) {
          m.set(r.value.id, r.value.profile);
        }
      }
      if (m.size) setLearnerProfiles(m);
    });
  }, [allBookings]);

  const bookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (statusFilter !== "all" && b.status?.toLowerCase() !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!b.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allBookings, query, statusFilter]);

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
        <motion.header
          initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: EASE }}
          className="flex flex-col gap-1"
        >
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
            Học viên của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            {allBookings.length} gói tập ·{" "}
            {allBookings.filter((b) => b.status?.toLowerCase() === "active").length} đang học
          </p>
        </motion.header>

        {/* Summary cards */}
        {allBookings.length > 0 && (
          <SummaryCards bookings={allBookings} shouldAnimate={shouldAnimate} />
        )}

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
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
              <BookingCard
                key={b.id}
                booking={b}
                index={i}
                profile={b.learnerId ? learnerProfiles.get(b.learnerId) : undefined}
                shouldAnimate={shouldAnimate}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
