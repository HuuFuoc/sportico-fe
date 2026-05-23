"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Users,
  Video,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, initials, localDateKey } from "@/lib/utils";
import { NOW } from "@/lib/mock/clock";
import { getSessionsForLearner } from "@/lib/mock/sessions";
import { getCoachById } from "@/lib/mock/users";
import type { Session } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VIEW_OPTIONS = ["Day", "Week", "Month"] as const;
type View = (typeof VIEW_OPTIONS)[number];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon = 0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export default function LearnerSchedulePage() {
  const learnerId = "learner-1";
  const sessions = getSessionsForLearner(learnerId);
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

  const dayBuckets = useMemo(
    () =>
      weekDays.map((d) => {
        const key = localDateKey(d);
        return sessions
          .filter((s) => localDateKey(new Date(s.start)) === key)
          .sort(
            (a, b) =>
              new Date(a.start).getTime() - new Date(b.start).getTime(),
          );
      }),
    [weekDays, sessions],
  );

  const upcoming = sessions
    .filter((s) => new Date(s.start) >= NOW && s.status !== "cancelled")
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);

  const completed = sessions.filter((s) => s.status === "completed").length;
  const booked = sessions.filter((s) =>
    ["scheduled", "pending_confirmation"].includes(s.status),
  ).length;
  const missed = sessions.filter((s) => s.status === "cancelled").length;
  const totalTracked = completed + missed + booked;
  const consistency =
    totalTracked > 0
      ? Math.round(
          (completed / Math.max(completed + missed + booked * 0.1, 1)) * 100,
        )
      : 0;

  const weekRangeLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <AppShell role="learner" title="My Schedule">
      <div className="max-w-[1320px] mx-auto space-y-6">
        {/* ============ HERO HEADER ============ */}
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
            <h1 className="text-[32px] leading-[1.1] font-bold tracking-tight text-on-surface">
              My Schedule
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              Plan, train, recover — all in one rhythm.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <Link
              href="/learner/coaches"
              className="ml-1 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              Book Session
            </Link>
          </div>
        </motion.header>

        {/* ============ STATS ROW ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            icon={CalendarCheck}
            label="Sessions Booked"
            value={booked}
            accent="indigo"
            delay={0.05}
            reduce={reduce ?? false}
          />
          <StatTile
            icon={CheckCircle2}
            label="Completed"
            value={completed}
            accent="emerald"
            delay={0.1}
            reduce={reduce ?? false}
          />
          <StatTile
            icon={XCircle}
            label="Missed"
            value={missed}
            accent="rose"
            delay={0.15}
            reduce={reduce ?? false}
          />
          <StatTile
            icon={TrendingUp}
            label="Consistency"
            value={`${consistency}%`}
            accent="violet"
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5">
          {/* ============ LEFT: CALENDAR ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
            className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            {/* Calendar header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border-soft)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-semibold tracking-tight">
                  {weekStart.toLocaleDateString("en-US", { month: "long" })}{" "}
                  <span className="text-on-surface-variant font-medium">
                    {weekStart.getFullYear()}
                  </span>
                </h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  {sessions.length} sessions planned this period
                </p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
                {VIEW_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "relative px-3.5 h-8 text-[12.5px] font-medium rounded-[7px] transition-colors",
                      view === v
                        ? "text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {view === v && (
                      <motion.span
                        layoutId="viewPill"
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
            </div>

            {/* Day headers (desktop) */}
            <div className="hidden sm:grid grid-cols-7 px-2 pt-3 pb-2 border-b border-[var(--color-border-soft)] sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm z-10">
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === NOW.toDateString();
                return (
                  <button
                    key={i}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-[10px] transition-colors group",
                      isToday
                        ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.02]"
                        : "hover:bg-surface-container-low/60",
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
                        "mt-1 w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-semibold transition-colors",
                        isToday
                          ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_4px_10px_-2px_rgba(53,37,205,0.4)]"
                          : "text-on-surface group-hover:bg-surface-container-low",
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Week grid (desktop) */}
            <div className="hidden sm:grid grid-cols-7 min-h-[420px] gap-1 p-2">
              {dayBuckets.map((items, i) => {
                const d = weekDays[i];
                const isToday = d.toDateString() === NOW.toDateString();
                const isPast = d < new Date(NOW.toDateString());
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative rounded-[12px] p-1.5 space-y-1.5 transition-colors",
                      isToday
                        ? "bg-gradient-to-b from-primary/[0.04] to-transparent"
                        : "hover:bg-surface-container-low/40",
                      isPast && !isToday && "opacity-70",
                    )}
                  >
                    {items.length === 0 ? (
                      <EmptyDayHint isToday={isToday} />
                    ) : (
                      items.map((s, idx) => (
                        <SessionBlock
                          key={s.id}
                          session={s}
                          delay={i * 0.04 + idx * 0.04}
                          reduce={reduce ?? false}
                        />
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile horizontal scroll days */}
            <div className="sm:hidden p-3 space-y-3">
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
                        "px-3 py-2 flex items-center justify-between",
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
                          {WEEKDAYS[i]},{" "}
                          <span className="text-on-surface-variant font-normal">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        {items.length} session{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="p-2 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-[12px] text-on-surface-variant text-center py-3">
                          Rest day — recover well 🌱
                        </p>
                      ) : (
                        items.map((s) => (
                          <SessionBlock
                            key={s.id}
                            session={s}
                            delay={0}
                            reduce={reduce ?? false}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ============ RIGHT: SIDEBAR ============ */}
          <aside className="space-y-5 lg:order-last">
            <AICoachCard reduce={reduce ?? false} missedCount={missed} />
            <UpcomingSessions
              upcoming={upcoming}
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
// Stat Tile
// ============================================================================

const STAT_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    iconShadow: "shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]",
    decor: "from-primary/15 to-primary/0",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    iconShadow: "shadow-[0_4px_12px_-2px_rgba(16,185,129,0.35)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-[#f43f5e] to-[#fb7185]",
    iconShadow: "shadow-[0_4px_12px_-2px_rgba(244,63,94,0.3)]",
    decor: "from-[#fb7185]/15 to-[#fb7185]/0",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    iconShadow: "shadow-[0_4px_12px_-2px_rgba(139,92,246,0.35)]",
    decor: "from-[#c084fc]/15 to-[#c084fc]/0",
  },
} as const;

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  delay,
  reduce,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: string | number;
  accent: keyof typeof STAT_ACCENTS;
  delay: number;
  reduce: boolean;
}) {
  const a = STAT_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -2 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,15,30,0.12)] transition-shadow"
    >
      <div
        className={cn(
          "absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
          a.decor,
        )}
      />
      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105",
            a.iconBg,
            a.iconShadow,
          )}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="text-[26px] sm:text-[28px] leading-none font-bold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-[11.5px] uppercase tracking-wider font-medium text-on-surface-variant mt-1">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Session block (calendar cell)
// ============================================================================

function sessionTypeAccent(type: Session["type"]) {
  if (type === "AI-Guided") {
    return {
      bar: "bg-gradient-to-b from-primary to-[#7d6dff]",
      pill: "bg-primary/10 text-primary",
      bg: "bg-gradient-to-br from-primary/[0.06] to-primary/[0.02]",
      border: "border-primary/15",
      hover: "hover:border-primary/30",
    };
  }
  if (type === "Group") {
    return {
      bar: "bg-gradient-to-b from-[#8b5cf6] to-[#c084fc]",
      pill: "bg-[#8b5cf6]/10 text-[#7c3aed]",
      bg: "bg-surface-container-lowest",
      border: "border-[var(--color-border-soft)]",
      hover: "hover:border-[#8b5cf6]/30",
    };
  }
  return {
    bar: "bg-gradient-to-b from-[#10b981] to-[#34d399]",
    pill: "bg-success-container text-[#1f7a4d]",
    bg: "bg-surface-container-lowest",
    border: "border-[var(--color-border-soft)]",
    hover: "hover:border-[#10b981]/30",
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
  const coach = getCoachById(session.coachId);
  const a = sessionTypeAccent(session.type);
  const time = new Date(session.start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isOnline = session.location?.toLowerCase() === "online";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.35, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -2 }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[12px] border p-2.5 transition-all",
        a.bg,
        a.border,
        a.hover,
        "shadow-[0_1px_2px_rgba(15,15,30,0.04)] hover:shadow-[0_6px_18px_-6px_rgba(15,15,30,0.18)]",
      )}
    >
      {/* Left color bar */}
      <span
        className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full", a.bar)}
      />

      <div className="pl-1.5">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[10.5px] font-semibold text-on-surface tabular-nums">
            {time}
          </span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider",
              a.pill,
            )}
          >
            {session.type === "AI-Guided"
              ? "AI"
              : session.type === "Group"
                ? "Group"
                : "1:1"}
          </span>
        </div>
        <p className="text-[12px] font-semibold leading-tight line-clamp-2 text-on-surface">
          {session.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-4 h-4 rounded-full bg-surface-container-high overflow-hidden text-[8px] flex items-center justify-center text-primary font-semibold">
            {coach?.avatarUrl ? (
              <img
                src={coach.avatarUrl}
                alt={coach.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials(coach?.name ?? "?")
            )}
          </div>
          <p className="text-[10.5px] text-on-surface-variant truncate flex-1">
            {coach?.name?.split(" ")[0]}
          </p>
          {isOnline && (
            <Video size={9} className="text-on-surface-variant shrink-0" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyDayHint({ isToday }: { isToday: boolean }) {
  return (
    <button className="group w-full h-full min-h-[80px] rounded-[10px] border border-dashed border-[var(--color-border-soft)] hover:border-primary/30 hover:bg-primary/[0.02] flex flex-col items-center justify-center transition-colors">
      <Sprout
        size={14}
        className="text-on-surface-variant/60 group-hover:text-primary/60 transition-colors"
      />
      <span className="text-[10px] text-on-surface-variant/70 group-hover:text-primary/70 mt-1 transition-colors">
        {isToday ? "Add today" : "Open"}
      </span>
    </button>
  );
}

// ============================================================================
// AI Coach card (sidebar)
// ============================================================================

function AICoachCard({
  reduce,
  missedCount,
}: {
  reduce: boolean;
  missedCount: number;
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
            Sportico AI
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-50" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_6px_16px_-3px_rgba(53,37,205,0.5)]">
              <Sparkles size={18} className="text-on-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] leading-snug font-semibold text-on-surface">
              {missedCount > 0
                ? `You missed ${missedCount} session${missedCount === 1 ? "" : "s"} this week.`
                : "You're on track this week."}
            </p>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
              Suggested:{" "}
              <span className="text-primary font-medium">
                15-minute Recovery Flow
              </span>{" "}
              to keep your streak alive without overloading.
            </p>
          </div>
        </div>

        <Link
          href="/learner/schedule"
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Start Now
          <ArrowRight size={13} />
        </Link>

        {/* Inline indicators */}
        <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-primary/10 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-[#ff7a3d]" />
            <span className="text-on-surface-variant">Streak</span>
            <span className="font-semibold">8d</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-primary" />
            <span className="text-on-surface-variant">Load</span>
            <span className="font-semibold">Light</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-[#10b981]" />
            <span className="text-on-surface-variant">Goal</span>
            <span className="font-semibold">4/5</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Upcoming sessions (sidebar)
// ============================================================================

function UpcomingSessions({
  upcoming,
  reduce,
}: {
  upcoming: Session[];
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.22, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold tracking-tight">
          Upcoming Sessions
        </h3>
        <Link
          href="#"
          className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          View all
          <ChevronRight size={12} />
        </Link>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {upcoming.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-container-low flex items-center justify-center">
              <CalendarPlus size={16} className="text-on-surface-variant" />
            </div>
            <p className="text-[13px] font-medium">No upcoming sessions</p>
            <p className="text-[11.5px] text-on-surface-variant mt-0.5">
              Book one to fill your week.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {upcoming.map((s, i) => (
              <UpcomingCard
                key={s.id}
                session={s}
                delay={i * 0.06}
                reduce={reduce}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function UpcomingCard({
  session,
  delay,
  reduce,
}: {
  session: Session;
  delay: number;
  reduce: boolean;
}) {
  const coach = getCoachById(session.coachId);
  const a = sessionTypeAccent(session.type);
  const date = new Date(session.start);
  const isOnline = session.location?.toLowerCase() === "online";
  const dayLabel = isSameDay(date, new Date(NOW))
    ? "Today"
    : isSameDay(date, addDays(new Date(NOW), 1))
      ? "Tomorrow"
      : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -2 }}
      className="group relative rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.02] hover:to-transparent p-3 transition-all cursor-pointer shadow-[0_1px_2px_rgba(15,15,30,0.03)] hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high overflow-hidden flex items-center justify-center text-primary text-[12px] font-semibold">
            {coach?.avatarUrl ? (
              <img
                src={coach.avatarUrl}
                alt={coach.name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials(coach?.name ?? "?")
            )}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface-container-lowest flex items-center justify-center",
              session.type === "AI-Guided"
                ? "bg-primary"
                : session.type === "Group"
                  ? "bg-[#8b5cf6]"
                  : "bg-[#10b981]",
            )}
          >
            {session.type === "AI-Guided" ? (
              <Sparkles size={8} className="text-white" />
            ) : session.type === "Group" ? (
              <Users size={8} className="text-white" />
            ) : (
              <CheckCircle2 size={8} className="text-white" />
            )}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate">
            {session.title}
          </p>
          <p className="text-[11.5px] text-on-surface-variant mt-0.5 truncate">
            with {coach?.name?.split(" ")[0] ?? "Coach"}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <Clock size={10} />
              {timeLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold",
                  a.pill,
                )}
              >
                {dayLabel}
              </span>
            </span>
            {isOnline && (
              <span className="inline-flex items-center gap-1">
                <Video size={10} /> Online
              </span>
            )}
            {!isOnline && session.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin size={10} />
                <span className="truncate">{session.location}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action button — appears on hover */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          className={cn(
            "flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all",
            isOnline
              ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)]"
              : "bg-surface-container-low text-on-surface hover:bg-surface-container",
          )}
        >
          {isOnline ? "Join" : "View"}
        </button>
        <button className="h-8 px-3 rounded-lg text-[12px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors">
          Reschedule
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Quick actions (sidebar)
// ============================================================================

const QUICK_ACTIONS = [
  {
    icon: CalendarPlus,
    label: "Book New",
    desc: "Find a coach",
    href: "/learner/coaches",
    accent: "indigo" as const,
  },
  {
    icon: Zap,
    label: "AI Workout",
    desc: "Start instantly",
    href: "#",
    accent: "violet" as const,
  },
  {
    icon: Activity,
    label: "Progress",
    desc: "View stats",
    href: "/learner/progress",
    accent: "emerald" as const,
  },
  {
    icon: Compass,
    label: "Coaches",
    desc: "Browse all",
    href: "/learner/coaches",
    accent: "rose" as const,
  },
];

const QA_ACCENT = {
  indigo: { bg: "from-primary to-[#7d6dff]", text: "text-primary" },
  violet: { bg: "from-[#8b5cf6] to-[#c084fc]", text: "text-[#7c3aed]" },
  emerald: { bg: "from-[#10b981] to-[#34d399]", text: "text-[#1f7a4d]" },
  rose: { bg: "from-[#f43f5e] to-[#fb7185]", text: "text-[#be123c]" },
} as const;

function QuickActions({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.3, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((q, i) => {
          const Icon = q.icon;
          const a = QA_ACCENT[q.accent];
          return (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.35 + i * 0.05,
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
                    a.bg,
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

      {/* Search shortcut */}
      <button className="mt-3 w-full flex items-center gap-2 h-9 px-3 rounded-[10px] bg-surface-container-low hover:bg-surface-container text-[12.5px] text-on-surface-variant transition-colors">
        <Search size={13} />
        <span>Search sessions, coaches…</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded font-mono">
          ⌘K
        </kbd>
      </button>
    </motion.div>
  );
}

// ============================================================================
// Date helpers
// ============================================================================

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Allow lucide-react Brain & TrendingUp imports without breaking tree-shake
void Brain;
