"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  Filter,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Sprout,
  Timer,
  TrendingUp,
  Users,
  Video,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency, initials, localDateKey } from "@/lib/utils";
import { api } from "@/lib/api";
import { devUserIdForRole } from "@/lib/auth";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
// NOW is the deterministic mock "today" anchor (see @/lib/mock/clock).
// TODO(api): once the backend returns real timestamps, use `new Date()` here.
import { NOW } from "@/lib/mock/clock";
import type { Learner, Session } from "@/types";

// Page-local learner lookup so calendar blocks and rows can resolve a session's
// learner without each one fetching (or importing mock data) individually.
const LearnerLookupContext = createContext<Map<string, Learner>>(new Map());
function useLearner(id: string): Learner | undefined {
  return useContext(LearnerLookupContext).get(id);
}

const EASE = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VIEW_OPTIONS = ["Day", "Week", "Month"] as const;
type View = (typeof VIEW_OPTIONS)[number];

// Calendar config
const START_HOUR = 7;
const END_HOUR = 19; // exclusive
const HOUR_HEIGHT = 56; // px per hour
const CAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function seedSpark(seed: number, base: number, jitter: number, len = 8) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 5) + noise) };
  });
}

export default function CoachSchedulePage() {
  // TODO(auth): hard-coded current coach until real session auth lands.
  const coachId = devUserIdForRole("coach");
  const {
    data: sessionsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchSessionsForCoach(coachId), [coachId]);
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);

  // Learner lookup map (single fetch) provided to calendar blocks via context.
  const { data: learnersData } = useApiResource(() => api.fetchLearners(), []);
  const learnerById = useMemo(
    () => new Map((learnersData ?? []).map((l) => [l.id, l])),
    [learnersData],
  );

  const reduce = useReducedMotion();

  const [view, setView] = useState<View>("Week");
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date(NOW));
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const t = new Date(s.start).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }),
    [sessions, weekStart, weekEnd],
  );

  const dayBuckets = useMemo(
    () =>
      weekDays.map((d) => {
        const key = localDateKey(d);
        return weekSessions
          .filter((s) => localDateKey(new Date(s.start)) === key)
          .sort(
            (a, b) =>
              new Date(a.start).getTime() - new Date(b.start).getTime(),
          );
      }),
    [weekDays, weekSessions],
  );

  // Today
  const todayKey = localDateKey(new Date(NOW));
  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => localDateKey(new Date(s.start)) === todayKey)
        .sort(
          (a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        ),
    [sessions, todayKey],
  );

  // Upcoming after today
  const upcomingNext = useMemo(
    () =>
      sessions
        .filter((s) => {
          const t = new Date(s.start).getTime();
          return t >= NOW.getTime() && s.status !== "cancelled";
        })
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .slice(0, 4),
    [sessions],
  );

  const pending = sessions.filter((s) => s.status === "pending_confirmation");

  // Open slots — simple heuristic: hours in [9, 17] with no session
  const openSlotsToday = useMemo(() => {
    const slots: Date[] = [];
    for (let h = 9; h < 17; h++) {
      const d = new Date(NOW);
      d.setHours(h, 0, 0, 0);
      const hasSession = todaySessions.some(
        (s) => new Date(s.start).getHours() === h,
      );
      if (!hasSession) slots.push(d);
    }
    return slots.slice(0, 3);
  }, [todaySessions]);

  // Top summary stats
  const sessionsThisWeek = weekSessions.length;
  const utilization = Math.min(
    100,
    Math.round((sessionsThisWeek / 28) * 100), // 4 sessions/day avg = 100%
  );
  const revenue = weekSessions.reduce((sum, s) => sum + s.price, 0);
  const openSlots = 8 * 7 - sessionsThisWeek;

  const weekRangeLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  if (loading) {
    return (
      <AppShell role="coach" title="Schedule">
        <LoadingState label="Đang tải lịch…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Schedule">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <LearnerLookupContext.Provider value={learnerById}>
      <AppShell role="coach" title="Schedule">
        <div className="max-w-[1400px] mx-auto space-y-6">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                <Sparkles size={11} />
                AI-optimized week
              </span>
              <span className="text-[12px] text-on-surface-variant">
                {weekRangeLabel}
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
              Schedule
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              {sessionsThisWeek} sessions ·{" "}
              <span className="text-on-surface font-medium">
                {openSlots} open slots
              </span>{" "}
              · {utilization}% utilization
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View pill */}
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
              {VIEW_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "relative px-3 h-8 text-[12.5px] font-medium rounded-[7px] transition-colors",
                    view === v
                      ? "text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {view === v && (
                    <motion.span
                      layoutId="schedViewPill"
                      className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06),0_2px_6px_rgba(15,15,30,0.04)]"
                      transition={{
                        type: "spring",
                        duration: reduce ? 0 : 0.4,
                        bounce: 0.2,
                      }}
                    />
                  )}
                  <span className="relative">{v}</span>
                </button>
              ))}
            </div>

            <button
              aria-label="Filter"
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
            >
              <Filter size={13} />
              Filter
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Previous week"
                className="w-10 h-10 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="h-10 px-4 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-medium transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                aria-label="Next week"
                className="w-10 h-10 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button className="ml-1 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus size={16} strokeWidth={2.5} />
              New Session
            </button>
          </div>
        </motion.header>

        {/* ============ SUMMARY ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={CalendarPlus}
            label="Sessions This Week"
            value={sessionsThisWeek}
            trend="+3"
            trendLabel="vs last week"
            accent="indigo"
            spark={seedSpark(1, 16, 6)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={Timer}
            label="Open Slots"
            value={openSlots}
            trend="Available"
            trendLabel="this week"
            accent="violet"
            spark={seedSpark(2, 12, 4)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={Activity}
            label="Utilization"
            value={`${utilization}%`}
            trend={utilization >= 70 ? "On target" : "Add slots"}
            trendLabel="of capacity"
            accent="amber"
            spark={seedSpark(3, 65, 12)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={DollarSign}
            label="Revenue"
            value={formatCurrency(revenue)}
            trend="+12%"
            trendLabel="vs last week"
            accent="emerald"
            spark={seedSpark(4, 800, 200)}
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ PENDING ============ */}
        {pending.length > 0 && (
          <PendingConfirmations
            pending={pending}
            reduce={reduce ?? false}
          />
        )}

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5">
          {/* ============ LEFT: CALENDAR ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
            className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight">
                  {weekStart.toLocaleDateString("en-US", { month: "long" })}{" "}
                  <span className="text-on-surface-variant font-medium">
                    {weekStart.getFullYear()}
                  </span>
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  {weekRangeLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <LegendDot color="#4f46e5" label="1:1" />
                <LegendDot color="#8b5cf6" label="Group" />
                <LegendDot color="#10b981" label="AI" />
              </div>
            </div>

            {/* Desktop time-grid calendar */}
            <div className="hidden md:block">
              {/* Day headers (sticky) */}
              <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[var(--color-border-soft)] sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm z-10">
                <div />
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === NOW.toDateString();
                  const count = dayBuckets[i].length;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "px-2 py-3 flex flex-col items-center transition-colors",
                        isToday &&
                          "bg-gradient-to-b from-primary/[0.08] to-transparent",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10.5px] uppercase tracking-wider font-semibold",
                          isToday ? "text-primary" : "text-on-surface-variant",
                        )}
                      >
                        {WEEKDAYS[i]}
                      </span>
                      <span
                        className={cn(
                          "mt-1 w-8 h-8 rounded-full flex items-center justify-center text-[13.5px] font-semibold transition-colors",
                          isToday
                            ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_4px_10px_-2px_rgba(53,37,205,0.4)]"
                            : "text-on-surface",
                        )}
                      >
                        {d.getDate()}
                      </span>
                      {count > 0 && (
                        <span className="mt-1 text-[10px] text-on-surface-variant">
                          {count} session{count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time grid body */}
              <div
                className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
                style={{ height: CAL_HEIGHT }}
              >
                {/* Hours gutter */}
                <div className="relative">
                  {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <div
                      key={i}
                      style={{ height: HOUR_HEIGHT }}
                      className="relative text-right pr-2 pt-1"
                    >
                      <span className="text-[10.5px] font-medium text-on-surface-variant/70 tabular-nums">
                        {formatHour(START_HOUR + i)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((d, dayIdx) => {
                  const isToday = d.toDateString() === NOW.toDateString();
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "relative border-l border-[var(--color-border-soft)]/60",
                        isToday && "bg-primary/[0.015]",
                      )}
                    >
                      {/* Hour gridlines */}
                      {Array.from({ length: END_HOUR - START_HOUR }).map(
                        (_, i) => (
                          <div
                            key={i}
                            style={{ height: HOUR_HEIGHT }}
                            className={cn(
                              "border-b border-dashed border-[var(--color-border-soft)]/40 hover:bg-primary/[0.02] transition-colors group cursor-cell",
                            )}
                          >
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary/60 pl-1.5 transition-opacity">
                              + Add
                            </span>
                          </div>
                        ),
                      )}

                      {/* Now indicator */}
                      {isToday && <NowIndicator />}

                      {/* Session blocks */}
                      {dayBuckets[dayIdx].map((s, i) => (
                        <SessionBlock
                          key={s.id}
                          session={s}
                          delay={dayIdx * 0.03 + i * 0.04}
                          reduce={reduce ?? false}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile day cards */}
            <div className="md:hidden p-3 space-y-3">
              {weekDays.map((d, i) => {
                const items = dayBuckets[i];
                const isToday = d.toDateString() === NOW.toDateString();
                return (
                  <div
                    key={i}
                    className="rounded-[14px] border border-[var(--color-border-soft)] overflow-hidden"
                  >
                    <div
                      className={cn(
                        "px-3 py-2.5 flex items-center justify-between",
                        isToday
                          ? "bg-gradient-to-r from-primary/[0.08] to-transparent"
                          : "bg-surface-container-low/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold",
                            isToday
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-lowest text-on-surface",
                          )}
                        >
                          {d.getDate()}
                        </span>
                        <span className="text-[13px] font-semibold">
                          {WEEKDAYS[i]}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        {items.length} session{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="p-2 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-[12px] text-on-surface-variant text-center py-3">
                          Open day
                        </p>
                      ) : (
                        items.map((s) => (
                          <MobileSessionCard key={s.id} session={s} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ============ RIGHT SIDEBAR ============ */}
          <aside className="space-y-5">
            <AICoachCard
              count={3}
              reduce={reduce ?? false}
            />
            <TodayAgenda
              sessions={todaySessions}
              openSlots={openSlotsToday}
              reduce={reduce ?? false}
            />
            <UpcomingSessions
              sessions={upcomingNext}
              reduce={reduce ?? false}
            />
            <QuickActions reduce={reduce ?? false} />
          </aside>
        </div>
      </div>
      </AppShell>
    </LearnerLookupContext.Provider>
  );
}

// ============================================================================
// Summary Card
// ============================================================================

const ACCENTS = {
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

function SummaryCard({
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
  icon: typeof CalendarPlus;
  label: string;
  value: string | number;
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
// Pending Confirmations (premium replacement for yellow alert)
// ============================================================================

function PendingConfirmations({
  pending,
  reduce,
}: {
  pending: Session[];
  reduce: boolean;
}) {
  const learnerById = useContext(LearnerLookupContext);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, delay: 0.05, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-[#f4d68a]/50 bg-gradient-to-br from-[#fffaeb] via-surface-container-lowest to-[#fff5d6]/30 p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_24px_-14px_rgba(245,158,11,0.25)]"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-[#f59e0b]/15 to-transparent blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#fb923c] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(245,158,11,0.45)]">
              <Clock size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                {pending.length} session{pending.length > 1 ? "s" : ""} awaiting
                confirmation
              </p>
              <p className="text-[12px] text-on-surface-variant">
                Review to lock these into your week
              </p>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {pending.map((s) => {
            const learner = learnerById.get(s.learnerId);
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 bg-surface-container-lowest rounded-[14px] p-3 border border-[var(--color-border-soft)] hover:border-[#f59e0b]/30 transition-colors"
              >
                <img
                  src={learner?.avatarUrl}
                  alt={learner?.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold truncate">
                    {learner?.name} — {s.title}
                  </p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">
                    {new Date(s.start).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  aria-label="Decline"
                  className="h-9 w-9 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-on-surface-variant hover:text-[#ba1a1a] transition-colors flex items-center justify-center"
                >
                  <XCircle size={15} />
                </button>
                <button className="h-9 px-3.5 rounded-lg bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Confirm
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Calendar session block (absolutely positioned)
// ============================================================================

function sessionAccent(type: Session["type"]) {
  if (type === "AI-Guided") {
    return {
      bg: "from-[#10b981]/10 to-[#34d399]/5",
      border: "border-[#10b981]/30",
      bar: "bg-gradient-to-b from-[#10b981] to-[#34d399]",
      pill: "bg-[#10b981]/15 text-[#1f7a4d]",
      hover: "hover:border-[#10b981]/50",
    };
  }
  if (type === "Group") {
    return {
      bg: "from-[#8b5cf6]/10 to-[#c084fc]/5",
      border: "border-[#8b5cf6]/30",
      bar: "bg-gradient-to-b from-[#8b5cf6] to-[#c084fc]",
      pill: "bg-[#8b5cf6]/15 text-[#7c3aed]",
      hover: "hover:border-[#8b5cf6]/50",
    };
  }
  return {
    bg: "from-primary/10 to-[#7d6dff]/5",
    border: "border-primary/25",
    bar: "bg-gradient-to-b from-primary to-[#7d6dff]",
    pill: "bg-primary/10 text-primary",
    hover: "hover:border-primary/50",
  };
}

function SessionBlock({
  session,
  delay,
  reduce,
}: {
  session: Session;
  delay: number;
  reduce: boolean;
}) {
  const learner = useLearner(session.learnerId);
  const start = new Date(session.start);
  const hour = start.getHours();
  const minute = start.getMinutes();

  // Skip if outside visible range
  if (hour < START_HOUR || hour >= END_HOUR) return null;

  const top = (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
  const height = Math.max(
    36,
    (session.durationMinutes / 60) * HOUR_HEIGHT - 2,
  );
  const a = sessionAccent(session.type);
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { scale: 1.015 }}
      style={{ top, height }}
      className={cn(
        "absolute left-1 right-1 z-10 group cursor-pointer overflow-hidden rounded-[10px] border bg-gradient-to-br shadow-[0_2px_6px_-2px_rgba(15,15,30,0.08)] hover:shadow-[0_8px_22px_-6px_rgba(15,15,30,0.18)] transition-all",
        a.bg,
        a.border,
        a.hover,
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full",
          a.bar,
        )}
      />
      <div className="pl-2.5 pr-1.5 py-1.5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[10.5px] font-bold text-on-surface tabular-nums">
            {time}
          </p>
          <span
            className={cn(
              "px-1 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider",
              a.pill,
            )}
          >
            {session.type === "AI-Guided"
              ? "AI"
              : session.type === "Group"
                ? "Grp"
                : "1:1"}
          </span>
        </div>
        <p className="text-[11px] font-semibold leading-tight line-clamp-1 text-on-surface mt-0.5">
          {session.title}
        </p>
        <div className="flex items-center gap-1 mt-auto pt-1">
          <div className="w-4 h-4 rounded-full bg-surface-container-high overflow-hidden text-[8px] flex items-center justify-center text-primary font-semibold">
            {learner?.avatarUrl ? (
              <img
                src={learner.avatarUrl}
                alt={learner.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials(learner?.name ?? "?")
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant truncate flex-1">
            {learner?.name?.split(" ")[0]}
          </p>
        </div>
      </div>

      {/* Hover quick actions */}
      <div className="absolute inset-x-1 bottom-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex-1 h-5 rounded-[6px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[9px] font-bold shadow-[0_2px_6px_-1px_rgba(53,37,205,0.5)]">
          Join
        </button>
        <button className="flex-1 h-5 rounded-[6px] bg-surface-container-lowest border border-[var(--color-border-soft)] text-[9px] font-bold text-on-surface">
          Edit
        </button>
      </div>
    </motion.div>
  );
}

function MobileSessionCard({ session }: { session: Session }) {
  const learner = useLearner(session.learnerId);
  const a = sessionAccent(session.type);
  const start = new Date(session.start);
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isOnline = session.location?.toLowerCase() === "online";
  return (
    <div
      className={cn(
        "relative rounded-[12px] border p-3 bg-surface-container-lowest",
        a.border,
      )}
    >
      <span
        className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full", a.bar)}
      />
      <div className="pl-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden text-[11px] flex items-center justify-center text-primary font-semibold">
          {learner?.avatarUrl ? (
            <img
              src={learner.avatarUrl}
              alt={learner.name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials(learner?.name ?? "?")
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold truncate">
            {learner?.name}
          </p>
          <p className="text-[11px] text-on-surface-variant truncate">
            {time} · {session.title} · {session.durationMinutes}m
            {isOnline && (
              <>
                {" "}
                · <Video size={9} className="inline -translate-y-px" /> Online
              </>
            )}
          </p>
        </div>
        <button className="h-7 px-2.5 rounded-md bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[11px] font-semibold">
          Join
        </button>
      </div>
    </div>
  );
}

function NowIndicator() {
  const now = new Date(NOW);
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour < START_HOUR || hour >= END_HOUR) return null;
  const top =
    (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
  return (
    <div
      style={{ top }}
      className="absolute left-0 right-0 z-20 pointer-events-none"
    >
      <div className="relative h-px bg-gradient-to-r from-[#ef4444] via-[#f87171] to-transparent">
        <span className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-variant">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function formatHour(h: number) {
  if (h === 12) return "12 PM";
  if (h === 0) return "12 AM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ============================================================================
// AI Coach card
// ============================================================================

function AICoachCard({
  count,
  reduce,
}: {
  count: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.15, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-gradient-to-br from-[#7d6dff]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary">
            Sportico AI · Insight
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
              <span className="text-[#b95000]">{count} learners</span> haven&apos;t
              booked in 2 weeks.
            </p>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
              A quick check-in lifts re-booking by{" "}
              <span className="text-on-surface font-medium">28%</span>. I&apos;ll
              draft personalized messages.
            </p>
          </div>
        </div>

        <button className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Send size={13} />
          Send Message
        </button>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-primary" />
            <span className="text-on-surface-variant">Reach</span>
            <span className="font-semibold">{count}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[#10b981]" />
            <span className="text-on-surface-variant">Win-back</span>
            <span className="font-semibold">+28%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-[#f59e0b]" />
            <span className="text-on-surface-variant">Time</span>
            <span className="font-semibold">~3m</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Today Agenda + Open slots
// ============================================================================

function TodayAgenda({
  sessions,
  openSlots,
  reduce,
}: {
  sessions: Session[];
  openSlots: Date[];
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.22, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight">Today</h3>
          <p className="text-[11.5px] text-on-surface-variant mt-0.5">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
            {openSlots.length} open
          </p>
        </div>
        <span className="text-[11px] text-on-surface-variant">
          {new Date(NOW).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 && openSlots.length === 0 && (
          <p className="text-center text-[12px] text-on-surface-variant py-6">
            Nothing scheduled today.
          </p>
        )}
        {sessions.map((s, i) => (
          <TodayRow
            key={s.id}
            session={s}
            delay={i * 0.05}
            reduce={reduce}
          />
        ))}
        {openSlots.map((d, i) => (
          <OpenSlotRow
            key={d.toISOString()}
            time={d}
            delay={(sessions.length + i) * 0.05}
            reduce={reduce}
          />
        ))}

        {openSlots.length > 0 && (
          <button className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-9 rounded-[12px] border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/[0.04] text-primary text-[12.5px] font-semibold transition-colors">
            <Sprout size={13} />
            Fill {openSlots.length} Slot{openSlots.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TodayRow({
  session,
  delay,
  reduce,
}: {
  session: Session;
  delay: number;
  reduce: boolean;
}) {
  const learner = useLearner(session.learnerId);
  const time = new Date(session.start).toLocaleTimeString("en-US", {
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
      className="group flex items-center gap-3 p-2.5 rounded-[12px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.02] hover:to-transparent cursor-pointer transition-all"
    >
      <div className="text-center w-14 shrink-0">
        <p className="text-[11.5px] font-bold tabular-nums leading-none">
          {time}
        </p>
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          {session.durationMinutes}m
        </p>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden shrink-0 text-[11px] flex items-center justify-center text-primary font-semibold">
        {learner?.avatarUrl ? (
          <img
            src={learner.avatarUrl}
            alt={learner.name}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(learner?.name ?? "?")
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold truncate">{learner?.name}</p>
        <p className="text-[11px] text-on-surface-variant truncate">
          {session.title}
        </p>
      </div>
      <button className="opacity-0 group-hover:opacity-100 h-7 px-2.5 rounded-md bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[11px] font-semibold shadow-[0_3px_8px_-2px_rgba(53,37,205,0.4)] transition-opacity">
        Join
      </button>
    </motion.div>
  );
}

function OpenSlotRow({
  time,
  delay,
  reduce,
}: {
  time: Date;
  delay: number;
  reduce: boolean;
}) {
  const t = time.toLocaleTimeString("en-US", {
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
      className="group flex items-center gap-3 p-2.5 rounded-[12px] border border-dashed border-[var(--color-border-soft)] hover:border-primary/30 hover:bg-primary/[0.02] cursor-pointer transition-all"
    >
      <div className="text-center w-14 shrink-0">
        <p className="text-[11.5px] font-bold tabular-nums leading-none text-on-surface-variant">
          {t}
        </p>
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          1h
        </p>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-container-low border border-dashed border-[var(--color-border-soft)] flex items-center justify-center shrink-0">
        <Plus size={13} className="text-on-surface-variant" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-on-surface-variant">
          Open Slot
        </p>
        <p className="text-[11px] text-on-surface-variant/70 truncate">
          Tap to book or invite
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Upcoming sessions (sidebar)
// ============================================================================

function UpcomingSessions({
  sessions,
  reduce,
}: {
  sessions: Session[];
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
        <h3 className="text-[16px] font-semibold tracking-tight">Upcoming</h3>
        <Link
          href="#"
          className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          View all
          <ChevronRight size={12} />
        </Link>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 ? (
          <p className="text-center text-[12px] text-on-surface-variant py-6">
            Nothing on the horizon.
          </p>
        ) : (
          sessions.map((s, i) => (
            <UpcomingRow
              key={s.id}
              session={s}
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
  delay,
  reduce,
}: {
  session: Session;
  delay: number;
  reduce: boolean;
}) {
  const learner = useLearner(session.learnerId);
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
        {session.location && (
          <p className="text-[10.5px] text-on-surface-variant/70 inline-flex items-center gap-1 mt-0.5">
            {session.location.toLowerCase() === "online" ? (
              <Video size={10} />
            ) : (
              <MapPin size={10} />
            )}
            {session.location}
          </p>
        )}
      </div>
      <ArrowRight
        size={14}
        className="text-primary opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all"
      />
    </motion.div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

const QUICK_ACTIONS = [
  {
    icon: CalendarPlus,
    label: "New Session",
    desc: "Create booking",
    href: "#",
    accent: "indigo" as const,
  },
  {
    icon: Sprout,
    label: "Block Time",
    desc: "Mark unavailable",
    href: "#",
    accent: "amber" as const,
  },
  {
    icon: MessageCircle,
    label: "Messages",
    desc: "Reply queue",
    href: "/coach/messages",
    accent: "emerald" as const,
  },
  {
    icon: Compass,
    label: "Availability",
    desc: "Edit hours",
    href: "#",
    accent: "violet" as const,
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
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.34, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">
        Quick Actions
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
                delay: reduce ? 0 : 0.38 + i * 0.04,
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

// Silence Zap unused import warning (kept reserved for future quick action)
void Zap;
