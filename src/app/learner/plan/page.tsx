"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Dumbbell,
  HeartPulse,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Ruler,
  Scale,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { showSuccess, showApiError } from "@/lib/toast";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState } from "@/components/common/AsyncStates";
import { cn, formatCurrencyVnd, avatarFor } from "@/lib/utils";
import type {
  Booking,
  LearnerAssessment,
  PlanWeek,
  ProgressCheckIn,
  TrainingPlan,
} from "@/types";

// ============================================================================
// Helpers
// ============================================================================

const UNNAMED_PKG = "Gói tập chưa có tên";

function formatDateVi(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getPackageDisplayName(booking: Booking, coachName?: string): string {
  if (booking.title && booking.title !== UNNAMED_PKG) return booking.title;
  if (coachName) return `Gói tập với ${coachName}`;
  if (booking.createdAt) return `Gói tập ${formatDateVi(booking.createdAt)}`;
  return `Gói #${booking.id.slice(0, 6).toUpperCase()}`;
}

type StatusVariant = "active" | "completed" | "cancelled" | "draft" | "expired" | "pending";

const STATUS_CFG: Record<StatusVariant | string, { label: string; color: string; bg: string; dot: string }> = {
  active: {
    label: "Đang hoạt động",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
  },
  draft: {
    label: "Nháp",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Hoàn thành",
    color: "text-primary",
    bg: "bg-primary/[0.07]",
    dot: "bg-primary",
  },
  cancelled: {
    label: "Đã huỷ",
    color: "text-[#ba1a1a]",
    bg: "bg-[#ffdad6]",
    dot: "bg-[#ba1a1a]",
  },
  expired: {
    label: "Hết hạn",
    color: "text-on-surface-variant",
    bg: "bg-surface-container-high",
    dot: "bg-on-surface-variant",
  },
  pending: {
    label: "Chờ thanh toán",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  pending_payment: {
    label: "Chờ thanh toán",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  pendingpayment: {
    label: "Chờ thanh toán",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
};

function getStatusCfg(status: string) {
  const key = status.toLowerCase().replace(/_/g, "");
  return (
    STATUS_CFG[status.toLowerCase()] ??
    STATUS_CFG[key] ??
    STATUS_CFG.active
  );
}

/**
 * Override "active" → "completed" when the real completed-session count
 * meets or exceeds totalSessions. The backend counter can lag because it
 * isn't always incremented atomically when the coach marks a session done.
 */
function effectiveStatus(booking: Booking, completedOverride?: number): string {
  const status = (booking.status ?? "").toLowerCase();
  if (status !== "active") return status;
  const done = completedOverride ?? booking.completedSessions;
  if (booking.totalSessions > 0 && done >= booking.totalSessions) return "completed";
  return status;
}

function getPaymentLabel(booking: Booking): {
  label: string;
  variant: "paid" | "pending" | "unknown";
} {
  if (booking.paidAt) return { label: "Đã thanh toán", variant: "paid" };
  const key = booking.status.toLowerCase().replace(/_/g, "");
  if (key.includes("pendingpayment") || key.includes("pending")) {
    return { label: "Chờ thanh toán", variant: "pending" };
  }
  return { label: "Chưa xác nhận", variant: "unknown" };
}

// ============================================================================
// Shared: StatusBadge
// ============================================================================

function StatusBadge({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const cfg = getStatusCfg(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap shrink-0",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        cfg.bg,
        cfg.color,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ============================================================================
// Entry
// ============================================================================

export default function LearnerPlanPage() {
  return (
    <Suspense fallback={null}>
      <LearnerPlanContent />
    </Suspense>
  );
}

// ============================================================================
// Root content — state manager
// ============================================================================

type PlanTab = "assessment" | "plan" | "checkins";

function LearnerPlanContent() {
  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyBookings(), []);
  // Exclude cancelled and pending-payment bookings — learner shouldn't manage
  // a journey they haven't paid for or that was already cancelled.
  const bookings = useMemo(
    () =>
      (bookingsData ?? []).filter((b) => {
        const key = b.status.toLowerCase().replace(/_/g, "");
        return key !== "cancelled" && key !== "pendingpayment" && key !== "pending";
      }),
    [bookingsData],
  );

  const searchParams = useSearchParams();
  const paramBookingId = searchParams.get("booking") ?? "";
  const paramTab = (searchParams.get("tab") as PlanTab) ?? "assessment";

  const [bookingId, setBookingId] = useState(paramBookingId);
  const [activeTab, setActiveTab] = useState<PlanTab>(paramTab);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch actual completed-session counts for all active bookings.
  // The backend `completedSessions` counter can be stale when the coach
  // marks sessions done without the booking aggregate being updated atomically.
  const [sessionCounts, setSessionCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const active = bookings.filter((b) => (b.status ?? "").toLowerCase() === "active");
    if (!active.length) return;
    Promise.allSettled(
      active.map((b) =>
        api.fetchBookingSessions(b.id).then((sessions) => ({
          id: b.id,
          count: sessions.filter((s) => (s.status ?? "").toLowerCase() === "completed").length,
        })),
      ),
    ).then((results) => {
      const m = new Map<string, number>();
      for (const r of results) {
        if (r.status === "fulfilled") m.set(r.value.id, r.value.count);
      }
      if (m.size) setSessionCounts(m);
    });
  }, [bookings]);

  // Active bookings: non-completed (backend or derived).
  const displayBookings = useMemo(
    () =>
      bookings.filter(
        (b) => effectiveStatus(b, sessionCounts.get(b.id)) !== "completed",
      ),
    [bookings, sessionCounts],
  );

  // Completed bookings: both backend-marked and session-exhausted active ones.
  const completedBookings = useMemo(
    () =>
      bookings.filter(
        (b) => effectiveStatus(b, sessionCounts.get(b.id)) === "completed",
      ),
    [bookings, sessionCounts],
  );

  const [pageMode, setPageMode] = useState<"active" | "completed">("active");
  const listBookings = pageMode === "active" ? displayBookings : completedBookings;

  // Auto-select first booking in the active list when mode or list changes.
  useEffect(() => {
    if (!listBookings.length) return;
    if (bookingId && listBookings.some((b) => b.id === bookingId)) return;
    setBookingId(listBookings[0].id);
  }, [listBookings, bookingId]);

  if (loading) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <JourneySkeleton />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <div className="pt-8">
          <ErrorState onRetry={refetch} className="mx-auto max-w-md" />
        </div>
      </AppShell>
    );
  }

  const selectedBooking = bookings.find((b) => b.id === bookingId) ?? null;
  const selectedStatus = selectedBooking
    ? effectiveStatus(selectedBooking, sessionCounts.get(selectedBooking.id))
    : null;

  return (
    <AppShell role="learner" title="Lộ trình">
      <div className="pb-10">
        {/* ---- Page header ---- */}
        <PageHeader
          hasMultiple={listBookings.length > 1}
          selectedBooking={selectedBooking}
          onOpenSheet={() => setSheetOpen(true)}
        />

        {/* ---- Mode tabs ---- */}
        {(displayBookings.length > 0 || completedBookings.length > 0) && (
          <PlanModeTabs
            mode={pageMode}
            activeCount={displayBookings.length}
            completedCount={completedBookings.length}
            onChange={(m) => {
              setPageMode(m);
              setBookingId("");
            }}
          />
        )}

        {listBookings.length === 0 ? (
          pageMode === "active" ? (
            <NoBookingsState />
          ) : (
            <NoCompletedState />
          )
        ) : (
          <>
            {/* Mobile bottom sheet */}
            <MobilePackageSheet
              open={sheetOpen}
              bookings={listBookings}
              selectedId={bookingId}
              sessionCountMap={sessionCounts}
              onSelect={(id) => {
                setBookingId(id);
                setSheetOpen(false);
              }}
              onClose={() => setSheetOpen(false)}
            />

            {/* ---- 2-col layout: left navigator + right detail ---- */}
            <div className="flex gap-5 items-start">
              {/* Left: sticky navigator (desktop only) */}
              <div className="hidden lg:block w-[300px] xl:w-[320px] shrink-0">
                <div className="sticky top-[84px]">
                  <PackageNavigator
                    bookings={listBookings}
                    selectedId={bookingId}
                    onSelect={setBookingId}
                    sessionCountMap={sessionCounts}
                  />
                </div>
              </div>

              {/* Right: journey detail */}
              <div className="flex-1 min-w-0 space-y-4">
                {selectedBooking ? (
                  <>
                    <SelectedPackageOverview
                      booking={selectedBooking}
                      completedOverride={sessionCounts.get(selectedBooking.id)}
                      statusOverride={selectedStatus ?? undefined}
                      onCheckIn={() => setActiveTab("checkins")}
                      onAssess={() => setActiveTab("assessment")}
                    />
                    <CoachPaymentSummary booking={selectedBooking} />
                    <TrainingJourneySteps
                      bookingId={bookingId}
                      onStepClick={setActiveTab}
                    />
                    <TabNav activeTab={activeTab} onChange={setActiveTab} />
                    <TabPanels
                      key={bookingId}
                      bookingId={bookingId}
                      activeTab={activeTab}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ============================================================================
// Plan Mode Tabs (Đang học | Đã hoàn thành)
// ============================================================================

function PlanModeTabs({
  mode,
  activeCount,
  completedCount,
  onChange,
}: {
  mode: "active" | "completed";
  activeCount: number;
  completedCount: number;
  onChange: (m: "active" | "completed") => void;
}) {
  const reduce = useReducedMotion();
  const tabs: { id: "active" | "completed"; label: string; count: number }[] = [
    { id: "active",    label: "Đang học",       count: activeCount },
    { id: "completed", label: "Đã hoàn thành",  count: completedCount },
  ];
  return (
    <div className="flex items-center gap-1 p-1 mb-5 rounded-[12px] bg-surface-container-low border border-[var(--color-border-soft)] self-start w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-medium transition-colors z-[1] whitespace-nowrap",
            mode === tab.id
              ? "text-on-surface"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {mode === tab.id && (
            <motion.span
              layoutId="plan-mode-pill"
              className="absolute inset-0 rounded-[9px] bg-surface-container-lowest shadow-sm border border-[var(--color-border-soft)]"
              transition={{ type: "spring", bounce: 0.18, duration: reduce ? 0 : 0.35 }}
            />
          )}
          <span className="relative z-[1]">{tab.label}</span>
          {tab.count > 0 && (
            <span
              className={cn(
                "relative z-[1] inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-semibold",
                mode === tab.id
                  ? "bg-primary/10 text-primary"
                  : "bg-on-surface/10 text-on-surface-variant",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// No-bookings empty states
// ============================================================================

function NoCompletedState() {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(53,37,205,0.3)] opacity-40">
        <Trophy size={22} className="text-white" />
      </div>
      <p className="text-[15px] font-semibold text-on-surface">
        Chưa có gói tập nào hoàn thành
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[260px] mx-auto">
        Các gói bạn đã tập xong sẽ xuất hiện ở đây để bạn xem lại.
      </p>
    </div>
  );
}

// ============================================================================
// Page Header
// ============================================================================

function PageHeader({
  hasMultiple,
  selectedBooking,
  onOpenSheet,
}: {
  hasMultiple: boolean;
  selectedBooking: Booking | null;
  onOpenSheet: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5"
    >
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
          Lộ trình tập luyện
        </h1>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Theo dõi đánh giá ban đầu, kế hoạch tập và tiến độ của bạn.
        </p>
      </div>
      {/* Mobile-only: "Đổi gói tập" button */}
      {hasMultiple && (
        <button
          onClick={onOpenSheet}
          className="lg:hidden inline-flex items-center gap-2 self-start sm:self-auto h-9 pl-3.5 pr-3 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest text-[13px] font-medium text-on-surface hover:border-primary/40 hover:text-primary transition-all shadow-sm"
        >
          <span>
            {selectedBooking ? "Đổi gói tập" : "Chọn gói tập"}
          </span>
          <ChevronDown size={14} />
        </button>
      )}
    </motion.header>
  );
}

// ============================================================================
// Mobile Package Sheet (bottom sheet)
// ============================================================================

function MobilePackageSheet({
  open,
  bookings,
  selectedId,
  sessionCountMap,
  onSelect,
  onClose,
}: {
  open: boolean;
  bookings: Booking[];
  selectedId: string;
  sessionCountMap: Map<string, number>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="pkg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="pkg-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] bg-surface-container-lowest border-t border-[var(--color-border-soft)] max-h-[80vh] flex flex-col lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-border-soft)] shrink-0">
              <div>
                <p className="text-[15px] font-semibold text-on-surface">
                  Gói tập của bạn
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {bookings.length} lộ trình
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors"
              >
                <X size={16} className="text-on-surface-variant" />
              </button>
            </div>
            {/* Package list */}
            <div className="overflow-y-auto p-4 space-y-2.5">
              {bookings.map((b) => (
                <PackageOptionCard
                  key={b.id}
                  booking={b}
                  selected={b.id === selectedId}
                  completedOverride={sessionCountMap.get(b.id)}
                  onSelect={onSelect}
                />
              ))}
            </div>
            <div className="h-4 shrink-0" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PackageOptionCard({
  booking,
  selected,
  completedOverride,
  onSelect,
}: {
  booking: Booking;
  selected: boolean;
  completedOverride?: number;
  onSelect: (id: string) => void;
}) {
  const { data: coach } = useApiResource(
    () => api.fetchCoach(booking.coachId),
    [booking.coachId],
  );
  const coachName = coach?.name;
  const displayName = getPackageDisplayName(booking, coachName);
  const completedSessions = completedOverride ?? booking.completedSessions;
  const derivedStatus = effectiveStatus(booking, completedOverride);
  const pct = booking.totalSessions
    ? Math.round((completedSessions / booking.totalSessions) * 100)
    : 0;

  return (
    <button
      onClick={() => onSelect(booking.id)}
      className={cn(
        "w-full text-left rounded-[12px] p-3.5 border transition-all",
        selected
          ? "border-primary/30 bg-primary/[0.05]"
          : "border-[var(--color-border-soft)] hover:border-primary/20 hover:bg-surface-container-low",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-semibold text-on-surface leading-snug">
          {displayName}
        </p>
        <StatusBadge status={derivedStatus} compact />
      </div>
      {coachName && (
        <p className="text-[11.5px] text-on-surface-variant mb-2">
          HLV: {coachName}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] text-on-surface-variant tabular-nums">
          {completedSessions}/{booking.totalSessions} buổi
        </span>
        <div className="flex-1 h-1 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] text-on-surface-variant tabular-nums">
          {pct}%
        </span>
      </div>
      {booking.createdAt && (
        <p className="text-[11px] text-on-surface-variant/60 mt-1.5">
          Mua ngày {formatDateVi(booking.createdAt)}
        </p>
      )}
    </button>
  );
}

// ============================================================================
// Desktop Package Navigator (left column)
// ============================================================================

function PackageNavigator({
  bookings,
  selectedId,
  onSelect,
  sessionCountMap,
}: {
  bookings: Booking[];
  selectedId: string;
  onSelect: (id: string) => void;
  sessionCountMap: Map<string, number>;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.05)]">
      <div className="px-4 py-3.5 border-b border-[var(--color-border-soft)]">
        <p className="text-[13px] font-semibold text-on-surface">
          Gói tập của bạn
        </p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {bookings.length} lộ trình
        </p>
      </div>
      <div className="p-2 space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
        {bookings.map((b) => (
          <PackageNavCard
            key={b.id}
            booking={b}
            selected={b.id === selectedId}
            completedOverride={sessionCountMap.get(b.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function PackageNavCard({
  booking,
  selected,
  completedOverride,
  onSelect,
}: {
  booking: Booking;
  selected: boolean;
  completedOverride?: number;
  onSelect: (id: string) => void;
}) {
  const { data: coach } = useApiResource(
    () => api.fetchCoach(booking.coachId),
    [booking.coachId],
  );
  const coachName = coach?.name;
  const displayName = getPackageDisplayName(booking, coachName);
  const completedSessions = completedOverride ?? booking.completedSessions;
  const derivedStatus = effectiveStatus(booking, completedOverride);
  const pct = booking.totalSessions
    ? Math.round((completedSessions / booking.totalSessions) * 100)
    : 0;

  return (
    <button
      onClick={() => onSelect(booking.id)}
      className={cn(
        "w-full text-left rounded-[11px] p-3 transition-all relative group",
        selected
          ? "bg-primary/[0.06] border border-primary/20"
          : "border border-transparent hover:bg-surface-container-low",
      )}
    >
      {/* Left accent bar for selected */}
      {selected && (
        <motion.span
          layoutId="pkg-nav-accent"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
          transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
        />
      )}
      <div className="pl-3">
        {/* Title + status */}
        <div className="flex items-start gap-1.5 justify-between mb-1">
          <p
            className={cn(
              "text-[12.5px] font-semibold leading-snug flex-1 min-w-0 line-clamp-2",
              selected ? "text-primary" : "text-on-surface",
            )}
          >
            {displayName}
          </p>
          <StatusBadge status={derivedStatus} compact />
        </div>
        {/* Coach */}
        {coachName && (
          <p className="text-[11px] text-on-surface-variant truncate">
            {coachName}
          </p>
        )}
        {/* Progress bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10.5px] text-on-surface-variant tabular-nums shrink-0">
            {completedSessions}/{booking.totalSessions}
          </span>
        </div>
        {/* Date */}
        {booking.createdAt && (
          <p className="text-[10.5px] text-on-surface-variant/60 mt-1 leading-tight">
            {formatDateVi(booking.createdAt)}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Selected Package Overview (hero card)
// ============================================================================

function SelectedPackageOverview({
  booking,
  completedOverride,
  statusOverride,
  onCheckIn,
  onAssess,
}: {
  booking: Booking;
  completedOverride?: number;
  statusOverride?: string;
  onCheckIn: () => void;
  onAssess: () => void;
}) {
  const reduce = useReducedMotion();
  const { data: coach } = useApiResource(
    () => api.fetchCoach(booking.coachId),
    [booking.coachId],
  );
  const coachName =
    coach?.name ?? `Coach ${booking.coachId.slice(0, 4).toUpperCase()}`;
  const displayName = getPackageDisplayName(booking, coachName);
  const completedSessions = completedOverride ?? booking.completedSessions;
  const derivedStatus = statusOverride ?? booking.status;
  const pct = booking.totalSessions
    ? Math.round((completedSessions / booking.totalSessions) * 100)
    : 0;
  const remaining = Math.max(0, booking.totalSessions - completedSessions);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.06)]"
    >
      {/* Gradient top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-[#7d6dff] to-[#c084fc]" />
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2.5 flex-1 min-w-0">
            {/* Title + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-semibold text-on-surface">
                {displayName}
              </h2>
              <StatusBadge status={derivedStatus} />
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Dumbbell size={13} className="text-primary shrink-0" />
                <span className="tabular-nums font-semibold text-on-surface">
                  {completedSessions}
                </span>
                <span>/ {booking.totalSessions} buổi</span>
              </span>
              {remaining > 0 && (
                <span className="flex items-center gap-1.5">
                  <RotateCcw size={13} className="shrink-0" />
                  <span>còn {remaining} buổi</span>
                </span>
              )}
              {booking.paidAt && (
                <span className="flex items-center gap-1.5">
                  <CreditCard size={13} className="shrink-0" />
                  <span className="tabular-nums text-on-surface font-medium">
                    {formatDateVi(booking.paidAt)}
                  </span>
                </span>
              )}
              {booking.totalAmount > 0 && (
                <span className="tabular-nums font-semibold text-on-surface">
                  {formatCurrencyVnd(booking.totalAmount)}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1 w-full sm:max-w-[280px]">
              <div className="flex justify-between text-[11px] text-on-surface-variant">
                <span>Tiến độ hoàn thành</span>
                <span className="tabular-nums font-semibold text-on-surface">
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 0.7,
                    delay: 0.25,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
                />
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2 shrink-0">
            {derivedStatus !== "completed" && (
              <button
                onClick={onCheckIn}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-all hover:-translate-y-[1px] active:translate-y-0"
              >
                <HeartPulse size={14} />
                Check-in hôm nay
              </button>
            )}
            <button
              onClick={onAssess}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <Target size={13} />
              Xem đánh giá
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Coach + Payment Summary (3 mini-cards)
// ============================================================================

function CoachPaymentSummary({ booking }: { booking: Booking }) {
  const { data: coach } = useApiResource(
    () => api.fetchCoach(booking.coachId),
    [booking.coachId],
  );
  const coachName =
    coach?.name ?? `Coach ${booking.coachId.slice(0, 4).toUpperCase()}`;
  const coachAvatar = coach?.avatarUrl ?? avatarFor(booking.coachId);
  const payment = getPaymentLabel(booking);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Coach */}
      <div className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-3">
        <img
          src={coachAvatar}
          alt={coachName}
          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[var(--color-border-soft)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = avatarFor(booking.coachId);
          }}
        />
        <div className="min-w-0">
          <p className="text-[10.5px] text-on-surface-variant">HLV phụ trách</p>
          <p className="text-[13px] font-semibold text-on-surface truncate">
            {coachName}
          </p>
        </div>
      </div>

      {/* Payment status */}
      <div className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-3">
        <div
          className={cn(
            "w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0",
            payment.variant === "paid"
              ? "bg-emerald-50"
              : payment.variant === "pending"
                ? "bg-amber-50"
                : "bg-surface-container-low",
          )}
        >
          <CreditCard
            size={16}
            className={cn(
              payment.variant === "paid"
                ? "text-emerald-600"
                : payment.variant === "pending"
                  ? "text-amber-600"
                  : "text-on-surface-variant",
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10.5px] text-on-surface-variant">Thanh toán</p>
          <p
            className={cn(
              "text-[13px] font-semibold",
              payment.variant === "paid"
                ? "text-emerald-700"
                : payment.variant === "pending"
                  ? "text-amber-700"
                  : "text-on-surface",
            )}
          >
            {payment.label}
          </p>
          {booking.paidAt && (
            <p className="text-[11px] text-on-surface-variant tabular-nums">
              {formatDateVi(booking.paidAt)}
            </p>
          )}
        </div>
      </div>

      {/* Total amount */}
      <div className="flex items-center gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-3">
        <div className="w-9 h-9 rounded-[9px] bg-primary/[0.07] flex items-center justify-center shrink-0">
          <Scale size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-[10.5px] text-on-surface-variant">Tổng thanh toán</p>
          <p className="text-[13px] font-semibold text-on-surface tabular-nums">
            {booking.totalAmount > 0
              ? formatCurrencyVnd(booking.totalAmount)
              : "Chưa cập nhật"}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            {booking.totalSessions} buổi
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Training Journey Steps (4-step horizontal stepper)
// ============================================================================

type StepState = "done" | "current" | "missing" | "locked";

const STEP_COLORS: Record<
  StepState,
  { icon: string; line: string; label: string; sub: string }
> = {
  done: {
    icon: "bg-gradient-to-br from-emerald-500 to-emerald-400 text-white",
    line: "bg-emerald-300",
    label: "text-on-surface font-medium",
    sub: "text-emerald-600",
  },
  current: {
    icon: "bg-gradient-to-br from-primary to-[#7d6dff] text-white shadow-[0_2px_8px_-2px_rgba(53,37,205,0.4)]",
    line: "bg-primary/20",
    label: "text-primary font-semibold",
    sub: "text-primary/70",
  },
  missing: {
    icon: "bg-surface-container-high text-on-surface-variant",
    line: "bg-[var(--color-border-soft)]",
    label: "text-on-surface",
    sub: "text-amber-600",
  },
  locked: {
    icon: "bg-surface-container-low text-on-surface-variant/40",
    line: "bg-[var(--color-border-soft)]",
    label: "text-on-surface-variant",
    sub: "text-on-surface-variant/50",
  },
};

function TrainingJourneySteps({
  bookingId,
  onStepClick,
}: {
  bookingId: string;
  onStepClick: (tab: PlanTab) => void;
}) {
  const reduce = useReducedMotion();

  const { data: assessment, loading: aLoading } = useApiResource(
    () => api.fetchAssessment(bookingId),
    [bookingId],
  );
  const { data: plan, loading: pLoading } = useApiResource(
    () => api.fetchTrainingPlan(bookingId),
    [bookingId],
  );
  const { data: checkInsData, loading: cLoading } = useApiResource(
    () => api.fetchProgressCheckIns(bookingId, { pageSize: 1 }),
    [bookingId],
  );

  const checkInCount = checkInsData?.totalCount ?? 0;
  const planStatus = plan?.status?.toLowerCase() ?? null;
  const isLoading = aLoading || pLoading || cLoading;

  type StepDef = {
    id: string;
    tab?: PlanTab;
    label: string;
    sub: string;
    icon: LucideIcon;
    state: StepState;
  };

  const steps: StepDef[] = [
    {
      id: "assessment",
      tab: "assessment",
      label: "Đánh giá ban đầu",
      sub: isLoading ? "Đang tải…" : assessment ? "Đã hoàn thành" : "Chưa có",
      icon: Target,
      state: isLoading ? "missing" : assessment ? "done" : "missing",
    },
    {
      id: "plan",
      tab: "plan",
      label: "Kế hoạch tập",
      sub: isLoading
        ? "Đang tải…"
        : !plan
          ? "Chưa có"
          : planStatus === "active"
            ? "Đang thực hiện"
            : planStatus === "completed"
              ? "Đã xong"
              : planStatus === "draft"
                ? "Đang soạn"
                : "Có kế hoạch",
      icon: ClipboardList,
      state: isLoading
        ? "missing"
        : !plan
          ? "missing"
          : planStatus === "active" || planStatus === "draft"
            ? "current"
            : "done",
    },
    {
      id: "checkins",
      tab: "checkins",
      label: "Nhật ký tiến độ",
      sub: isLoading
        ? "Đang tải…"
        : checkInCount > 0
          ? `${checkInCount} lần check-in`
          : "Chưa check-in",
      icon: HeartPulse,
      state: isLoading ? "missing" : checkInCount > 0 ? "current" : "missing",
    },
    {
      id: "complete",
      label: "Hoàn thành",
      sub:
        !isLoading && assessment && plan && checkInCount > 0
          ? "Hành trình đầy đủ"
          : "Đang tiến hành",
      icon: Trophy,
      state:
        !isLoading && assessment && plan && checkInCount > 0 ? "done" : "locked",
    },
  ];

  return (
    <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-4 shadow-[0_1px_2px_rgba(15,15,30,0.03)]">
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
        Tiến trình hành trình
      </p>

      {/* Stepper row */}
      <div className="flex items-start">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const colors = STEP_COLORS[step.state];
          const clickable = !!step.tab;

          return (
            <Fragment key={step.id}>
              {/* Step */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.07, duration: 0.25 }}
                className="flex flex-col items-center shrink-0"
                style={{ minWidth: 64 }}
              >
                {/* Icon button */}
                <button
                  onClick={() => step.tab && onStepClick(step.tab)}
                  disabled={!clickable}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-transform relative z-[1]",
                    colors.icon,
                    clickable
                      ? "hover:-translate-y-[1px] cursor-pointer"
                      : "cursor-default",
                  )}
                >
                  {step.state === "done" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <step.icon size={15} />
                  )}
                </button>

                {/* Label */}
                <div className="text-center mt-2 w-full px-1">
                  <p
                    className={cn(
                      "text-[11px] leading-snug",
                      colors.label,
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5 leading-tight hidden sm:block",
                      colors.sub,
                    )}
                  >
                    {step.sub}
                  </p>
                </div>
              </motion.div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mt-[17px] mx-1">
                  <div className={cn("h-[2px] w-full rounded-full", colors.line)} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Tab Navigation
// ============================================================================

const TABS: {
  id: PlanTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  {
    id: "assessment",
    label: "Đánh giá ban đầu",
    shortLabel: "Đánh giá",
    icon: Target,
  },
  {
    id: "plan",
    label: "Kế hoạch tập",
    shortLabel: "Kế hoạch",
    icon: ClipboardList,
  },
  {
    id: "checkins",
    label: "Nhật ký tiến độ",
    shortLabel: "Nhật ký",
    icon: HeartPulse,
  },
];

function TabNav({
  activeTab,
  onChange,
}: {
  activeTab: PlanTab;
  onChange: (tab: PlanTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-[12px] bg-surface-container-low border border-[var(--color-border-soft)]">
      {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] text-[13px] font-medium transition-colors z-[1]",
            activeTab === id
              ? "text-primary"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {activeTab === id && (
            <motion.span
              layoutId="plan-tab-bg"
              className="absolute inset-0 rounded-[9px] bg-surface-container-lowest shadow-sm border border-[var(--color-border-soft)]"
              transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
            />
          )}
          <Icon size={14} className="relative z-[1] shrink-0" />
          <span className="relative z-[1] hidden sm:inline">{label}</span>
          <span className="relative z-[1] sm:hidden">{shortLabel}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Tab Panels
// ============================================================================

function TabPanels({
  bookingId,
  activeTab,
}: {
  bookingId: string;
  activeTab: PlanTab;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "assessment" && (
          <AssessmentTab bookingId={bookingId} />
        )}
        {activeTab === "plan" && <PlanTab bookingId={bookingId} />}
        {activeTab === "checkins" && <CheckInsTab bookingId={bookingId} />}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Assessment Tab
// ============================================================================

function AssessmentTab({ bookingId }: { bookingId: string }) {
  const { data, loading, refetch } = useApiResource(
    () => api.fetchAssessment(bookingId),
    [bookingId],
  );
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <SectionShell icon={Target} title="Đánh giá ban đầu">
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      </SectionShell>
    );
  }

  // No assessment yet and not in create mode → show informational empty state
  if (!data && !editing) {
    return (
      <SectionShell icon={Target} title="Đánh giá ban đầu">
        <AssessmentEmptyState onStart={() => setEditing(true)} />
      </SectionShell>
    );
  }

  // Creating new or editing existing → show form
  if (editing || !data) {
    return (
      <SectionShell
        icon={Target}
        title={data ? "Chỉnh sửa đánh giá" : "Đánh giá ban đầu"}
      >
        <AssessmentForm
          bookingId={bookingId}
          existing={data ?? null}
          onSaved={() => {
            refetch();
            setEditing(false);
          }}
          onCancel={data ? () => setEditing(false) : undefined}
        />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      icon={Target}
      title="Đánh giá ban đầu"
      action={
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-[var(--color-border-soft)] text-[12px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Chỉnh sửa
        </button>
      }
    >
      <AssessmentView data={data} />
    </SectionShell>
  );
}

// ---- Validation helpers ----

function safeHeight(v: number | undefined): number | undefined {
  if (v == null || isNaN(v) || v <= 0 || v > 250) return undefined;
  return v;
}

function safeWeight(v: number | undefined): number | undefined {
  if (v == null || isNaN(v) || v <= 0 || v > 350) return undefined;
  return v;
}

function safeBodyFat(v: number | undefined): number | undefined {
  if (v == null || isNaN(v) || v <= 0 || v > 100) return undefined;
  return v;
}

function safeDuration(v: number | undefined): number | undefined {
  if (v == null || isNaN(v) || v <= 0 || v > 300) return undefined;
  return v;
}

// ---- Assessment empty state ----

function AssessmentEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-14 h-14 mb-4 rounded-[14px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(53,37,205,0.35)]">
        <Target size={24} className="text-white" />
      </div>
      <p className="text-[15px] font-semibold text-on-surface">
        Chưa có đánh giá ban đầu
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[320px]">
        Đánh giá ban đầu giúp HLV hiểu mục tiêu, thể trạng và trình độ của bạn để xây dựng kế hoạch phù hợp nhất.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <div className="flex flex-col gap-1.5 text-left">
          {["Mục tiêu tập luyện", "Thể trạng hiện tại", "Lịch tập phù hợp", "Thiết bị có sẵn"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[12.5px] text-on-surface-variant">
              <CheckCircle2 size={13} className="text-primary shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-colors"
        >
          <Plus size={14} />
          Tạo đánh giá ban đầu
        </button>
      </div>
    </div>
  );
}

// ---- Assessment View ----

function AssessmentView({ data }: { data: LearnerAssessment }) {
  const height = safeHeight(data.heightCm);
  const weight = safeWeight(data.weightKg);
  const bodyFat = safeBodyFat(data.bodyFatPercent);
  const duration = safeDuration(data.preferredSessionDurationMinutes);

  const metrics: {
    icon: LucideIcon;
    label: string;
    value: string | undefined;
    color: string;
  }[] = [
    {
      icon: Target,
      label: "Mục tiêu",
      value: data.goalType?.trim() || undefined,
      color: "from-primary to-[#7d6dff]",
    },
    {
      icon: Activity,
      label: "Trình độ",
      value: data.currentLevel?.trim() || undefined,
      color: "from-[#8b5cf6] to-[#c084fc]",
    },
    {
      icon: Ruler,
      label: "Chiều cao",
      value: height ? `${height} cm` : undefined,
      color: "from-[#10b981] to-[#34d399]",
    },
    {
      icon: Scale,
      label: "Cân nặng",
      value: weight ? `${weight} kg` : undefined,
      color: "from-[#f59e0b] to-[#fb923c]",
    },
    {
      icon: TrendingDown,
      label: "% mỡ cơ thể",
      value: bodyFat ? `${bodyFat}%` : undefined,
      color: "from-[#f43f5e] to-[#fb7185]",
    },
    {
      icon: CalendarDays,
      label: "Ngày tập/tuần",
      value: data.availableDaysPerWeek?.trim() || undefined,
      color: "from-primary to-[#7d6dff]",
    },
    {
      icon: Timer,
      label: "Thời lượng/buổi",
      value: duration ? `${duration} phút` : undefined,
      color: "from-[#8b5cf6] to-[#c084fc]",
    },
    {
      icon: Zap,
      label: "Thiết bị có sẵn",
      value: data.equipmentAvailable?.trim() || undefined,
      color: "from-[#10b981] to-[#34d399]",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 space-y-2"
          >
            <div
              className={cn(
                "w-7 h-7 rounded-[7px] flex items-center justify-center bg-gradient-to-br text-white",
                color,
              )}
            >
              <Icon size={13} />
            </div>
            <p className="text-[11px] text-on-surface-variant leading-tight">
              {label}
            </p>
            <p className="text-[13px] font-semibold text-on-surface truncate leading-tight">
              {value ?? (
                <span className="font-normal text-on-surface-variant/50 text-[12px]">
                  Chưa cập nhật
                </span>
              )}
            </p>
          </motion.div>
        ))}
      </div>

      {data.goalDescription?.trim() && (
        <div className="rounded-[10px] bg-primary/[0.04] border border-primary/10 p-3.5">
          <p className="text-[11px] font-medium text-primary mb-1 flex items-center gap-1">
            <Sparkles size={11} />
            Mô tả mục tiêu
          </p>
          <p className="text-body-sm text-on-surface">{data.goalDescription}</p>
        </div>
      )}

      {(data.injuryNotes?.trim() || data.healthNotes?.trim()) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.injuryNotes?.trim() && (
            <InfoCard label="Tiền sử chấn thương" value={data.injuryNotes} />
          )}
          {data.healthNotes?.trim() && (
            <InfoCard label="Lưu ý sức khỏe" value={data.healthNotes} />
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5">
      <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant mb-1.5">
        {label}
      </p>
      <p className="text-body-sm text-on-surface">{value}</p>
    </div>
  );
}

// ---- Assessment Form ----

const FIELD_CLS =
  "w-full h-10 px-3 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-sm transition-colors";

function AssessmentForm({
  bookingId,
  existing,
  onSaved,
  onCancel,
}: {
  bookingId: string;
  existing: LearnerAssessment | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<LearnerAssessment>(existing ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<LearnerAssessment>) =>
    setF((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  const save = async () => {
    if (!f.goalType?.trim()) {
      setError("Mục tiêu là bắt buộc.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.saveAssessment(
        bookingId,
        {
          goalType: f.goalType,
          goalDescription: f.goalDescription,
          heightCm: f.heightCm,
          weightKg: f.weightKg,
          bodyFatPercent: f.bodyFatPercent,
          currentLevel: f.currentLevel,
          healthNotes: f.healthNotes,
          injuryNotes: f.injuryNotes,
          trainingHistory: f.trainingHistory,
          availableDaysPerWeek: f.availableDaysPerWeek,
          preferredSessionDurationMinutes: f.preferredSessionDurationMinutes,
          equipmentAvailable: f.equipmentAvailable,
        },
        !!existing,
      );
      showSuccess("Đã lưu đánh giá thể lực.");
      onSaved();
    } catch (e) {
      showApiError(e);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Mục tiêu *">
          <input
            className={FIELD_CLS}
            value={f.goalType ?? ""}
            onChange={(e) => set({ goalType: e.target.value })}
            placeholder="Giảm cân / Tăng cơ…"
          />
        </Labeled>
        <Labeled label="Trình độ hiện tại">
          <input
            className={FIELD_CLS}
            value={f.currentLevel ?? ""}
            onChange={(e) => set({ currentLevel: e.target.value })}
            placeholder="Mới bắt đầu / Trung cấp…"
          />
        </Labeled>
        <Labeled label="Chiều cao (cm)">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.heightCm ?? ""}
            onChange={(e) => set({ heightCm: num(e.target.value) })}
          />
        </Labeled>
        <Labeled label="Cân nặng (kg)">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.weightKg ?? ""}
            onChange={(e) => set({ weightKg: num(e.target.value) })}
          />
        </Labeled>
        <Labeled label="% mỡ cơ thể">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.bodyFatPercent ?? ""}
            onChange={(e) => set({ bodyFatPercent: num(e.target.value) })}
          />
        </Labeled>
        <Labeled label="Số ngày tập/tuần">
          <input
            className={FIELD_CLS}
            value={f.availableDaysPerWeek ?? ""}
            onChange={(e) => set({ availableDaysPerWeek: e.target.value })}
            placeholder="VD: 3–4"
          />
        </Labeled>
        <Labeled label="Thời lượng mỗi buổi (phút)">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.preferredSessionDurationMinutes ?? ""}
            onChange={(e) =>
              set({ preferredSessionDurationMinutes: num(e.target.value) })
            }
          />
        </Labeled>
        <Labeled label="Thiết bị có sẵn">
          <input
            className={FIELD_CLS}
            value={f.equipmentAvailable ?? ""}
            onChange={(e) => set({ equipmentAvailable: e.target.value })}
            placeholder="Tạ tay, dây kháng lực…"
          />
        </Labeled>
      </div>
      <Labeled label="Mô tả mục tiêu">
        <textarea
          rows={2}
          className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
          value={f.goalDescription ?? ""}
          onChange={(e) => set({ goalDescription: e.target.value })}
        />
      </Labeled>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Tiền sử chấn thương">
          <textarea
            rows={2}
            className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
            value={f.injuryNotes ?? ""}
            onChange={(e) => set({ injuryNotes: e.target.value })}
          />
        </Labeled>
        <Labeled label="Lưu ý sức khỏe">
          <textarea
            rows={2}
            className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
            value={f.healthNotes ?? ""}
            onChange={(e) => set({ healthNotes: e.target.value })}
          />
        </Labeled>
      </div>
      {error && (
        <p className="text-body-sm text-[#ba1a1a]" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            Hủy
          </button>
        )}
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 bg-primary text-on-primary rounded-[7px] text-body-sm font-semibold hover:bg-[#2d20b8] disabled:opacity-60 inline-flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {existing ? "Cập nhật đánh giá" : "Lưu đánh giá"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Plan Tab
// ============================================================================

function PlanTab({ bookingId }: { bookingId: string }) {
  const { data, loading } = useApiResource(
    () => api.fetchTrainingPlan(bookingId),
    [bookingId],
  );
  const { data: assessment, loading: assessmentLoading } = useApiResource(
    () => api.fetchAssessment(bookingId),
    [bookingId],
  );

  if (loading || assessmentLoading) {
    return (
      <SectionShell icon={ClipboardList} title="Kế hoạch tập luyện">
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      </SectionShell>
    );
  }

  if (!data) {
    return (
      <SectionShell icon={ClipboardList} title="Kế hoạch tập luyện">
        <PlanEmptyState hasAssessment={!!assessment} />
      </SectionShell>
    );
  }

  return (
    <SectionShell icon={ClipboardList} title="Kế hoạch tập luyện">
      <PlanView plan={data} />
    </SectionShell>
  );
}

function PlanEmptyState({ hasAssessment }: { hasAssessment: boolean }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-14 h-14 mb-4 rounded-[14px] bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(139,92,246,0.35)]">
        <ClipboardList size={24} className="text-white" />
      </div>
      {hasAssessment ? (
        <>
          <p className="text-[15px] font-semibold text-on-surface">
            HLV đang chuẩn bị kế hoạch cho bạn
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[300px]">
            Khi lộ trình được kích hoạt, nội dung chi tiết sẽ hiển thị tại đây.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.07] border border-primary/20 text-[11.5px] text-primary font-medium">
            <Sparkles size={12} />
            Đang chuẩn bị lộ trình
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-on-surface">
            Chưa có kế hoạch tập luyện
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[300px]">
            HLV sẽ tạo kế hoạch sau khi xem đánh giá ban đầu của bạn. Hãy điền đánh giá ở tab bên cạnh để bắt đầu.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11.5px] text-amber-700 font-medium">
            <Clock size={12} />
            Cần điền đánh giá ban đầu trước
          </div>
        </>
      )}
    </div>
  );
}

function PlanView({ plan }: { plan: TrainingPlan }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 rounded-[12px] bg-gradient-to-br from-primary/[0.04] to-[#8b5cf6]/[0.04] border border-primary/10">
        <div className="min-w-0">
          {plan.title && (
            <p className="text-[15px] font-semibold text-on-surface">
              {plan.title}
            </p>
          )}
          {plan.goalType && (
            <p className="text-body-sm text-primary font-medium mt-0.5">
              {plan.goalType}
            </p>
          )}
          {plan.overview && (
            <p className="text-body-sm text-on-surface-variant mt-2 max-w-prose">
              {plan.overview}
            </p>
          )}
        </div>
        <div className="flex flex-row sm:flex-col gap-3 sm:gap-1.5 shrink-0">
          <div className="text-body-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface tabular-nums">
              {plan.totalWeeks}
            </span>{" "}
            tuần
          </div>
          {plan.startDate && (
            <div className="text-[11px] text-on-surface-variant tabular-nums whitespace-nowrap">
              {formatDateVi(plan.startDate)} —{" "}
              {formatDateVi(plan.endDate)}
            </div>
          )}
        </div>
      </div>

      {plan.readOnlyReason && (
        <p className="text-body-sm text-on-surface-variant bg-surface-container-low rounded-[8px] px-3 py-2">
          {plan.readOnlyReason}
        </p>
      )}

      <div className="space-y-2">
        {plan.weeks.map((w, i) => (
          <WeekAccordion key={w.id} week={w} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function WeekAccordion({
  week,
  defaultOpen,
}: {
  week: PlanWeek;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const totalExercises = week.days.reduce(
    (sum, d) => sum + d.exercises.length,
    0,
  );

  return (
    <div className="border border-[var(--color-border-soft)] rounded-[12px] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low/60 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-white tabular-nums">
            {week.weekNumber}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13.5px] font-semibold text-on-surface">
            Tuần {week.weekNumber}
          </span>
          {week.focus && (
            <span className="text-on-surface-variant text-[13.5px]">
              {" "}
              — {week.focus}
            </span>
          )}
          <span className="ml-2 text-[11px] text-on-surface-variant">
            {week.days.length} ngày · {totalExercises} bài
          </span>
        </div>
        <ChevronDown
          size={15}
          className={cn(
            "text-on-surface-variant transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-border-soft)] divide-y divide-[var(--color-border-soft)]">
          {week.days.map((d) => (
            <div key={d.id} className="px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Ngày {d.dayNumber}
                </span>
                {d.title && (
                  <>
                    <ChevronRight
                      size={12}
                      className="text-on-surface-variant/40 shrink-0"
                    />
                    <span className="text-[12.5px] font-medium text-on-surface">
                      {d.title}
                    </span>
                  </>
                )}
              </div>

              {d.exercises.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant italic">
                  Nghỉ / phục hồi
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-body-sm min-w-[360px]">
                    <thead>
                      <tr>
                        <th className="text-left pb-2 text-[11px] font-medium text-on-surface-variant w-[40%]">
                          Bài tập
                        </th>
                        <th className="text-center pb-2 text-[11px] font-medium text-on-surface-variant">
                          Set × Rep
                        </th>
                        <th className="text-center pb-2 text-[11px] font-medium text-on-surface-variant hidden sm:table-cell">
                          Cường độ
                        </th>
                        <th className="text-center pb-2 text-[11px] font-medium text-on-surface-variant hidden sm:table-cell">
                          Nghỉ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {d.exercises.map((ex) => (
                        <tr key={ex.id}>
                          <td className="py-2 pr-3">
                            <span className="font-medium text-on-surface">
                              {ex.name}
                            </span>
                            {ex.notes && (
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {ex.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-2 text-center tabular-nums text-on-surface">
                            {ex.sets && ex.reps
                              ? `${ex.sets} × ${ex.reps}`
                              : ex.sets
                                ? `${ex.sets} set`
                                : (ex.reps ?? "—")}
                          </td>
                          <td className="py-2 text-center text-on-surface-variant hidden sm:table-cell">
                            {ex.intensity ?? "—"}
                          </td>
                          <td className="py-2 text-center tabular-nums text-on-surface-variant hidden sm:table-cell">
                            {ex.restSeconds ? `${ex.restSeconds}s` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Check-ins Tab
// ============================================================================

const CHECK_IN_PAGE_SIZE = 10;

function CheckInsTab({ bookingId }: { bookingId: string }) {
  const [page, setPage] = useState(1);
  const [allCheckIns, setAllCheckIns] = useState<ProgressCheckIn[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, loading, refetch } = useApiResource(
    () =>
      api.fetchProgressCheckIns(bookingId, {
        pageNumber: 1,
        pageSize: CHECK_IN_PAGE_SIZE,
      }),
    [bookingId],
  );
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data) {
      setAllCheckIns(data.items);
      setHasNext(data.hasNext);
      setPage(1);
    }
  }, [data]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await api.fetchProgressCheckIns(bookingId, {
        pageNumber: page + 1,
        pageSize: CHECK_IN_PAGE_SIZE,
      });
      setAllCheckIns((prev) => [...prev, ...next.items]);
      setHasNext(next.hasNext);
      setPage((p) => p + 1);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <SectionShell
      icon={HeartPulse}
      title="Nhật ký tiến độ"
      action={
        allCheckIns.length > 0 || adding ? (
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-primary text-on-primary text-[12px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.4)] hover:bg-[#2d20b8] transition-colors"
          >
            <Plus size={13} />
            Thêm check-in
          </button>
        ) : undefined
      }
    >
      {allCheckIns.length > 0 && !loading && (
        <CheckInStatsStrip checkIns={allCheckIns} />
      )}

      {adding && (
        <CheckInForm
          bookingId={bookingId}
          onSaved={() => {
            refetch();
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      ) : allCheckIns.length === 0 && !adding ? (
        <CheckInsEmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div className="space-y-2">
          {allCheckIns.map((c, i) => (
            <CheckInCard key={c.id} c={c} index={i} />
          ))}
        </div>
      )}

      {hasNext && (
        <button
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] border border-dashed border-[var(--color-border-soft)] text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          {loadingMore ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} />
          )}
          Tải thêm
        </button>
      )}
    </SectionShell>
  );
}

function CheckInStatsStrip({ checkIns }: { checkIns: ProgressCheckIn[] }) {
  const latestWeight = checkIns.find((c) => c.weightKg != null)?.weightKg;
  const latestWaist = checkIns.find((c) => c.waistCm != null)?.waistCm;
  const latestCoachFeedback = checkIns.find(
    (c) => c.coachFeedback,
  )?.coachFeedback;

  return (
    <div className="mb-4 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={Scale}
          label="Cân nặng mới nhất"
          value={latestWeight != null ? `${latestWeight} kg` : "—"}
          colorClass="text-emerald-600 bg-emerald-50"
        />
        <StatTile
          icon={Activity}
          label="Vòng eo mới nhất"
          value={latestWaist != null ? `${latestWaist} cm` : "—"}
          colorClass="text-[#8b5cf6] bg-[#8b5cf6]/[0.06]"
        />
        <StatTile
          icon={CheckCircle2}
          label="Tổng check-in"
          value={`${checkIns.length} lần`}
          colorClass="text-primary bg-primary/[0.06]"
        />
      </div>
      {latestCoachFeedback && (
        <div className="rounded-[10px] border border-primary/10 bg-primary/[0.04] p-3 flex items-start gap-2.5">
          <MessageSquare size={13} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-medium text-primary mb-0.5">
              Nhận xét mới nhất từ HLV
            </p>
            <p className="text-body-sm text-on-surface">
              {latestCoachFeedback}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className={cn("rounded-[10px] p-3 space-y-1.5", colorClass)}>
      <Icon size={14} />
      <p className="text-[18px] font-bold tabular-nums text-on-surface leading-none">
        {value}
      </p>
      <p className="text-[10.5px] text-on-surface-variant leading-tight">
        {label}
      </p>
    </div>
  );
}

function CheckInsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-14 h-14 mb-4 rounded-[14px] bg-gradient-to-br from-[#f43f5e] to-[#fb7185] flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(244,63,94,0.4)]">
        <HeartPulse size={22} className="text-white" />
      </div>
      <p className="text-[15px] font-semibold text-on-surface">
        Chưa có lần check-in nào
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[300px]">
        Ghi lại cân nặng, cảm nhận và tiến độ để HLV theo dõi hành trình tập luyện của bạn.
      </p>
      {/* What to track */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 text-left max-w-[260px]">
        {["Cân nặng", "Mức năng lượng", "Cảm nhận sau buổi tập", "Ghi chú cho HLV"].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] shrink-0" />
            {item}
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-colors"
      >
        <Plus size={14} />
        Thêm check-in đầu tiên
      </button>
    </div>
  );
}

function CheckInCard({
  c,
  index,
}: {
  c: ProgressCheckIn;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays size={12} className="text-primary" />
        </div>
        <span className="text-[13px] font-semibold text-on-surface">
          {new Date(c.checkInDate).toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "numeric",
            month: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {c.weightKg != null && (
          <Metric label="Cân nặng" value={`${c.weightKg} kg`} />
        )}
        {c.bodyFatPercent != null && (
          <Metric label="% mỡ" value={`${c.bodyFatPercent}%`} />
        )}
        {c.waistCm != null && (
          <Metric label="Vòng eo" value={`${c.waistCm} cm`} />
        )}
        {c.energyLevel && (
          <Metric label="Năng lượng" value={c.energyLevel} />
        )}
        {c.sleepQuality && (
          <Metric label="Giấc ngủ" value={c.sleepQuality} />
        )}
      </div>

      {c.learnerNote && (
        <p className="text-body-sm text-on-surface-variant border-t border-[var(--color-border-soft)] pt-2 mt-2">
          {c.learnerNote}
        </p>
      )}
      {c.coachFeedback && (
        <div className="mt-2 flex items-start gap-2 rounded-[8px] bg-primary/[0.04] p-2.5 border border-primary/10">
          <MessageSquare size={12} className="text-primary mt-0.5 shrink-0" />
          <p className="text-body-sm text-on-surface">{c.coachFeedback}</p>
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[11px] text-on-surface-variant">{label}:</span>
      <span className="text-[13px] font-semibold tabular-nums text-on-surface">
        {value}
      </span>
    </div>
  );
}

function CheckInForm({
  bookingId,
  onSaved,
  onCancel,
}: {
  bookingId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.createProgressCheckIn(bookingId, {
        checkInDate: new Date(date).toISOString(),
        weightKg: weight === "" ? undefined : Number(weight),
        bodyFatPercent: bodyFat === "" ? undefined : Number(bodyFat),
        waistCm: waist === "" ? undefined : Number(waist),
        energyLevel: energy || undefined,
        sleepQuality: sleep || undefined,
        learnerNote: note || undefined,
      });
      showSuccess("Đã lưu check-in thành công.");
      onSaved();
    } catch (e) {
      showApiError(e);
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-4 rounded-[12px] border border-primary/20 bg-primary/[0.02] space-y-3">
      <p className="text-[13px] font-semibold text-on-surface">
        Check-in mới
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <Labeled label="Ngày">
          <input
            type="date"
            className={FIELD_CLS}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Labeled>
        <Labeled label="Cân nặng (kg)">
          <input
            type="number"
            className={FIELD_CLS}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Labeled>
        <Labeled label="% mỡ cơ thể">
          <input
            type="number"
            className={FIELD_CLS}
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
          />
        </Labeled>
        <Labeled label="Vòng eo (cm)">
          <input
            type="number"
            className={FIELD_CLS}
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
          />
        </Labeled>
        <Labeled label="Năng lượng">
          <input
            className={FIELD_CLS}
            value={energy}
            onChange={(e) => setEnergy(e.target.value)}
            placeholder="Tốt / Mệt…"
          />
        </Labeled>
        <Labeled label="Giấc ngủ">
          <input
            className={FIELD_CLS}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="Tốt / Khó ngủ…"
          />
        </Labeled>
      </div>
      <Labeled label="Ghi chú">
        <input
          className={FIELD_CLS}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Cảm giác sau buổi tập…"
        />
      </Labeled>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 bg-primary text-on-primary rounded-[7px] text-body-sm font-semibold hover:bg-[#2d20b8] disabled:opacity-60 inline-flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Lưu
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Empty / Loading / Error states
// ============================================================================

function NoBookingsState() {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-20 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(53,37,205,0.35)]">
        <Dumbbell size={22} className="text-white" />
      </div>
      <p className="text-[15px] font-semibold text-on-surface">
        Bạn chưa có gói tập nào
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[280px] mx-auto">
        Hãy chọn một HLV phù hợp để bắt đầu lộ trình tập luyện của bạn.
      </p>
      <Link
        href="/learner/coaches"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-colors"
      >
        Tìm huấn luyện viên
      </Link>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <div className="max-w-[1040px] mx-auto pb-10">
      {/* Header skeleton */}
      <div className="mb-5 space-y-2">
        <div className="h-7 w-48 rounded-[8px] bg-surface-container-high animate-pulse" />
        <div className="h-4 w-72 rounded-[6px] bg-surface-container-high animate-pulse" />
      </div>
      <div className="flex gap-5">
        {/* Left navigator skeleton */}
        <div className="hidden lg:block w-[300px] shrink-0">
          <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 space-y-2">
            <div className="h-4 w-28 rounded bg-surface-container-high animate-pulse mb-3" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[11px] border border-[var(--color-border-soft)] p-3 space-y-2"
              >
                <div className="h-3 w-32 rounded bg-surface-container-high animate-pulse" />
                <div className="h-2 w-20 rounded bg-surface-container-high animate-pulse" />
                <div className="h-1 w-full rounded-full bg-surface-container-high animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Right detail skeleton */}
        <div className="flex-1 space-y-4">
          <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest h-36 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest h-16 animate-pulse"
              />
            ))}
          </div>
          <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest h-20 animate-pulse" />
          <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest h-12 animate-pulse" />
          <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest h-48 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Shared primitives
// ============================================================================

function SectionShell({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.05)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shrink-0">
            <Icon size={15} className="text-white" />
          </div>
          <h2 className="text-[15px] font-semibold tracking-tight text-on-surface">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
