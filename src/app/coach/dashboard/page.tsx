"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  Flame,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { api } from "@/lib/api";
import { devUserIdForRole } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/auth-session";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
// NOW is the deterministic mock "today" anchor (see @/lib/mock/clock).
// TODO(api): once the backend returns real timestamps, use `new Date()` here.
import { NOW } from "@/lib/mock/clock";
import { cn, formatCurrency, initials } from "@/lib/utils";
import type { Session, Learner } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

// Deterministic pseudo-random for stable SSR-friendly sparklines
function seedSpark(seed: number, base: number, jitter: number, len = 8) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 5) + noise) };
  });
}

const WEEK_BARS = [
  { day: "T2", sessions: 4 },
  { day: "T3", sessions: 6 },
  { day: "T4", sessions: 3 },
  { day: "T5", sessions: 7 },
  { day: "T6", sessions: 5 },
  { day: "T7", sessions: 8 },
  { day: "CN", sessions: 2 },
];

const EARNINGS_TREND = [
  { m: "Jan", v: 2800 },
  { m: "Feb", v: 3100 },
  { m: "Mar", v: 3450 },
  { m: "Apr", v: 3200 },
  { m: "May", v: 3700 },
  { m: "Jun", v: 4100 },
  { m: "Jul", v: 4250 },
];

const ENGAGEMENT_SEGMENTS = [
  { name: "Đang hoạt động", value: 18, color: "#4f46e5" },
  { name: "Tích cực", value: 9, color: "#8b5cf6" },
  { name: "Có nguy cơ", value: 5, color: "#f59e0b" },
  { name: "Không hoạt động", value: 3, color: "#94a3b8" },
];

export default function CoachDashboardPage() {
  // Use the real user ID from the JWT when in live mode; fall back to the
  // dev hard-code so mock mode (no NEXT_PUBLIC_API_BASE_URL) keeps working.
  const coachId = getCurrentUserId() ?? devUserIdForRole("coach");
  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchCoach(coachId),
        api.fetchUpcoming({ coachId }),
        api.fetchLearners(),
        api.fetchCoachDashboard(), // real aggregate metrics (null in mock mode)
      ]),
    [coachId],
  );
  const coach = data?.[0];
  const upcomingAll = useMemo(() => data?.[1] ?? [], [data]);
  const learners = useMemo(() => data?.[2] ?? [], [data]);
  /** Real dashboard metrics — non-null in live mode, null in mock/demo mode. */
  const dashStats = data?.[3] ?? null;

  const learnerById = useMemo(
    () => new Map(learners.map((l) => [l.id, l])),
    [learners],
  );
  const reduce = useReducedMotion();

  const upcoming = useMemo(() => upcomingAll.slice(0, 5), [upcomingAll]);
  const todaySessions = useMemo(
    () =>
      upcomingAll.filter(
        (s) => new Date(s.start).toDateString() === NOW.toDateString(),
      ),
    [upcomingAll],
  );
  const recentLearners = useMemo(() => learners.slice(0, 5), [learners]);

  // In live mode use dashboard pending-withdrawal count; in mock mode keep 3
  const followUpCount = dashStats?.pendingWithdrawalRequests ?? 3;
  const hour = new Date(NOW).getHours();
  const greeting =
    hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  if (loading) {
    return (
      <AppShell role="coach" title="Dashboard">
        <LoadingState label="Đang tải bảng điều khiển…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Dashboard">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="Dashboard">
      <div className="max-w-[1340px] mx-auto space-y-6">
        {/* ============ HERO ============ */}
        <Hero
          coachName={coach?.name.split(" ")[0] ?? "HLV"}
          greeting={greeting}
          todayCount={todaySessions.length}
          followUpCount={followUpCount}
          reduce={reduce ?? false}
        />

        {/* ============ STATS ROW ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Users}
            label="Gói đang học"
            value={dashStats?.activeBookings ?? coach?.activeLearners ?? 0}
            trend={dashStats ? `${dashStats.completedBookings} hoàn thành` : undefined}
            accent="indigo"
            spark={seedSpark(1, 18, 4)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <StatCard
            icon={CalendarPlus}
            label="Buổi tập sắp tới"
            value={dashStats?.upcomingSessions ?? upcoming.length}
            trend={dashStats ? `${dashStats.requestedSessions} chờ xác nhận` : "Ổn định"}
            accent="violet"
            spark={seedSpark(2, 5, 3)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <StatCard
            icon={Star}
            label="Tỷ lệ hoàn thành"
            value={dashStats ? `${Math.round(dashStats.sessionCompletionRate * 100)}%` : (coach?.rating.toFixed(1) ?? "—")}
            trend={dashStats ? `${dashStats.completedSessions} buổi xong` : `${coach?.reviewCount ?? 0} đánh giá`}
            accent="amber"
            spark={seedSpark(3, 4.7, 0.2)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <StatCard
            icon={DollarSign}
            label="Ví khả dụng"
            value={dashStats ? formatCurrency(dashStats.availableBalance) : formatCurrency(coach?.totalEarningsThisMonth ?? 0)}
            trend={dashStats ? `${formatCurrency(dashStats.pendingBalance)} đang chờ` : undefined}
            accent="emerald"
            spark={seedSpark(4, 3200, 400)}
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5">
          {/* ============ LEFT COLUMN ============ */}
          <div className="space-y-5 min-w-0">
            {/* Analytics row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnalyticsCard
                title="Buổi tập"
                subtitle={dashStats ? `${dashStats.completedSessions} hoàn thành / ${dashStats.cancelledSessions} huỷ` : "Tuần này"}
                badge={dashStats ? `${dashStats.completedSessions + dashStats.upcomingSessions} tổng` : `${WEEK_BARS.reduce((a, b) => a + b.sessions, 0)} tổng (demo)`}
                delay={0.25}
                reduce={reduce ?? false}
              >
                <SessionsBarChart reduce={reduce ?? false} />
              </AnalyticsCard>

              <AnalyticsCard
                title="Thu nhập"
                subtitle={dashStats ? `Tổng: ${formatCurrency(dashStats.totalEarned)}` : "Xu hướng 7 tháng"}
                badge={dashStats ? `Đã rút: ${formatCurrency(dashStats.totalWithdrawn)}` : "+18% so năm ngoái (demo)"}
                badgeTone={dashStats ? undefined : "success"}
                delay={0.3}
                reduce={reduce ?? false}
              >
                <EarningsLineChart reduce={reduce ?? false} />
              </AnalyticsCard>

              <AnalyticsCard
                title="Gói tập"
                subtitle={dashStats ? "Phân tích gói tập" : "Trạng thái học viên"}
                badge={dashStats ? `${dashStats.activeBookings} đang hoạt động` : "Demo"}
                delay={0.35}
                reduce={reduce ?? false}
                className="md:col-span-2 xl:col-span-1"
              >
                <EngagementDonut reduce={reduce ?? false} />
              </AnalyticsCard>
            </div>

            {/* Today's schedule */}
            <TodaySchedule
              sessions={todaySessions}
              learnerById={learnerById}
              reduce={reduce ?? false}
            />

            {/* Recent learners */}
            <RecentLearners learners={recentLearners} reduce={reduce ?? false} />
          </div>

          {/* ============ RIGHT SIDEBAR ============ */}
          <aside className="space-y-5">
            <AICoachCard
              inactiveCount={followUpCount}
              reduce={reduce ?? false}
            />
            <UpcomingSessions
              sessions={upcoming}
              learnerById={learnerById}
              reduce={reduce ?? false}
            />
            <QuickActions reduce={reduce ?? false} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero({
  coachName,
  greeting,
  todayCount,
  followUpCount,
  reduce,
}: {
  coachName: string;
  greeting: string;
  todayCount: number;
  followUpCount: number;
  reduce: boolean;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border-soft)] bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/[0.04] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_12px_32px_-16px_rgba(15,15,30,0.08)]"
    >
      {/* Glow blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full bg-gradient-to-tr from-[#7d6dff]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
              <Sparkles size={11} />
              Bảng điều khiển
            </span>
            <span className="text-[12px] text-on-surface-variant">
              {new Date(NOW).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-[32px] sm:text-[36px] leading-[1.05] font-bold tracking-tight text-on-surface">
            {greeting}, {coachName}{" "}
            <span className="inline-block">👋</span>
          </h1>
          <p className="text-[14.5px] sm:text-[15px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Bạn có{" "}
            <span className="text-on-surface font-semibold">
              {todayCount} buổi tập
            </span>{" "}
            hôm nay và{" "}
            <span className="text-[#b95000] font-semibold">
              {followUpCount} học viên
            </span>{" "}
            cần theo dõi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/coach/messages"
            className="hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13.5px] font-medium transition-colors"
          >
            <MessageCircle size={15} />
            Tin nhắn
          </Link>
          <Link
            href="/coach/schedule"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Buổi mới
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

// ============================================================================
// Stat Card (with sparkline)
// ============================================================================

const STAT_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    decor: "from-primary/15 to-primary/0",
    stroke: "#4f46e5",
    trend: "text-primary",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    decor: "from-[#c084fc]/15 to-[#c084fc]/0",
    stroke: "#8b5cf6",
    trend: "text-[#7c3aed]",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
    stroke: "#f59e0b",
    trend: "text-[#b45309]",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
    stroke: "#10b981",
    trend: "text-[#1f7a4d]",
  },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  accent,
  spark,
  delay,
  reduce,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  trend?: string;
  trendLabel?: string;
  accent: keyof typeof STAT_ACCENTS;
  spark: { i: number; v: number }[];
  delay: number;
  reduce: boolean;
}) {
  const a = STAT_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow cursor-pointer"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
          a.decor,
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[12px] flex items-center justify-center text-white transition-transform group-hover:scale-105",
              a.iconBg,
              a.glow,
            )}
          >
            <Icon size={17} strokeWidth={2.25} />
          </div>
          <ArrowUpRight
            size={15}
            className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
          />
        </div>

        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </p>
        <p className="text-[26px] sm:text-[28px] leading-none font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>

        <div className="h-8 mt-3 -mx-1">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={spark}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={a.stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reduce}
                  animationDuration={reduce ? 0 : 1100}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>

        {(trend || trendLabel) && (
          <div className="flex items-center gap-1.5 mt-1 text-[11.5px]">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  a.trend,
                )}
              >
                <TrendingUp size={11} />
                {trend}
              </span>
            )}
            {trendLabel && (
              <span className="text-on-surface-variant">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Analytics Card wrapper
// ============================================================================

function AnalyticsCard({
  title,
  subtitle,
  badge,
  badgeTone = "neutral",
  children,
  delay,
  reduce,
  className,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "neutral" | "success";
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      className={cn(
        "rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[12px] text-on-surface-variant mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold",
              badgeTone === "success"
                ? "bg-success-container text-[#1f7a4d]"
                : "bg-surface-container-low text-on-surface-variant",
            )}
          >
            {badgeTone === "success" && <TrendingUp size={10} />}
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function SessionsBarChart({ reduce }: { reduce: boolean }) {
  const max = Math.max(...WEEK_BARS.map((b) => b.sessions));
  return (
    <div className="h-[140px] -mx-2">
      <ClientOnly fallback={<div className="h-full" />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={WEEK_BARS}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                <stop offset="100%" stopColor="#7d6dff" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="#777587"
              fontSize={10.5}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <Tooltip
              cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as {
                  day: string;
                  sessions: number;
                };
                return (
                  <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                    <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                      {p.day}
                    </p>
                    <p className="text-[14px] font-bold tabular-nums">
                      {p.sessions} buổi
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="sessions"
              fill="url(#barGrad)"
              radius={[6, 6, 2, 2]}
              isAnimationActive={!reduce}
              animationDuration={reduce ? 0 : 900}
            >
              {WEEK_BARS.map((b, i) => (
                <Cell
                  key={i}
                  fill={b.sessions === max ? "#4f46e5" : "url(#barGrad)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}

function EarningsLineChart({ reduce }: { reduce: boolean }) {
  const latest = EARNINGS_TREND[EARNINGS_TREND.length - 1].v;
  return (
    <div>
      <p className="text-[24px] font-bold tracking-tight tabular-nums leading-none">
        {formatCurrency(latest)}
      </p>
      <p className="text-[11px] text-on-surface-variant mt-0.5">
        in {EARNINGS_TREND[EARNINGS_TREND.length - 1].m}
      </p>
      <div className="h-[100px] mt-3 -mx-2">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={EARNINGS_TREND}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{
                  stroke: "#10b981",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { m: string; v: number };
                  return (
                    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                        {p.m}
                      </p>
                      <p className="text-[13px] font-bold tabular-nums">
                        {formatCurrency(p.v)}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#fff",
                  stroke: "#10b981",
                  strokeWidth: 2,
                }}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 1100}
              />
            </LineChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </div>
  );
}

function EngagementDonut({ reduce }: { reduce: boolean }) {
  const total = ENGAGEMENT_SEGMENTS.reduce((s, x) => s + x.value, 0);
  const active = ENGAGEMENT_SEGMENTS[0].value;
  const pct = Math.round((active / total) * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[110px] h-[110px] shrink-0">
        <ClientOnly fallback={<div className="w-full h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ENGAGEMENT_SEGMENTS}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={52}
                paddingAngle={3}
                cornerRadius={5}
                stroke="none"
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 900}
              >
                {ENGAGEMENT_SEGMENTS.map((seg, i) => (
                  <Cell key={i} fill={seg.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ClientOnly>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[18px] font-bold leading-none tabular-nums">
            {pct}%
          </p>
          <p className="text-[9px] uppercase tracking-wider font-medium text-on-surface-variant mt-0.5">
            Hoạt động
          </p>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0">
        {ENGAGEMENT_SEGMENTS.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-[12px]">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-on-surface-variant truncate">{s.name}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Today's Schedule
// ============================================================================

function TodaySchedule({
  sessions,
  learnerById,
  reduce,
}: {
  sessions: Session[];
  learnerById: Map<string, Learner>;
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.4, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight">
            Lịch hôm nay
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            {sessions.length === 0
              ? "Khối trống — lý tưởng để lập kế hoạch"
              : `${sessions.length} buổi đã lên lịch`}
          </p>
        </div>
        <Link
          href="/coach/schedule"
          className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Lịch
          <ChevronRight size={13} />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <CompactEmptyToday />
      ) : (
        <div className="relative pl-5">
          <span className="absolute left-1.5 top-1 bottom-1 w-px bg-gradient-to-b from-primary/40 via-[var(--color-border-soft)] to-transparent" />
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <TodayRow
                key={s.id}
                session={s}
                learner={learnerById.get(s.learnerId)}
                delay={i * 0.06}
                reduce={reduce}
              />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function CompactEmptyToday() {
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-surface-container-low/60 to-transparent border border-dashed border-[var(--color-border-soft)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(16,185,129,0.4)]">
        <Sparkles size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold leading-tight">
          Hôm nay không có buổi 🎉
        </p>
        <p className="text-[12.5px] text-on-surface-variant mt-1">
          Ngày trống — dùng để lập kế hoạch hoặc liên hệ học viên.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-95 transition-all">
          <Plus size={13} strokeWidth={2.5} />
          Tạo kế hoạch
        </button>
        <Link
          href="/coach/messages"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
        >
          <MessageCircle size={13} />
          Nhắn tin
        </Link>
      </div>
    </div>
  );
}

function TodayRow({
  session,
  learner,
  delay,
  reduce,
}: {
  session: Session;
  learner?: Learner;
  delay: number;
  reduce: boolean;
}) {
  const time = new Date(session.start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isOnline = session.location?.toLowerCase() === "online";
  return (
    <motion.article
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay, ease: EASE }}
      whileHover={reduce ? {} : { x: 2 }}
      className="relative flex items-center gap-4 p-3.5 rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/25 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.02] hover:to-transparent shadow-[0_1px_2px_rgba(15,15,30,0.03)] hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)] transition-all"
    >
      <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface-container-lowest border-2 border-primary shadow-[0_0_0_4px_rgba(53,37,205,0.08)]" />

      <div className="w-12 h-12 rounded-xl bg-surface-container-high overflow-hidden shrink-0">
        {learner?.avatarUrl ? (
          <img
            src={learner.avatarUrl}
            alt={learner.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-primary font-semibold">
            {initials(learner?.name ?? "?")}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold truncate">{learner?.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-on-surface-variant mt-1">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {time}
          </span>
          <span className="truncate">{session.title}</span>
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Video size={11} />
              Trực tuyến
            </span>
          ) : session.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {session.location}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <button className="h-9 px-3.5 rounded-lg border border-[var(--color-border-soft)] text-[12.5px] font-medium hover:bg-surface-container-low transition-colors">
          Chuẩn bị
        </button>
        <Link
          href={`/coach/session/${session.id}`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-95 transition-all"
        >
          Tham gia
          <Video size={12} />
        </Link>
      </div>
    </motion.article>
  );
}

// ============================================================================
// Recent Learners
// ============================================================================

function learnerRisk(l: Learner): {
  tag: string;
  tone: "warn" | "good" | "neutral";
} {
  if (l.streakDays >= 7) return { tag: "Chuỗi tốt", tone: "good" };
  if (l.streakDays === 0) return { tag: "Không hoạt động", tone: "warn" };
  if (l.totalHoursTrained < 10) return { tag: "Mới", tone: "neutral" };
  return { tag: "Đúng tiến độ", tone: "good" };
}

function RecentLearners({
  learners,
  reduce,
}: {
  learners: Learner[];
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.45, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight">
            Học viên gần đây
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Kiểm tra và theo dõi nhanh
          </p>
        </div>
        <Link
          href="/coach/learners"
          className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Tất cả học viên
          <ChevronRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {learners.map((l, i) => (
          <LearnerCard
            key={l.id}
            learner={l}
            delay={i * 0.05}
            reduce={reduce}
          />
        ))}
      </div>
    </motion.section>
  );
}

function LearnerCard({
  learner,
  delay,
  reduce,
}: {
  learner: Learner;
  delay: number;
  reduce: boolean;
}) {
  const risk = learnerRisk(learner);
  const tone =
    risk.tone === "warn"
      ? "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60"
      : risk.tone === "good"
        ? "bg-success-container text-[#1f7a4d] border-[#bce8c8]"
        : "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -2 }}
      className="group relative overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest p-4 transition-all shadow-[0_1px_2px_rgba(15,15,30,0.03)] hover:shadow-[0_6px_18px_-6px_rgba(15,15,30,0.12)]"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={learner.avatarUrl}
            alt={learner.name}
            className="w-11 h-11 rounded-full object-cover"
          />
          {learner.streakDays > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#ff8a3d] to-[#ff5e3d] border-2 border-surface-container-lowest flex items-center justify-center">
              <Flame size={9} className="text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold truncate">{learner.name}</p>
            <span
              className={cn(
                "shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
                tone,
              )}
            >
              {risk.tag}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11.5px] text-on-surface-variant mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Activity size={10} />
              {learner.totalHoursTrained}h
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame size={10} className="text-[#ff7a3d]" />
              {learner.streakDays} ngày liên tiếp
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Link
          href="/coach/messages"
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors"
        >
          <MessageCircle size={12} />
          Nhắn tin
        </Link>
        <Link
          href="/coach/schedule"
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12px] font-semibold shadow-[0_3px_8px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_12px_-2px_rgba(53,37,205,0.55)] transition-all"
        >
          <CalendarPlus size={12} />
          Lên lịch
        </Link>
      </div>
    </motion.article>
  );
}

// ============================================================================
// AI Coach card (sidebar)
// ============================================================================

function AICoachCard({
  inactiveCount,
  reduce,
}: {
  inactiveCount: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.2, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-gradient-to-br from-[#7d6dff]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary">
            Sportico AI · Phân tích Coaching
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-50" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_6px_16px_-3px_rgba(53,37,205,0.5)]">
              <Sparkles size={18} className="text-on-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] leading-snug font-semibold text-on-surface">
              <span className="text-[#b95000]">{inactiveCount} học viên</span>{" "}
              không hoạt động 14+ ngày.
            </p>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
              Một tin nhắn cá nhân hóa giúp tăng tái tương tác lên{" "}
              <span className="text-on-surface font-medium">32%</span>. AI sẽ
              soạn thảo tin nhắn phù hợp với mục tiêu từng học viên.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Send size={13} />
            Gửi ngay
          </button>
          <button className="h-10 px-4 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-lowest text-[12.5px] font-medium transition-colors">
            Xem trước
          </button>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-primary" />
            <span className="text-on-surface-variant">Tiếp cận</span>
            <span className="font-semibold">{inactiveCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-[#10b981]" />
            <span className="text-on-surface-variant">Thu hút lại</span>
            <span className="font-semibold">+32%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-[#f59e0b]" />
            <span className="text-on-surface-variant">Ưu tiên</span>
            <span className="font-semibold">Cao</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Upcoming Sessions (sidebar)
// ============================================================================

function UpcomingSessions({
  sessions,
  learnerById,
  reduce,
}: {
  sessions: Session[];
  learnerById: Map<string, Learner>;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.28, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold tracking-tight">
          Lịch tuần này
        </h3>
        <Link
          href="/coach/schedule"
          className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Quản lý
          <ChevronRight size={12} />
        </Link>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-[13px] font-medium">Không có buổi sắp tới</p>
            <p className="text-[11.5px] text-on-surface-variant mt-0.5">
              Đặt lịch để nhận đặt chỗ mới.
            </p>
          </div>
        ) : (
          sessions.map((s, i) => (
            <UpcomingRow
              key={s.id}
              session={s}
              learner={learnerById.get(s.learnerId)}
              delay={i * 0.05}
              reduce={reduce}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

function UpcomingRow({
  session,
  learner,
  delay,
  reduce,
}: {
  session: Session;
  learner?: Learner;
  delay: number;
  reduce: boolean;
}) {
  const date = new Date(session.start);
  const isToday = date.toDateString() === NOW.toDateString();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -2 }}
      className="group flex items-center gap-3 p-3 rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.02] hover:to-transparent cursor-pointer transition-all shadow-[0_1px_2px_rgba(15,15,30,0.03)] hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
    >
      <div className="text-center w-11 shrink-0">
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </p>
        <p
          className={cn(
            "text-[18px] font-bold leading-none tabular-nums mt-0.5",
            isToday ? "text-primary" : "text-on-surface",
          )}
        >
          {date.getDate()}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{session.title}</p>
        <p className="text-[11.5px] text-on-surface-variant truncate mt-0.5">
          {learner?.name} · {time} · {session.durationMinutes}m
        </p>
      </div>
      <Link
        href={`/coach/session/${session.id}`}
        className="opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all"
      >
        <ArrowRight size={14} className="text-primary" />
      </Link>
    </motion.div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

const QUICK_ACTIONS = [
  {
    icon: CalendarPlus,
    label: "Buổi mới",
    desc: "Tạo đặt lịch",
    href: "/coach/schedule",
    accent: "indigo" as const,
  },
  {
    icon: Zap,
    label: "Kế hoạch AI",
    desc: "Tạo bài tập",
    href: "#",
    accent: "violet" as const,
  },
  {
    icon: MessageCircle,
    label: "Tin nhắn",
    desc: "Hàng đợi phản hồi",
    href: "/coach/messages",
    accent: "emerald" as const,
  },
  {
    icon: Compass,
    label: "Học viên",
    desc: "Quản lý danh sách",
    href: "/coach/learners",
    accent: "amber" as const,
  },
];

const QA_ACCENT = {
  indigo: "from-primary to-[#7d6dff]",
  violet: "from-[#8b5cf6] to-[#c084fc]",
  emerald: "from-[#10b981] to-[#34d399]",
  amber: "from-[#f59e0b] to-[#fb923c]",
} as const;

function QuickActions({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.36, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">
        Thao tác nhanh
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.4 + i * 0.04,
                ease: EASE,
              }}
            >
              <Link
                href={q.href}
                className="group block rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-[10px] bg-gradient-to-br flex items-center justify-center text-white shadow-[0_3px_10px_-2px_rgba(15,15,30,0.18)] mb-2 transition-transform group-hover:scale-105",
                    QA_ACCENT[q.accent],
                  )}
                >
                  <Icon size={15} strokeWidth={2.25} />
                </div>
                <p className="text-[12.5px] font-semibold leading-tight">
                  {q.label}
                </p>
                <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                  {q.desc}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
