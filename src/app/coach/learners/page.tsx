"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn, formatCurrency, avatarFor } from "@/lib/utils";
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

// Derive a short display name from learnerId when learnerName is not returned by backend.
// MISSING BACKEND FIELD: BookingResponse.learnerName, BookingResponse.learnerAvatarUrl
function learnerDisplayName(learnerId?: string): string {
  if (!learnerId) return "Học viên";
  return `HV #${learnerId.slice(0, 6).toUpperCase()}`;
}

// Priority badge: derived from booking DTO fields only (no extra API calls on list page).
function PriorityBadge({ booking }: { booking: Booking }) {
  const remaining = booking.totalSessions - booking.completedSessions;
  const s = booking.status.toLowerCase();

  if (s === "pending_payment") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
        <CreditCard size={10} />
        Chờ thanh toán
      </span>
    );
  }
  if (s === "active" && booking.completedSessions === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
        <AlertCircle size={10} />
        Mới bắt đầu
      </span>
    );
  }
  if (s === "active" && remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10.5px] font-semibold text-violet-700">
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
}: {
  booking: Booking;
  index: number;
  profile?: { name: string; avatarUrl?: string } | null;
}) {
  const { label, chip, icon: StatusIcon } = statusInfo(booking.status);
  const progress =
    booking.totalSessions > 0
      ? Math.min(
          100,
          Math.round((booking.completedSessions / booking.totalSessions) * 100),
        )
      : 0;
  const remaining = booking.totalSessions - booking.completedSessions;
  const learnerId = booking.learnerId;
  const learnerAvatar = profile?.avatarUrl ?? avatarFor(learnerId ?? booking.id);
  const displayName = profile?.name ?? learnerDisplayName(learnerId);
  const dateDisplay = booking.paidAt
    ? `Thanh toán ${new Date(booking.paidAt).toLocaleDateString("vi-VN")}`
    : `Đặt ${new Date(booking.createdAt).toLocaleDateString("vi-VN")}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.05, ease: EASE }}
      className="flex flex-col gap-0 rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_rgba(53,37,205,0.18)]"
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-[#7d6dff] to-[#c084fc]" />

      <div className="flex flex-col gap-3.5 p-5">
        {/* Learner identity row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={learnerAvatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[var(--color-border-soft)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = avatarFor(booking.id);
              }}
            />
            <div className="min-w-0">
              {/* MISSING: learnerName not returned by BookingResponse — using ID fallback */}
              <p className="text-[14px] font-semibold text-on-surface font-mono tabular-nums">
                {displayName}
              </p>
              <p className="text-[11.5px] text-on-surface-variant truncate">
                {dateDisplay}
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
            <p className="text-[13px] font-medium text-on-surface truncate">
              {booking.title}
            </p>
          </div>
          {booking.totalAmount > 0 && (
            <p className="text-[12px] font-semibold tabular-nums text-on-surface-variant shrink-0">
              {formatCurrency(booking.totalAmount)}
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
                <span className="text-on-surface-variant font-normal ml-1">
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

        {/* Priority badge row */}
        <PriorityBadge booking={booking} />

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3 mt-0.5">
          <span className="text-[12px] tabular-nums font-semibold text-on-surface-variant">
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
      const map = new Map<string, { name: string; avatarUrl?: string }>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.profile) {
          map.set(r.value.id, r.value.profile);
        }
      }
      if (map.size) setLearnerProfiles(map);
    });
  }, [allBookings]);

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
              <BookingCard
                key={b.id}
                booking={b}
                index={i}
                profile={b.learnerId ? learnerProfiles.get(b.learnerId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
