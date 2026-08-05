"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Star,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { findOrderCodeForBooking, clearPendingPayos } from "@/lib/payos-pending";
import { showError } from "@/lib/toast";
import { cn, formatCurrencyVnd } from "@/lib/utils";
import type { Booking } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

// ---- Status config ---------------------------------------------------------

const STATUS_MAP: Record<
  string,
  { label: string; chip: string; accentBar: string; icon: React.ElementType }
> = {
  active: {
    label: "Đang hoạt động",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentBar: "from-emerald-400 via-teal-400 to-cyan-400",
    icon: CheckCircle2,
  },
  completed: {
    label: "Hoàn thành",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    accentBar: "from-slate-300 to-slate-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Đã hủy",
    chip: "bg-red-50 text-red-600 border-red-200",
    accentBar: "from-red-400 to-rose-400",
    icon: XCircle,
  },
  pending_payment: {
    label: "Chờ thanh toán",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    accentBar: "from-amber-400 to-orange-400",
    icon: Clock,
  },
};

function statusCfg(status: string) {
  const s = (status ?? "").toLowerCase();
  return (
    STATUS_MAP[s] ?? {
      label: status || "Không rõ",
      chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
      accentBar: "from-on-surface/10 to-on-surface/20",
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

// ---- Tab config ------------------------------------------------------------

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending_payment", label: "Chờ thanh toán" },
  { key: "active", label: "Đang hoạt động" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SORT_OPTIONS = [
  { key: "newest", label: "Mới nhất" },
  { key: "remaining", label: "Còn nhiều buổi nhất" },
  { key: "action", label: "Cần xử lý trước" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// ---- SyncPaymentButton (logic unchanged — critical payment flow) -----------

function SyncPaymentButton({
  bookingId,
  onSynced,
}: {
  bookingId: string;
  onSynced?: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<"success" | "pending" | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const orderCode = findOrderCodeForBooking(bookingId);
      if (orderCode != null) {
        try {
          const r = await api.reconcilePayment(orderCode);
          if (r.activated || r.bookingStatus?.toLowerCase() === "active") {
            clearPendingPayos(bookingId);
            setResult("success");
            onSynced?.();
            return;
          }
        } catch {
          // cold start / transient — fall through to booking re-check
        }
      }
      const fresh = await api.fetchBooking(bookingId);
      const status = fresh?.status?.toLowerCase();
      if (status && status !== "pending_payment") {
        clearPendingPayos(bookingId);
        setResult("success");
        onSynced?.();
        return;
      }
      setResult("pending");
    } catch {
      showError("Không kiểm tra được trạng thái thanh toán. Vui lòng thử lại sau.");
    } finally {
      setSyncing(false);
    }
  }

  if (result === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
        <CheckCircle2 size={13} />
        Đã xác nhận thanh toán
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => void handleSync()}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-amber-300 bg-amber-50 px-3.5 py-2 text-[12.5px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
      >
        {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {syncing ? "Đang đồng bộ…" : "Đồng bộ thanh toán"}
      </button>
      {result === "pending" && (
        <p className="text-[11.5px] text-amber-700">
          Chưa nhận được xác nhận. Nếu bạn vừa thanh toán, hãy đợi 1–2 phút rồi thử lại.
        </p>
      )}
    </div>
  );
}

// ---- Skeleton card ---------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden animate-pulse">
      <div className="h-[3px] w-full bg-surface-container-high" />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-surface-container-high shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 w-3/5 rounded-full bg-surface-container-high mb-2" />
            <div className="h-3 w-2/5 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-6 w-24 rounded-full bg-surface-container-high shrink-0" />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <div className="h-3 w-28 rounded-full bg-surface-container-high" />
            <div className="h-3 w-16 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-2 w-full rounded-full bg-surface-container-high" />
        </div>
        <div className="h-9 w-full rounded-[10px] bg-surface-container-high" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-[10px] bg-surface-container-high" />
          ))}
        </div>
        <div className="h-[1px] w-full bg-surface-container-high" />
        <div className="h-9 w-full rounded-[8px] bg-surface-container-high" />
      </div>
    </div>
  );
}

// ---- Summary stat cards ----------------------------------------------------

interface SummaryStats {
  active: number;
  remainingSessions: number;
  pendingPayment: number;
  completed: number;
}

function SummaryCards({
  stats,
  shouldAnimate,
}: {
  stats: SummaryStats;
  shouldAnimate: boolean;
}) {
  const cards = [
    {
      label: "Đang hoạt động",
      value: stats.active,
      unit: "gói",
      bg: "bg-gradient-to-br from-primary/[0.08] to-[#7d6dff]/[0.05]",
      iconBg: "from-primary to-[#7d6dff]",
      icon: Dumbbell,
      valueColor: "text-primary",
    },
    {
      label: "Buổi còn lại",
      value: stats.remainingSessions,
      unit: "buổi",
      bg: "bg-gradient-to-br from-emerald-500/[0.07] to-emerald-400/[0.04]",
      iconBg: "from-emerald-500 to-emerald-400",
      icon: CalendarDays,
      valueColor: "text-emerald-700",
    },
    {
      label: "Chờ thanh toán",
      value: stats.pendingPayment,
      unit: "gói",
      bg: "bg-gradient-to-br from-amber-500/[0.08] to-amber-400/[0.04]",
      iconBg: "from-amber-500 to-amber-400",
      icon: CreditCard,
      valueColor: "text-amber-700",
    },
    {
      label: "Hoàn thành",
      value: stats.completed,
      unit: "gói",
      bg: "bg-gradient-to-br from-slate-500/[0.06] to-slate-400/[0.03]",
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
            "flex flex-col gap-2.5 rounded-[14px] border border-[var(--color-border-soft)] p-4",
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

// ---- Booking card ----------------------------------------------------------

interface CoachProfile {
  name: string;
  avatarUrl?: string;
}

function BookingCard({
  booking,
  index,
  coachProfile,
  shouldAnimate,
  onSynced,
}: {
  booking: Booking;
  index: number;
  coachProfile?: CoachProfile | null;
  shouldAnimate: boolean;
  onSynced?: () => void;
}) {
  const status = (booking.status ?? "").toLowerCase();
  const cfg = statusCfg(status);
  const StatusIcon = cfg.icon;
  const isActive = status === "active";
  const isPendingPayment = status === "pending_payment";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  // Use backend-supplied usage fields; fall back to completedSessions only.
  const usedSessions = booking.usedSessions ?? booking.completedSessions;
  const remainingSessions =
    booking.remainingSessions ?? Math.max(0, booking.totalSessions - booking.completedSessions);

  const completedSessions = booking.completedSessions;
  const progress =
    booking.totalSessions > 0
      ? Math.round((completedSessions / booking.totalSessions) * 100)
      : 0;
  const usedProgress =
    booking.totalSessions > 0
      ? Math.round((usedSessions / booking.totalSessions) * 100)
      : 0;

  const coachName = coachProfile?.name;

  const paymentPaid = !!(booking.paidAt || isActive || isCompleted);

  return (
    <motion.article
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: EASE }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[16px] border bg-surface-container-lowest transition-all",
        isActive
          ? "border-emerald-200/70 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_8px_24px_-10px_rgba(16,185,129,0.2)]"
          : isPendingPayment
          ? "border-amber-200/60 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_6px_20px_-10px_rgba(245,158,11,0.18)]"
          : "border-[var(--color-border-soft)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-10px_rgba(15,15,30,0.1)]",
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-[3px] w-full bg-gradient-to-r", cfg.accentBar)} />

      <div className="flex flex-col gap-4 p-5">
        {/* Header: coach avatar + package name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                avatarUrl={coachProfile?.avatarUrl}
                name={coachName}
                size="lg"
                className="h-11 w-11 text-[13px] ring-2 ring-[var(--color-border-soft)]"
              />
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-emerald-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-on-surface">
                {booking.title}
              </p>
              <p
                className={cn(
                  "truncate text-[12px]",
                  coachName ? "text-on-surface-variant" : "italic text-on-surface-variant/60",
                )}
              >
                {coachName ? `HLV: ${coachName}` : "Chưa có thông tin coach"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              cfg.chip,
            )}
          >
            <StatusIcon size={11} />
            {cfg.label}
          </span>
        </div>

        {/* Session progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
            <span className="font-medium text-on-surface">Tiến độ buổi tập</span>
            <span className="tabular-nums font-semibold text-on-surface">
              {completedSessions}/{booking.totalSessions} hoàn thành
            </span>
          </div>
          {/* Primary bar: completed sessions */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : isCompleted
                  ? "bg-gradient-to-r from-primary to-[#7d6dff]"
                  : "bg-on-surface/20",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Secondary bar: used/reserved slots */}
          {isActive && usedSessions !== completedSessions && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary/30 transition-all duration-500"
                style={{ width: `${usedProgress}%` }}
              />
            </div>
          )}
          {/* Info row */}
          <div className="mt-1.5 flex items-center justify-between text-[12px] text-on-surface-variant">
            {isActive && usedSessions !== completedSessions ? (
              <>
                <span className="tabular-nums">
                  Đã giữ chỗ: <strong className="text-on-surface">{usedSessions}/{booking.totalSessions}</strong>
                </span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    remainingSessions > 0 ? "text-emerald-700" : "text-red-600",
                  )}
                >
                  Còn {remainingSessions} buổi
                </span>
              </>
            ) : (
              <>
                <span className="tabular-nums">{progress}% hoàn thành</span>
                {remainingSessions > 0 && isActive && (
                  <span className="tabular-nums text-emerald-700 font-medium">
                    Còn {remainingSessions} buổi
                  </span>
                )}
                {remainingSessions === 0 && booking.totalSessions > 0 && !isCancelled && isActive && (
                  <span className="font-semibold text-red-600">Hết lượt đặt</span>
                )}
                {(isCompleted || (remainingSessions === 0 && !isActive && !isCancelled)) && (
                  <span className="font-semibold text-primary">Đã hoàn thành tất cả buổi</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Next session row */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px]",
            isActive
              ? "border border-emerald-100 bg-emerald-50/60"
              : "border border-[var(--color-border-soft)] bg-surface-container-low",
          )}
        >
          <CalendarDays
            size={13}
            className={cn("shrink-0", isActive ? "text-emerald-600" : "text-on-surface-variant")}
          />
          <span className={isActive ? "text-emerald-800" : "text-on-surface-variant"}>
            Buổi tiếp theo:{" "}
            <strong className="font-semibold">Chưa có buổi sắp tới</strong>
          </span>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5 rounded-[10px] bg-surface-container-low px-2.5 py-2">
            <span className="text-[10.5px] text-on-surface-variant">Ngày mua</span>
            <span className="text-[12px] font-semibold tabular-nums text-on-surface">
              {formatDateVi(booking.createdAt)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[10px] bg-surface-container-low px-2.5 py-2">
            <span className="text-[10.5px] text-on-surface-variant">Thanh toán</span>
            <span
              className={cn(
                "text-[11.5px] font-semibold",
                paymentPaid ? "text-emerald-700" : "text-amber-700",
              )}
            >
              {paymentPaid ? "Đã TT" : "Chưa TT"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[10px] bg-surface-container-low px-2.5 py-2">
            <span className="text-[10.5px] text-on-surface-variant">Tổng tiền</span>
            <span className="text-[11px] font-semibold tabular-nums text-on-surface">
              {booking.totalAmount > 0 ? formatCurrencyVnd(booking.totalAmount) : "—"}
            </span>
          </div>
        </div>

        {/* Terminal status info row */}
        {isCancelled && booking.cancelledAt && (
          <div className="flex items-center gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            <XCircle size={13} className="shrink-0" />
            Đã hủy ngày {formatDateVi(booking.cancelledAt)}
          </div>
        )}
        {isCompleted && booking.completedAt && (
          <div className="flex items-center gap-2 rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            <CheckCircle2 size={13} className="shrink-0" />
            Hoàn thành ngày {formatDateVi(booking.completedAt)}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] pt-3">
          {isPendingPayment && (
            <>
              <div className="flex items-start gap-2 rounded-[10px] border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                <CreditCard size={13} className="mt-0.5 shrink-0" />
                <span>
                  Nếu bạn đã thanh toán, nhấn{" "}
                  <strong>Đồng bộ</strong> để cập nhật trạng thái.
                </span>
              </div>
              <SyncPaymentButton bookingId={booking.id} onSynced={onSynced} />
            </>
          )}

          {isActive && (
            <div className="flex items-center gap-2">
              <Link
                href="/learner/schedule"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-gradient-to-br from-emerald-500 to-teal-500 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_3px_10px_-2px_rgba(16,185,129,0.35)] hover:shadow-[0_5px_14px_-2px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <CalendarDays size={13} />
                Xem lịch học
              </Link>
              <Link
                href={`/learner/plan?booking=${booking.id}`}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[12px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Xem lộ trình
                <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2">
              <Link
                href={`/learner/plan?booking=${booking.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[12.5px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <BookOpen size={13} />
                Xem nhật ký tập
              </Link>
              <Link
                href={`/learner/coaches/${booking.coachId}`}
                className="inline-flex items-center gap-1 rounded-[8px] border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Star size={12} />
                Đánh giá coach
              </Link>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2">
              <Link
                href={`/learner/plan?booking=${booking.id}`}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Xem chi tiết
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/learner/coaches"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-container-low px-3 py-2 text-[12px] font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                Mua lại gói
                <ShoppingBag size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---- Page -----------------------------------------------------------------

export default function LearnerBookingsPage() {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyBookings(), []);

  const allBookings = useMemo(() => bookingsData ?? [], [bookingsData]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Batch-fetch coach profiles for all unique coachIds once bookings load
  const [coachProfiles, setCoachProfiles] = useState<Map<string, CoachProfile>>(new Map());

  useEffect(() => {
    if (!allBookings.length) return;
    const uniqueIds = [
      ...new Set(allBookings.map((b) => b.coachId).filter((id): id is string => !!id)),
    ];
    if (!uniqueIds.length) return;

    Promise.allSettled(
      uniqueIds.map((id) =>
        api.fetchUserProfile(id).then((profile) => ({ id, profile })),
      ),
    ).then((results) => {
      const m = new Map<string, CoachProfile>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.profile) {
          m.set(r.value.id, {
            name: r.value.profile.name,
            avatarUrl: r.value.profile.avatarUrl,
          });
        }
      }
      if (m.size) setCoachProfiles(m);
    });
  }, [allBookings]);

  // Summary stats — use backend remainingSessions when available.
  const stats = useMemo<SummaryStats>(() => {
    const active = allBookings.filter((b) => b.status?.toLowerCase() === "active");
    return {
      active: active.length,
      remainingSessions: active.reduce(
        (sum, b) =>
          sum + (b.remainingSessions ?? Math.max(0, b.totalSessions - b.completedSessions)),
        0,
      ),
      pendingPayment: allBookings.filter(
        (b) => b.status?.toLowerCase() === "pending_payment",
      ).length,
      completed: allBookings.filter((b) => b.status?.toLowerCase() === "completed").length,
    };
  }, [allBookings]);

  // Tab counts — trust backend status directly.
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allBookings.length };
    for (const b of allBookings) {
      const s = (b.status ?? "").toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [allBookings]);

  // Filter + sort — trust backend status for filtering.
  const filteredBookings = useMemo(() => {
    let result = allBookings;
    if (activeTab !== "all") {
      result = result.filter((b) => (b.status ?? "").toLowerCase() === activeTab);
    }
    switch (sortKey) {
      case "remaining":
        result = [...result].sort(
          (a, b) =>
            (b.remainingSessions ?? Math.max(0, b.totalSessions - b.completedSessions)) -
            (a.remainingSessions ?? Math.max(0, a.totalSessions - a.completedSessions)),
        );
        break;
      case "action": {
        const priority = (s: string) => {
          if (s === "pending_payment") return 0;
          if (s === "active") return 1;
          if (s === "completed") return 2;
          return 3;
        };
        result = [...result].sort(
          (a, b) => priority(a.status?.toLowerCase()) - priority(b.status?.toLowerCase()),
        );
        break;
      }
      default:
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return result;
  }, [allBookings, activeTab, sortKey]);

  return (
    <AppShell role="learner" title="Gói tập của tôi">
      <div className="mx-auto max-w-[960px] space-y-6">
        {/* Page header */}
        <motion.header
          initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: EASE }}
          className="flex flex-col gap-1"
        >
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
            Gói tập của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            Theo dõi gói đã mua, lịch tập, thanh toán và tiến độ của bạn.
          </p>
        </motion.header>

        {/* Loading state — skeleton layout */}
        {loading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[108px] rounded-[14px] bg-surface-container-low animate-pulse" />
              ))}
            </div>
            <div className="h-10 w-full rounded-[12px] bg-surface-container-low animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 rounded-[16px] border border-red-100 bg-red-50/60 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle size={22} className="text-red-600" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-on-surface">
                Không thể tải danh sách gói tập
              </p>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                Vui lòng thử lại sau.
              </p>
            </div>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw size={14} />
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary cards */}
            {allBookings.length > 0 && (
              <SummaryCards stats={stats} shouldAnimate={shouldAnimate} />
            )}

            {/* Filter tabs + sort row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Animated tab pills */}
              <div className="flex items-center gap-1 overflow-x-auto rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low p-1">
                {TABS.map((tab) => {
                  const count = tabCounts[tab.key] ?? 0;
                  const isCurrent = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "relative shrink-0 inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                        isCurrent
                          ? "text-on-surface"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {isCurrent && (
                        <motion.span
                          layoutId="tab-active-pill"
                          className="absolute inset-0 rounded-[8px] bg-surface-container-lowest shadow-[0_1px_3px_rgba(0,0,0,0.07)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.38 }}
                        />
                      )}
                      <span className="relative">{tab.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "relative inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-semibold",
                            isCurrent
                              ? "bg-primary/10 text-primary"
                              : "bg-on-surface/10 text-on-surface-variant",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sort dropdown */}
              {allBookings.length > 1 && (
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="h-9 shrink-0 cursor-pointer appearance-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest pl-3 pr-8 text-[12.5px] font-medium text-on-surface outline-none transition-colors hover:border-primary/40 focus:border-primary"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Empty — no packages at all */}
            {allBookings.length === 0 && (
              <motion.div
                initial={shouldAnimate ? { opacity: 0, scale: 0.98 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col items-center gap-5 rounded-[20px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-[#7d6dff]/10">
                  <Dumbbell size={28} className="text-primary/60" />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-on-surface">
                    Bạn chưa mua gói tập nào
                  </p>
                  <p className="mt-1.5 max-w-xs mx-auto text-[14px] text-on-surface-variant">
                    Khám phá huấn luyện viên phù hợp và bắt đầu lộ trình tập luyện của bạn.
                  </p>
                </div>
                <Link
                  href="/learner/coaches"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] px-5 py-2.5 text-[13.5px] font-semibold text-on-primary shadow-[0_4px_14px_-4px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-4px_rgba(53,37,205,0.5)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                >
                  Tìm huấn luyện viên
                  <ArrowRight size={15} />
                </Link>
              </motion.div>
            )}

            {/* Empty — no packages matching current filter */}
            {allBookings.length > 0 && filteredBookings.length === 0 && (
              <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                  <BookOpen size={20} className="text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-on-surface">
                    Không có gói nào trong trạng thái này
                  </p>
                  <p className="mt-1 text-[13.5px] text-on-surface-variant">
                    Thử chọn bộ lọc khác để xem toàn bộ gói tập.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("all")}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Xem tất cả
                </button>
              </div>
            )}

            {/* Package cards grid */}
            {filteredBookings.length > 0 && (
              <AnimatePresence mode="popLayout">
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredBookings.map((b, i) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      index={i}
                      coachProfile={coachProfiles.get(b.coachId) ?? null}
                      shouldAnimate={shouldAnimate}
                      onSynced={refetch}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
