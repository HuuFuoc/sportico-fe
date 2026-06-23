"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Award,
  Brain,
  CalendarCheck,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Heart,
  Lock,
  Moon,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { devUserIdForRole } from "@/lib/auth";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";

const EASE = [0.16, 1, 0.3, 1] as const;

const RANGE_OPTIONS = ["1W", "1M", "3M", "1Y"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

const ACHIEVEMENTS = [
  {
    id: "a1",
    icon: Flame,
    label: "Chuỗi 8 ngày",
    desc: "Tập 8 ngày liên tiếp",
    tier: "epic" as const,
    earned: true,
    xp: 240,
  },
  {
    id: "a2",
    icon: Trophy,
    label: "Câu lạc bộ 10K giờ",
    desc: "Cột mốc tập luyện cả đời",
    tier: "legendary" as const,
    earned: true,
    xp: 1000,
  },
  {
    id: "a3",
    icon: Crown,
    label: "Top 5% Linh hoạt",
    desc: "Điểm linh hoạt xuất sắc",
    tier: "rare" as const,
    earned: true,
    xp: 320,
  },
  {
    id: "a4",
    icon: Brain,
    label: "Người theo kế hoạch AI",
    desc: "Đã theo 10 kế hoạch AI",
    tier: "common" as const,
    earned: true,
    xp: 120,
  },
  {
    id: "a5",
    icon: Star,
    label: "Sẵn sàng Marathon",
    desc: "Chạy 30km trong một tuần",
    tier: "epic" as const,
    earned: false,
    progress: 65,
    xp: 280,
  },
  {
    id: "a6",
    icon: Zap,
    label: "Bùng phát sức mạnh",
    desc: "Đạt 3 kỷ lục cá nhân trong một tuần",
    tier: "rare" as const,
    earned: false,
    progress: 33,
    xp: 200,
  },
];

const METRIC_ICONS: Record<string, typeof Activity> = {
  "Buổi tập/tuần": CalendarCheck,
  "Điểm linh hoạt": Activity,
  "Giấc ngủ TB": Moon,
  "Chuỗi ngày": Flame,
};

// Deterministic per-metric sparkline data (8 points)
function sparkline(seed: number, base: number, jitter: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const noise = Math.sin(i * 1.5 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 4) + noise) };
  });
}

export default function LearnerProgressPage() {
  // TODO(auth): hard-coded current learner until real session auth lands.
  const learnerId = devUserIdForRole("learner");
  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchLearner(learnerId),
        api.fetchProgressMetrics(learnerId),
        api.fetchProgressTrend(),
      ]),
    [learnerId],
  );
  const learner = data?.[0];
  const metrics = useMemo(() => data?.[1] ?? [], [data]);
  const trend = useMemo(() => data?.[2] ?? [], [data]);

  const reduce = useReducedMotion();
  const [range, setRange] = useState<Range>("3M");
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  // Decorated trend with deltas and milestones
  const decoratedTrend = useMemo(
    () =>
      trend.map((p, i) => {
        const prev = trend[i - 1]?.score ?? p.score;
        return {
          ...p,
          delta: p.score - prev,
          milestone: p.week === "W4" ? "Kỷ lục mới" : p.week === "W8" ? "Đỉnh cao" : null,
        };
      }),
    [trend],
  );

  const currentScore = trend[trend.length - 1]?.score ?? 0;
  const startScore = trend[0]?.score ?? 0;
  const scoreDelta = currentScore - startScore;
  const scoreDeltaPct = ((scoreDelta / Math.max(startScore, 1)) * 100).toFixed(0);

  // Achievement summary stats
  const earned = ACHIEVEMENTS.filter((a) => a.earned).length;
  const totalXP = ACHIEVEMENTS.filter((a) => a.earned).reduce(
    (s, a) => s + a.xp,
    0,
  );

  if (loading) {
    return (
      <AppShell role="learner" title="Tiến độ">
        <LoadingState label="Đang tải tiến độ…" />
      </AppShell>
    );
  }

  if (error || !learner) {
    return (
      <AppShell role="learner" title="Tiến độ">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="learner" title="Tiến độ">
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* ============ HERO HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          className="relative overflow-hidden rounded-[24px] border border-[var(--color-border-soft)] bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/[0.03] p-7 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_12px_32px_-16px_rgba(15,15,30,0.08)]"
        >
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-60 h-60 rounded-full bg-gradient-to-tr from-[#7d6dff]/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                  <Sparkles size={11} />
                  AI Coaching Đang hoạt động
                </span>
                <span className="text-[12px] text-on-surface-variant">
                  {new Date().toLocaleDateString("vi-VN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h1 className="text-[34px] leading-[1.1] font-semibold tracking-tight text-on-surface">
                Chào {learner.name?.split(" ")[0] ?? "bạn"},
                <span className="block bg-gradient-to-r from-primary to-[#7d6dff] bg-clip-text text-transparent">
                  bạn đang làm rất tốt tuần này.
                </span>
              </h1>
              <p className="text-[14.5px] text-on-surface-variant mt-2 max-w-xl leading-relaxed">
                Điểm thể lực của bạn đã tăng{" "}
                <span className="text-on-surface font-medium">
                  {scoreDeltaPct}%
                </span>{" "}
                trong 8 tuần qua. Duy trì đà này — AI coach của bạn luôn sẵn sàng.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-container-lowest border border-[var(--color-border-soft)] shadow-[0_2px_8px_-4px_rgba(15,15,30,0.06)]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff8a3d] to-[#ff5e3d] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,90,60,0.45)]">
                  <Flame size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
                    Chuỗi ngày
                  </p>
                  <p className="text-[20px] font-semibold leading-tight">
                    {learner.streakDays}{" "}
                    <span className="text-[12px] text-on-surface-variant font-normal">
                      ngày
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* ============ KPI CARDS ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Tổng giờ"
            value={learner.totalHoursTrained}
            unit="giờ"
            icon={Clock}
            trend="+12%"
            trendLabel="so tháng trước"
            accent="indigo"
            spark={sparkline(1, 80, 8)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <KPICard
            label="Chuỗi ngày"
            value={learner.streakDays}
            unit="ngày"
            icon={Flame}
            trend="Kỷ lục cá nhân"
            trendLabel="🔥 tiếp tục nào"
            accent="orange"
            spark={sparkline(2, 4, 3)}
            delay={0.12}
            reduce={reduce ?? false}
          />
          <KPICard
            label="Tỷ lệ khớp AI"
            value={`${learner.matchRate ?? 94}%`}
            icon={Brain}
            trend="+2%"
            trendLabel="đang học phong cách của bạn"
            accent="violet"
            spark={sparkline(3, 88, 5)}
            delay={0.19}
            reduce={reduce ?? false}
          />
          <KPICard
            label="Sắp tới"
            value={learner.upcomingSessions}
            unit="buổi"
            icon={CalendarCheck}
            trendLabel="tuần này"
            accent="emerald"
            spark={sparkline(4, 3, 2)}
            delay={0.26}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ AI COACH CARD ============ */}
        <AICoachCard reduce={reduce ?? false} />

        {/* ============ CHART + GOALS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
            className="lg:col-span-2 relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[18px] font-semibold tracking-tight">
                    Điểm thể lực
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-medium text-[#1f7a4d]">
                    <TrendingUp size={10} />+{scoreDelta} điểm
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant">
                  Tổng hợp độ linh hoạt, sức mạnh &amp; thể lực
                </p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-[36px] leading-none font-semibold tracking-tight">
                    {hoveredWeek
                      ? trend.find((t) => t.week === hoveredWeek)?.score
                      : currentScore}
                  </span>
                  <span className="text-[14px] text-on-surface-variant">
                    {hoveredWeek ?? "hiện tại"}
                  </span>
                </div>
              </div>

              {/* Range pills */}
              <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "relative px-3 h-7 text-[12px] font-medium rounded-[7px] transition-colors",
                      range === r
                        ? "text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {range === r && (
                      <motion.span
                        layoutId="rangePill"
                        className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                        transition={{
                          type: "spring",
                          duration: reduce ? 0 : 0.4,
                          bounce: 0.2,
                        }}
                      />
                    )}
                    <span className="relative">{r}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] -mx-2">
              <ClientOnly
                fallback={
                  <div className="h-full w-full bg-surface-container-low rounded-xl animate-pulse" />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={decoratedTrend}
                    margin={{ left: -8, right: 12, top: 12, bottom: 0 }}
                    onMouseMove={(state: unknown) => {
                      const s = state as
                        | {
                            activePayload?: { payload?: { week?: string } }[];
                          }
                        | undefined;
                      const week = s?.activePayload?.[0]?.payload?.week;
                      if (week) setHoveredWeek(week);
                    }}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="60%" stopColor="#4f46e5" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7d6dff" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#e8e8e5"
                      strokeDasharray="4 6"
                    />
                    <XAxis
                      dataKey="week"
                      stroke="#777587"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#777587"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[40, 100]}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#4f46e5", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="url(#strokeGrad)"
                      strokeWidth={2.5}
                      fill="url(#scoreGrad)"
                      activeDot={{
                        r: 6,
                        fill: "#fff",
                        stroke: "#4f46e5",
                        strokeWidth: 2.5,
                      }}
                      animationDuration={reduce ? 0 : 1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            {/* Annotation strip */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
              <Annotation
                color="#4f46e5"
                label="W4 — New Personal Record"
              />
              <Annotation
                color="#1f7a4d"
                label="W8 — Peak Performance"
              />
              <Annotation
                color="#b95000"
                label="W5 — Recovery Week"
                dashed
              />
            </div>
          </motion.section>

          {/* Goal progress */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.15, ease: EASE }}
            className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-semibold tracking-tight">
                  Mục tiêu tuần
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  AI điều chỉnh theo khả năng hồi phục của bạn
                </p>
              </div>
              <Target size={18} className="text-on-surface-variant" />
            </div>

            <div className="px-6 pb-5 space-y-5">
              {metrics.map((m, i) => {
                const pct = Math.min(100, (m.current / m.target) * 100);
                const Icon = METRIC_ICONS[m.label] ?? Activity;
                const isComplete = pct >= 100;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: reduce ? 0 : 0.4,
                      delay: reduce ? 0 : 0.2 + i * 0.06,
                      ease: EASE,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
                          isComplete
                            ? "bg-success-container text-[#1f7a4d]"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13.5px] font-medium">
                            {m.label}
                          </p>
                          <p className="text-[12px] text-on-surface-variant tabular-nums">
                            <span className="text-on-surface font-semibold">
                              {m.current}
                            </span>
                            <span className="text-on-surface-variant/60">
                              {" "}
                              / {m.target}
                            </span>{" "}
                            <span className="text-[11px]">{m.unit}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-[5px] rounded-full bg-surface-container-low overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: reduce ? 0 : 0.9,
                          delay: reduce ? 0 : 0.3 + i * 0.06,
                          ease: EASE,
                        }}
                        className={cn(
                          "h-full rounded-full",
                          isComplete
                            ? "bg-gradient-to-r from-[#1f7a4d] to-[#3ba16c]"
                            : "bg-gradient-to-r from-primary to-[#7d6dff]",
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1.5">
                      {goalHint(m.label, pct)}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Coach suggestion footer */}
            <div className="mx-5 mb-5 p-3.5 rounded-[14px] bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] border border-primary/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shrink-0 shadow-[0_4px_10px_-2px_rgba(53,37,205,0.35)]">
                <Sparkles size={13} className="text-on-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium leading-snug">
                  Giấc ngủ của bạn đang dưới mức mục tiêu.
                </p>
                <p className="text-[12px] text-on-surface-variant leading-relaxed mt-0.5">
                  Thử thư giãn sớm hơn 30 phút tối nay. Cần hướng dẫn
                  bài tập hít thở không?
                </p>
                <button className="mt-2 text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
                  Bắt đầu buổi tập <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </motion.section>
        </div>

        {/* ============ ACHIEVEMENTS ============ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.2, ease: EASE }}
          className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
        >
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[18px] font-semibold tracking-tight">
                  Thành tích
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-[11px] font-medium text-on-surface-variant">
                  {earned} / {ACHIEVEMENTS.length} đã mở
                </span>
              </div>
              <p className="text-[13px] text-on-surface-variant">
                Tích điểm, mở huy hiệu, leo hạng.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
                  Tổng điểm
                </p>
                <p className="text-[20px] font-semibold leading-tight tabular-nums bg-gradient-to-r from-primary to-[#7d6dff] bg-clip-text text-transparent">
                  {totalXP.toLocaleString()}
                </p>
              </div>
              <Link
                href="#"
                className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Xem tất cả <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ACHIEVEMENTS.map((a, i) => (
              <AchievementBadge
                key={a.id}
                achievement={a}
                delay={i * 0.06}
                reduce={reduce ?? false}
              />
            ))}
          </div>
        </motion.section>
      </div>
    </AppShell>
  );
}

// ============================================================================
// KPI Card
// ============================================================================

const ACCENTS = {
  indigo: {
    grad: "from-primary/15 to-primary/0",
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    stroke: "#4f46e5",
    trend: "text-primary",
  },
  orange: {
    grad: "from-[#ff8a3d]/15 to-[#ff8a3d]/0",
    iconBg: "bg-gradient-to-br from-[#ff8a3d] to-[#ff5e3d]",
    glow: "shadow-[0_4px_14px_-3px_rgba(255,90,60,0.4)]",
    stroke: "#ff7a3d",
    trend: "text-[#b95000]",
  },
  violet: {
    grad: "from-[#a78bfa]/15 to-[#a78bfa]/0",
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    stroke: "#8b5cf6",
    trend: "text-[#7c3aed]",
  },
  emerald: {
    grad: "from-[#34d399]/15 to-[#34d399]/0",
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    stroke: "#10b981",
    trend: "text-[#1f7a4d]",
  },
} as const;

function KPICard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  trendLabel,
  accent,
  spark,
  delay,
  reduce,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: typeof Clock;
  trend?: string;
  trendLabel?: string;
  accent: keyof typeof ACCENTS;
  spark: { i: number; v: number }[];
  delay: number;
  reduce: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.12)] transition-shadow duration-300 cursor-pointer"
    >
      {/* Decorative gradient blob */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-70 group-hover:opacity-100 transition-opacity",
          a.grad,
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
            <Icon size={17} />
          </div>
          <ArrowUpRight
            size={15}
            className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
          />
        </div>

        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[28px] leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-[13px] text-on-surface-variant">{unit}</span>
          )}
        </div>

        {/* Sparkline */}
        <div className="h-8 mt-3 -mx-1">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
// AI Coach Card
// ============================================================================

function AICoachCard({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.3, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.05] via-surface-container-lowest to-[#7d6dff]/[0.05] p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_12px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      {/* Glow blobs */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/3 w-44 h-44 rounded-full bg-gradient-to-br from-[#7d6dff]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        {/* AI Avatar w/ glow */}
        <div className="shrink-0 relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-50 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(53,37,205,0.5)]">
            <Sparkles size={24} className="text-on-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
              Sportico AI · Đề xuất hôm nay
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-medium text-[#1f7a4d]">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              98% độ tin cậy
            </span>
          </div>
          <p className="text-[16px] sm:text-[17px] leading-snug text-on-surface font-medium">
            HRV của bạn giảm{" "}
            <span className="text-[#b95000]">6%</span> qua đêm. Tôi khuyên
            bạn đổi buổi sức mạnh hôm nay sang{" "}
            <span className="text-primary">15 phút mobility</span> để duy trì chuỗi ngày.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            <Link
              href="/learner/schedule"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-medium shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_16px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Bắt đầu mobility
              <ArrowRight size={13} />
            </Link>
            <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-[var(--color-border-soft)] hover:border-primary/30 bg-surface-container-lowest hover:bg-primary/[0.04] text-[13px] font-medium transition-colors">
              Xem kế hoạch đầy đủ
            </button>
            <button className="text-[12.5px] font-medium text-on-surface-variant hover:text-on-surface px-2 transition-colors">
              Bỏ qua
            </button>
          </div>

          {/* Mini indicators */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-primary/10 text-[12px]">
            <MiniStat icon={Heart} label="Phục hồi" value="72%" tone="warn" />
            <MiniStat icon={Moon} label="Giấc ngủ" value="7.2h" tone="neutral" />
            <MiniStat icon={Activity} label="Căng thẳng" value="Trung bình" tone="neutral" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
  tone: "neutral" | "warn" | "good";
}) {
  const colors =
    tone === "warn"
      ? "text-[#b95000]"
      : tone === "good"
        ? "text-[#1f7a4d]"
        : "text-on-surface";
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} className={colors} />
      <span className="text-on-surface-variant">{label}</span>
      <span className={cn("font-semibold", colors)}>{value}</span>
    </div>
  );
}

// ============================================================================
// Achievement Badge
// ============================================================================

const TIERS = {
  common: {
    label: "Thường",
    ring: "ring-1 ring-[var(--color-border-soft)]",
    icon: "from-slate-400 to-slate-500",
    glow: "",
    text: "text-slate-600",
  },
  rare: {
    label: "Hiếm",
    ring: "ring-2 ring-primary/30",
    icon: "from-primary to-[#7d6dff]",
    glow: "shadow-[0_8px_24px_-6px_rgba(53,37,205,0.35)]",
    text: "text-primary",
  },
  epic: {
    label: "Sử thi",
    ring: "ring-2 ring-[#a855f7]/40",
    icon: "from-[#a855f7] to-[#ec4899]",
    glow: "shadow-[0_8px_24px_-6px_rgba(168,85,247,0.45)]",
    text: "text-[#a855f7]",
  },
  legendary: {
    label: "Huyền thoại",
    ring: "ring-2 ring-[#f59e0b]/50",
    icon: "from-[#f59e0b] via-[#fb923c] to-[#ef4444]",
    glow: "shadow-[0_10px_28px_-6px_rgba(245,158,11,0.55)]",
    text: "text-[#b45309]",
  },
} as const;

type Achievement = (typeof ACHIEVEMENTS)[number];

function AchievementBadge({
  achievement,
  delay,
  reduce,
}: {
  achievement: Achievement;
  delay: number;
  reduce: boolean;
}) {
  const tier = TIERS[achievement.tier];
  const Icon = achievement.icon;
  const locked = !achievement.earned;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reduce ? 0 : 0.45,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "group relative overflow-hidden rounded-[16px] p-4 border bg-surface-container-lowest cursor-pointer transition-all",
        locked
          ? "border-[var(--color-border-soft)] grayscale-[60%] opacity-75 hover:opacity-100 hover:grayscale-0"
          : "border-[var(--color-border-soft)] hover:border-primary/20",
      )}
    >
      {/* Decorative gradient corner */}
      {!locked && (
        <div
          className={cn(
            "absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br blur-2xl opacity-50",
            tier.icon,
          )}
        />
      )}

      <div className="relative flex flex-col items-center text-center">
        {/* Badge icon */}
        <div className="relative mb-3">
          {!locked && (
            <motion.div
              animate={
                hovered && !reduce
                  ? { scale: [1, 1.15, 1.05], rotate: [0, -6, 6, 0] }
                  : {}
              }
              transition={{ duration: 0.6, ease: EASE }}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white",
                tier.icon,
                tier.glow,
              )}
            >
              <Icon size={24} />
            </motion.div>
          )}
          {locked && (
            <div className="relative w-14 h-14 rounded-2xl bg-surface-container-low border border-[var(--color-border-soft)] flex items-center justify-center text-on-surface-variant">
              <Icon size={22} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-lowest border border-[var(--color-border-soft)] flex items-center justify-center">
                <Lock size={11} className="text-on-surface-variant" />
              </div>
            </div>
          )}
        </div>

        <p className="text-[13px] font-semibold leading-tight">
          {achievement.label}
        </p>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">
          {achievement.desc}
        </p>

        {/* Tier + XP */}
        <div className="flex items-center gap-2 mt-2.5">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-semibold",
              tier.text,
            )}
          >
            {tier.label}
          </span>
          <span className="text-on-surface-variant/40">·</span>
          <span className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-on-surface-variant">
            <Award size={10} />
            {achievement.xp} XP
          </span>
        </div>

        {/* Progress (locked only) */}
        {locked && achievement.progress != null && (
          <div className="w-full mt-3">
            <div className="h-1 rounded-full bg-surface-container-low overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${achievement.progress}%` }}
                transition={{
                  duration: reduce ? 0 : 0.8,
                  delay: reduce ? 0 : delay + 0.2,
                  ease: EASE,
                }}
                className="h-full bg-gradient-to-r from-primary to-[#7d6dff] rounded-full"
              />
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1">
              {achievement.progress}% complete
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {hovered && !locked && !reduce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 rounded-[16px] pointer-events-none",
              tier.ring,
            )}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Chart tooltip
// ============================================================================

interface TooltipPayloadItem {
  payload: {
    week: string;
    score: number;
    delta: number;
    milestone: string | null;
  };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(15,15,30,0.18)]">
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
        {data.week}
      </p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-[18px] font-semibold tabular-nums">
          {data.score}
        </span>
        {data.delta !== 0 && (
          <span
            className={cn(
              "text-[11px] font-medium",
              data.delta > 0 ? "text-[#1f7a4d]" : "text-[#ba1a1a]",
            )}
          >
            {data.delta > 0 ? "+" : ""}
            {data.delta}
          </span>
        )}
      </div>
      {data.milestone && (
        <p className="text-[10.5px] mt-1 inline-flex items-center gap-1 text-primary font-medium">
          <Sparkles size={10} />
          {data.milestone}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Annotation chip
// ============================================================================

function Annotation({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-on-surface-variant">
      <span
        className={cn(
          "inline-block w-3 h-3 rounded-full",
          dashed && "ring-1 ring-dashed",
        )}
        style={{
          background: dashed ? "transparent" : color,
          borderColor: color,
          border: dashed ? `1.5px dashed ${color}` : undefined,
        }}
      />
      {label}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function goalHint(label: string, pct: number): string {
  if (pct >= 100) return "Đạt mục tiêu — chuyển sang mục tiêu tiếp theo";
  if (label === "Buổi tập/tuần") return "Thêm 1 buổi nữa để hoàn thành tuần này";
  if (label === "Điểm linh hoạt") return "+12 điểm để mở khóa hạng Elite";
  if (label === "Giấc ngủ TB") return "Đi ngủ sớm hơn 30 phút để thu hẹp khoảng cách";
  if (label === "Chuỗi ngày") return "Thêm 6 ngày để đạt chuỗi 2 tuần";
  return `${Math.round(pct)}% đến mục tiêu`;
}
