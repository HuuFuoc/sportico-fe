"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  User,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn, formatCurrency, avatarFor } from "@/lib/utils";
import type {
  Booking,
  LearnerAssessment,
  PlanWeek,
  ProgressCheckIn,
  TrainingPlan,
} from "@/types";

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
// Root content
// ============================================================================

type PlanTab = "assessment" | "plan" | "checkins";

function LearnerPlanContent() {
  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyBookings(), []);
  const bookings = useMemo(() => bookingsData ?? [], [bookingsData]);

  const searchParams = useSearchParams();
  const paramBookingId = searchParams.get("booking") ?? "";
  const paramTab = (searchParams.get("tab") as PlanTab) ?? "assessment";

  const [bookingId, setBookingId] = useState(paramBookingId);
  const [activeTab, setActiveTab] = useState<PlanTab>(paramTab);

  useEffect(() => {
    if (!bookings.length) return;
    if (bookingId && bookings.some((b) => b.id === bookingId)) return;
    setBookingId(bookings[0].id);
  }, [bookings, bookingId]);

  if (loading) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <LoadingState label="Đang tải lộ trình…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  const selectedBooking = bookings.find((b) => b.id === bookingId) ?? null;

  return (
    <AppShell role="learner" title="Lộ trình">
      <div className="max-w-[880px] mx-auto space-y-5 pb-10">
        <PageHeader
          bookings={bookings}
          selectedBookingId={bookingId}
          onSelectBooking={setBookingId}
        />

        {bookings.length === 0 ? (
          <NoBookingsState />
        ) : selectedBooking ? (
          <>
            <PackageOverviewCard
              booking={selectedBooking}
              onCheckIn={() => setActiveTab("checkins")}
              onAssess={() => setActiveTab("assessment")}
            />
            <CoachContextStrip booking={selectedBooking} />
            <QuickStatusCards
              bookingId={bookingId}
              onTabChange={setActiveTab}
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
    </AppShell>
  );
}

// ============================================================================
// Page Header
// ============================================================================

function PageHeader({
  bookings,
  selectedBookingId,
  onSelectBooking,
}: {
  bookings: Booking[];
  selectedBookingId: string;
  onSelectBooking: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
    >
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
          Lộ trình tập luyện
        </h1>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Theo dõi đánh giá ban đầu, kế hoạch tập và tiến độ của bạn
        </p>
      </div>
      {bookings.length > 1 && (
        <div className="relative shrink-0">
          <select
            value={selectedBookingId}
            onChange={(e) => onSelectBooking(e.target.value)}
            className="appearance-none h-9 pl-3 pr-8 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[8px] text-body-sm outline-none focus:border-primary transition-colors shadow-sm"
          >
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
          />
        </div>
      )}
    </motion.header>
  );
}

// ============================================================================
// Coach Context Strip — shows HLV info + payment meta below overview card
// ============================================================================

function CoachContextStrip({ booking }: { booking: Booking }) {
  const { data: coach } = useApiResource(
    () => api.fetchCoach(booking.coachId),
    [booking.coachId],
  );

  const coachName =
    coach?.name ?? `Coach ${booking.coachId.slice(0, 4).toUpperCase()}`;
  const coachAvatar = coach?.avatarUrl ?? avatarFor(booking.coachId);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-3">
      {/* HLV phụ trách */}
      <div className="flex items-center gap-2.5">
        <img
          src={coachAvatar}
          alt={coachName}
          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[var(--color-border-soft)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = avatarFor(booking.coachId);
          }}
        />
        <div>
          <p className="text-[10.5px] text-on-surface-variant">HLV phụ trách</p>
          <p className="text-[13px] font-semibold text-on-surface leading-tight">
            {coachName}
          </p>
        </div>
      </div>

      <div className="h-7 w-px bg-[var(--color-border-soft)] hidden sm:block" />

      {/* Ngày thanh toán */}
      <div>
        <p className="text-[10.5px] text-on-surface-variant">Ngày thanh toán</p>
        <p className="text-[13px] font-semibold text-on-surface tabular-nums leading-tight">
          {booking.paidAt
            ? new Date(booking.paidAt).toLocaleDateString("vi-VN")
            : "Chưa cập nhật"}
        </p>
      </div>

      <div className="h-7 w-px bg-[var(--color-border-soft)] hidden sm:block" />

      {/* Tổng thanh toán */}
      <div>
        <p className="text-[10.5px] text-on-surface-variant">Tổng thanh toán</p>
        <p className="text-[13px] font-semibold text-on-surface tabular-nums leading-tight">
          {booking.totalAmount > 0
            ? formatCurrency(booking.totalAmount)
            : "Chưa cập nhật"}
        </p>
      </div>

      {/* Learner identity (fallback) — hidden visually, useful for debugging */}
      {booking.learnerId && (
        <>
          <div className="h-7 w-px bg-[var(--color-border-soft)] hidden sm:block" />
          <div className="flex items-center gap-2">
            <User size={13} className="text-on-surface-variant shrink-0" />
            <p className="text-[12px] text-on-surface-variant font-mono tabular-nums">
              #{booking.learnerId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Quick Status Cards — 3 tiles showing assessment / plan / check-in status
// ============================================================================

function QuickStatusCards({
  bookingId,
  onTabChange,
}: {
  bookingId: string;
  onTabChange: (tab: PlanTab) => void;
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
  const latestCheckIn = checkInsData?.items[0];
  const planStatus = plan?.status?.toLowerCase() ?? null;

  type TileStatus = "ok" | "warn" | "missing" | "info";
  const TILE_COLOR: Record<TileStatus, string> = {
    ok: "text-emerald-700 bg-emerald-50 border-emerald-100",
    warn: "text-amber-700 bg-amber-50 border-amber-100",
    missing: "text-on-surface-variant bg-surface-container-low border-[var(--color-border-soft)]",
    info: "text-primary bg-primary/[0.07] border-primary/10",
  };

  const getPlanLabel = (): { label: string; sub?: string; tileStatus: TileStatus } => {
    if (pLoading) return { label: "Đang tải…", tileStatus: "missing" };
    if (!plan) return { label: "Chưa có kế hoạch", sub: "Đang chờ HLV tạo", tileStatus: "warn" };
    switch (planStatus) {
      case "active": return { label: "Đang thực hiện", tileStatus: "ok" };
      case "completed": return { label: "Đã hoàn thành", tileStatus: "info" };
      case "draft": return { label: "Bản nháp", sub: "HLV đang soạn", tileStatus: "warn" };
      case "cancelled": return { label: "Đã hủy", tileStatus: "missing" };
      default: return { label: planStatus ?? "Không rõ", tileStatus: "missing" };
    }
  };

  const planMeta = getPlanLabel();

  const tiles: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub?: string;
    tileStatus: TileStatus;
    tab: PlanTab;
  }[] = [
    {
      icon: Target,
      label: "Đánh giá ban đầu",
      value: aLoading ? "Đang tải…" : assessment ? "Đã hoàn thành" : "Chưa có",
      sub: !aLoading && !assessment ? "Nhấn để điền đánh giá" : undefined,
      tileStatus: aLoading ? "missing" : assessment ? "ok" : "warn",
      tab: "assessment",
    },
    {
      icon: ClipboardList,
      label: "Kế hoạch tập",
      value: pLoading
        ? "Đang tải…"
        : !plan && assessment
          ? "Đang soạn kế hoạch"
          : planMeta.label,
      sub: pLoading
        ? undefined
        : !plan && assessment
          ? "HLV đang chuẩn bị lộ trình"
          : planMeta.sub,
      tileStatus: pLoading
        ? "missing"
        : !plan && assessment
          ? "info"
          : planMeta.tileStatus,
      tab: "plan",
    },
    {
      icon: HeartPulse,
      label: "Check-in tiến độ",
      value: cLoading ? "Đang tải…" : `${checkInCount} lần`,
      sub: !cLoading
        ? latestCheckIn
          ? `Gần nhất: ${new Date(latestCheckIn.checkInDate).toLocaleDateString("vi-VN")}`
          : checkInCount === 0
            ? "Chưa check-in lần nào"
            : undefined
        : undefined,
      tileStatus: cLoading ? "missing" : checkInCount > 0 ? "ok" : "missing",
      tab: "checkins",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {tiles.map(({ icon: Icon, label, value, sub, tileStatus, tab }, i) => (
        <motion.button
          key={label}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.05, duration: 0.25 }}
          onClick={() => onTabChange(tab)}
          className={cn(
            "group text-left rounded-[12px] border p-3.5 transition-all hover:-translate-y-[1px] hover:shadow-sm",
            TILE_COLOR[tileStatus],
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} className="shrink-0" />
            <p className="text-[11.5px] font-medium opacity-80">{label}</p>
          </div>
          <p className="text-[14px] font-semibold leading-snug">{value}</p>
          {sub && (
            <p className="text-[11px] mt-0.5 opacity-70 leading-tight">{sub}</p>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ============================================================================
// Package Overview Card
// ============================================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
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
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.active;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium",
        cfg.bg,
        cfg.color,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function PackageOverviewCard({
  booking,
  onCheckIn,
  onAssess,
}: {
  booking: Booking;
  onCheckIn: () => void;
  onAssess: () => void;
}) {
  const reduce = useReducedMotion();
  const pct = booking.totalSessions
    ? Math.round((booking.completedSessions / booking.totalSessions) * 100)
    : 0;
  const remaining = booking.totalSessions - booking.completedSessions;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.06)]"
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary via-[#7d6dff] to-[#c084fc]" />
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-semibold text-on-surface truncate">
                {booking.title}
              </h2>
              <StatusBadge status={booking.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Dumbbell size={13} className="text-primary shrink-0" />
                <span className="tabular-nums font-semibold text-on-surface">
                  {booking.completedSessions}
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
                  <span>
                    Thanh toán{" "}
                    <span className="tabular-nums text-on-surface font-medium">
                      {new Date(booking.paidAt).toLocaleDateString("vi-VN")}
                    </span>
                  </span>
                </span>
              )}
              {booking.totalAmount > 0 && (
                <span className="flex items-center gap-1.5 tabular-nums font-semibold text-on-surface">
                  {formatCurrency(booking.totalAmount)}
                </span>
              )}
            </div>

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

          <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2 shrink-0">
            <button
              onClick={onCheckIn}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-all hover:-translate-y-[1px] active:translate-y-0"
            >
              <HeartPulse size={14} />
              Check-in hôm nay
            </button>
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
// Tab Navigation
// ============================================================================

const TABS: { id: PlanTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: "assessment", label: "Đánh giá ban đầu", shortLabel: "Đánh giá", icon: Target },
  { id: "plan", label: "Kế hoạch tập", shortLabel: "Kế hoạch", icon: ClipboardList },
  { id: "checkins", label: "Nhật ký tiến độ", shortLabel: "Nhật ký", icon: HeartPulse },
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
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu đánh giá thất bại.");
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
  // Use assessment as a proxy to distinguish "draft plan exists" from "no plan yet".
  // Backend hides draft plans from learners, so if plan=null we check assessment
  // to show the appropriate message.
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
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-14 h-14 mb-4 rounded-[14px] bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(139,92,246,0.35)]">
        <ClipboardList size={24} className="text-white" />
      </div>
      {hasAssessment ? (
        <>
          <p className="text-[15px] font-semibold text-on-surface">
            HLV đang soạn kế hoạch tập cho bạn
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[300px]">
            Khi lộ trình được kích hoạt, nội dung sẽ hiển thị tại đây.
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
            HLV sẽ tạo kế hoạch sau khi xem đánh giá ban đầu của bạn. Hãy điền đánh giá để bắt đầu.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11.5px] text-amber-700 font-medium">
            <Clock size={12} />
            Cần điền đánh giá ban đầu
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
              {new Date(plan.startDate).toLocaleDateString("vi-VN")} —{" "}
              {new Date(plan.endDate).toLocaleDateString("vi-VN")}
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
        <button
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-primary text-on-primary text-[12px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.4)] hover:bg-[#2d20b8] transition-colors"
        >
          <Plus size={13} />
          Thêm check-in
        </button>
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
    <div className="flex flex-col items-center py-10 text-center">
      <div className="w-12 h-12 mb-3 rounded-[12px] bg-gradient-to-br from-[#f43f5e] to-[#fb7185] flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(244,63,94,0.4)]">
        <HeartPulse size={20} className="text-white" />
      </div>
      <p className="text-[14.5px] font-semibold text-on-surface">
        Chưa có lần check-in nào
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[260px]">
        Ghi lại cân nặng, cảm giác và tiến độ để theo dõi hành trình tập luyện.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-primary text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(53,37,205,0.5)] hover:bg-[#2d20b8] transition-colors"
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
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
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
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu check-in thất bại.");
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
      {error && (
        <p className="text-body-sm text-[#ba1a1a]" role="alert">
          {error}
        </p>
      )}
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
// No Bookings
// ============================================================================

function NoBookingsState() {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-[14px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(53,37,205,0.35)]">
        <Dumbbell size={22} className="text-white" />
      </div>
      <p className="text-[15px] font-semibold text-on-surface">
        Chưa có gói tập nào
      </p>
      <p className="text-body-sm text-on-surface-variant mt-1.5 max-w-[280px] mx-auto">
        Đặt một gói huấn luyện để bắt đầu lộ trình của bạn.
      </p>
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
      <div className="flex items-center justify-between gap-2 mb-5">
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
