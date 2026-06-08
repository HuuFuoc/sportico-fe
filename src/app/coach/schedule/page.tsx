"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  Filter,
  Loader2,
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
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency, initials, localDateKey } from "@/lib/utils";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { getCurrentUserId } from "@/lib/auth-session";
import { devUserIdForRole } from "@/lib/auth";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showInfo, showApiError } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { AvailabilitySlot, Session } from "@/types";

// Use real current date — the mock clock is only for static demo fixtures.
const NOW = new Date();

type LearnerProfile = { name: string; avatarUrl?: string };

// Page-local learner lookup so calendar blocks and rows can resolve a session's
// learner without each one fetching (or importing mock data) individually.
const LearnerLookupContext = createContext<Map<string, LearnerProfile>>(new Map());
function useLearner(id: string): LearnerProfile | undefined {
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
  // Use the real authenticated coach ID from the JWT; fall back to dev hard-code
  // in mock mode (no backend configured) so the demo keeps working.
  const coachId = getCurrentUserId() ?? devUserIdForRole("coach");
  const {
    data: sessionsData,
    loading,
    error,
    refetch,
    // Direct GET /api/coaches/me/training-sessions — the coach's sessions across
    // every learner/booking in a single call (richer + cheaper than the
    // per-booking aggregate). `coachId` stays in the deps so the list refetches
    // once the JWT identity resolves on the client.
  } = useApiResource(() => api.fetchMyCoachTrainingSessions(), [coachId]);
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);

  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [detailSlot, setDetailSlot] = useState<AvailabilitySlot | null>(null);
  const [createFromTime, setCreateFromTime] = useState<Date | null>(null);
  const [detailSession, setDetailSession] = useState<Session | null>(null);

  // Learner lookup: mock mode uses mock fixture; live mode resolves via
  // GET /api/users/{id} (AllowAnonymous) for each unique learnerId in sessions.
  const { data: learnersData } = useApiResource(
    () => isMockMode() ? api.fetchLearners() : Promise.resolve([]),
    [],
  );
  const mockLearnerMap = useMemo(
    () => new Map((learnersData ?? []).map((l) => [l.id, { name: l.name, avatarUrl: l.avatarUrl }])),
    [learnersData],
  );
  const [liveProfiles, setLiveProfiles] = useState<Map<string, LearnerProfile>>(new Map());
  useEffect(() => {
    if (isMockMode() || sessions.length === 0) return;
    const ids = [...new Set(sessions.map((s) => s.learnerId).filter((id): id is string => !!id))];
    if (ids.length === 0) return;
    let cancelled = false;
    Promise.allSettled(ids.map((id) => api.fetchUserProfile(id).then((p) => ({ id, profile: p }))))
      .then((results) => {
        if (cancelled) return;
        setLiveProfiles((prev) => {
          const next = new Map(prev);
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value.profile) next.set(r.value.id, r.value.profile);
          });
          return next;
        });
      });
    return () => { cancelled = true; };
  }, [sessions]);
  const learnerById = isMockMode() ? mockLearnerMap : liveProfiles;

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

  const { data: slotsData, refetch: refetchSlots } = useApiResource(
    () => api.fetchMySlots({ startFrom: weekStart.toISOString(), startTo: weekEnd.toISOString() }),
    [weekStart.toISOString(), weekEnd.toISOString()],
  );
  const slots = useMemo(() => slotsData ?? [], [slotsData]);

  // Bucket availability slots by day (parallel to dayBuckets)
  const slotDayBuckets = useMemo(
    () =>
      weekDays.map((d) => {
        const key = localDateKey(d);
        return slots
          .filter((sl) => localDateKey(new Date(sl.startTime)) === key)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      }),
    [weekDays, slots],
  );

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
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
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

  const weekRangeLabel = `${weekStart.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  })}`;

  if (loading) {
    return (
      <AppShell role="coach" title="Lịch">
        <LoadingState label="Đang tải lịch…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Lịch">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <LearnerLookupContext.Provider value={learnerById}>
      <AppShell role="coach" title="Lịch">
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
              aria-label="Lọc"
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
            >
              <Filter size={13} />
              Filter
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                aria-label="Tuần trước"
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
                aria-label="Tuần sau"
                className="w-10 h-10 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setShowCreateSlot(true)}
              className="ml-1 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Slot
            </button>
          </div>
        </motion.header>

        {/* ============ SUMMARY ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={CalendarPlus}
            label="Buổi tập tuần này"
            value={sessionsThisWeek}
            trend="+3"
            trendLabel="so tuần trước"
            accent="indigo"
            spark={seedSpark(1, 16, 6)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={Timer}
            label="Slot trống"
            value={openSlots}
            trend="Còn trống"
            trendLabel="tuần này"
            accent="violet"
            spark={seedSpark(2, 12, 4)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={Activity}
            label="Tỷ lệ lấp đầy"
            value={`${utilization}%`}
            trend={utilization >= 70 ? "Đúng mục tiêu" : "Thêm slot"}
            trendLabel="công suất"
            accent="amber"
            spark={seedSpark(3, 65, 12)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={DollarSign}
            label="Doanh thu"
            value={formatCurrency(revenue)}
            trend="+12%"
            trendLabel="so tuần trước"
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
            onRefetch={refetch}
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
                  {weekStart.toLocaleDateString("vi-VN", { month: "long" })}{" "}
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
                <LegendDot color="#8b5cf6" label="Nhóm" />
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
                      {/* Hour grid lines — click-to-add only, no chips inside */}
                      {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                        const hour = START_HOUR + i;
                        const hourStart = new Date(d);
                        hourStart.setHours(hour, 0, 0, 0);
                        const hasSession = dayBuckets[dayIdx].some(
                          (s) => new Date(s.start).getHours() === hour,
                        );
                        const hasSlot = slotDayBuckets[dayIdx].some(
                          (sl) =>
                            new Date(sl.startTime).getHours() === hour &&
                            sl.status?.toLowerCase() !== "booked",
                        );
                        return (
                          <div
                            key={i}
                            style={{ height: HOUR_HEIGHT }}
                            className="relative border-b border-dashed border-[var(--color-border-soft)]/40 overflow-hidden"
                          >
                            {!hasSession && !hasSlot && (
                              <div
                                onClick={() => {
                                  setCreateFromTime(hourStart);
                                  setShowCreateSlot(true);
                                }}
                                className="absolute inset-0 group flex items-start cursor-cell hover:bg-primary/[0.02] transition-colors"
                              >
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary/60 pl-1.5 pt-1 transition-opacity">
                                  + Add
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Session chips — absolutely positioned within column, never clipped */}
                      {dayBuckets[dayIdx].map((s) => {
                        const start = new Date(s.start);
                        const top =
                          (start.getHours() - START_HOUR) * HOUR_HEIGHT +
                          (start.getMinutes() / 60) * HOUR_HEIGHT;
                        const height = Math.max(44, (s.durationMinutes / 60) * HOUR_HEIGHT) - 2;
                        return (
                          <div
                            key={s.id}
                            className="absolute left-1 right-1 z-10 hover:z-20"
                            style={{ top, height }}
                          >
                            <SessionChip
                              session={s}
                              onClick={() => setDetailSession(s)}
                            />
                          </div>
                        );
                      })}

                      {/* Slot chips — absolutely positioned within column */}
                      {slotDayBuckets[dayIdx]
                        .filter((sl) => sl.status?.toLowerCase() !== "booked")
                        .map((sl) => {
                          const start = new Date(sl.startTime);
                          const end = new Date(sl.endTime);
                          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                          const top =
                            (start.getHours() - START_HOUR) * HOUR_HEIGHT +
                            (start.getMinutes() / 60) * HOUR_HEIGHT;
                          const height = Math.max(44, (durationMin / 60) * HOUR_HEIGHT) - 2;
                          return (
                            <div
                              key={sl.id}
                              className="absolute left-1 right-1 z-10 hover:z-20"
                              style={{ top, height }}
                            >
                              <SlotChip
                                slot={sl}
                                onClick={() => setDetailSlot(sl)}
                              />
                            </div>
                          );
                        })}

                      {/* Now indicator */}
                      {isToday && <NowIndicator />}
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
                          <MobileSessionCard key={s.id} session={s} onOpen={() => setDetailSession(s)} />
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
              onOpenSlot={(time) => { setCreateFromTime(time); setShowCreateSlot(true); }}
            />
            <UpcomingSessions
              sessions={upcomingNext}
              reduce={reduce ?? false}
            />
            <QuickActions reduce={reduce ?? false} onNewSlot={() => setShowCreateSlot(true)} />
          </aside>
        </div>
      </div>
      {showCreateSlot && (
        <CreateSlotModal
          initialTime={createFromTime}
          onClose={() => { setShowCreateSlot(false); setCreateFromTime(null); }}
          onCreated={() => { setShowCreateSlot(false); setCreateFromTime(null); refetchSlots(); }}
        />
      )}
      {detailSlot && (
        <SlotDetailModal
          slot={detailSlot}
          onClose={() => setDetailSlot(null)}
          onCancelled={() => { setDetailSlot(null); refetchSlots(); }}
        />
      )}
      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          onClose={() => setDetailSession(null)}
          onRefetch={() => { setDetailSession(null); refetch(); }}
        />
      )}
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
  onRefetch,
}: {
  pending: Session[];
  reduce: boolean;
  onRefetch: () => void;
}) {
  const learnerById = useContext(LearnerLookupContext);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);

  const handleConfirm = useCallback(async (id: string) => {
    if (isMockMode() || confirming) return;
    setConfirming(id);
    try {
      await api.confirmSession(id);
      showSuccess("Đã xác nhận buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setConfirming(null);
    }
  }, [confirming, onRefetch]);

  const handleDecline = useCallback(async (id: string) => {
    if (isMockMode() || declining) return;
    if (!window.confirm("Từ chối yêu cầu buổi tập này?")) return;
    setDeclining(id);
    try {
      await api.cancelSession(id, "Huấn luyện viên từ chối");
      showSuccess("Đã từ chối yêu cầu buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setDeclining(null);
    }
  }, [declining, onRefetch]);

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
            const isConfirming = confirming === s.id;
            const isDeclining = declining === s.id;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 bg-surface-container-lowest rounded-[14px] p-3 border border-[var(--color-border-soft)] hover:border-[#f59e0b]/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden text-[11px] flex items-center justify-center text-primary font-semibold shrink-0">
                  {learner?.avatarUrl ? (
                    <img
                      src={learner.avatarUrl}
                      alt={learner.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(learner?.name ?? s.learnerId.slice(0, 2).toUpperCase())
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold truncate">
                    {learner?.name ?? `Học viên ${s.learnerId.slice(0, 6)}`} — {s.title}
                  </p>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">
                    {new Date(s.start).toLocaleString("vi-VN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
                <button
                  aria-label="Từ chối"
                  disabled={isDeclining || isConfirming}
                  onClick={() => handleDecline(s.id)}
                  className="h-9 w-9 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-on-surface-variant hover:text-[#ba1a1a] transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isDeclining ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />}
                </button>
                <button
                  disabled={isConfirming || isDeclining}
                  onClick={() => handleConfirm(s.id)}
                  className="h-9 px-3.5 rounded-lg bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-1 disabled:opacity-60 disabled:scale-100"
                >
                  {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
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
// Session chip — compact inline block inside each hour cell
// ============================================================================

function chipAccent(type: Session["type"]) {
  if (type === "AI-Guided") return { bg: "bg-[#10b981]/15 border-[#10b981]/30 text-[#1f7a4d]", bar: "bg-[#10b981]", badge: "AI" };
  if (type === "Group") return { bg: "bg-[#8b5cf6]/12 border-[#8b5cf6]/30 text-[#7c3aed]", bar: "bg-[#8b5cf6]", badge: "G" };
  return { bg: "bg-primary/10 border-primary/25 text-primary", bar: "bg-primary", badge: "1:1" };
}


function SessionChip({ session, onClick }: { session: Session; onClick: () => void }) {
  const learner = useLearner(session.learnerId);
  const a = chipAccent(session.type);
  const start = new Date(session.start);
  // 24h short format saves horizontal space in narrow 7-col grid
  const time = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const isPending = session.status === "pending_confirmation";
  const isCancelled = session.status === "cancelled";

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "relative h-full w-full rounded-[7px] border cursor-pointer select-none overflow-hidden transition-all hover:shadow-[0_2px_8px_-2px_rgba(15,15,30,0.18)] active:scale-[0.99]",
        isCancelled && "opacity-55",
        a.bg,
      )}
    >
      {/* Left accent bar */}
      <span className={cn("absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full z-[1]", a.bar)} />
      {/* Content — flex-col with overflow:hidden clips lines that don't fit */}
      <div className="h-full pl-[9px] pr-1 py-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-[3px] shrink-0 min-w-0 overflow-hidden">
          <span className="text-[10.5px] font-bold tabular-nums leading-none whitespace-nowrap shrink-0">
            {time}
          </span>
          {isPending && (
            <span className="w-[5px] h-[5px] rounded-full bg-[#f59e0b] shrink-0" />
          )}
        </div>
        {/* Second line — clipped naturally if chip height is too small */}
        <span className="text-[9.5px] leading-none mt-[3px] block truncate opacity-70 whitespace-nowrap overflow-hidden">
          {learner?.name ?? "—"}
        </span>
      </div>
    </div>
  );
}

function SlotChip({ slot, onClick }: { slot: AvailabilitySlot; onClick: () => void }) {
  const start = new Date(slot.startTime);
  const time = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const isGroup = (slot.maxParticipants ?? 1) > 1;
  const booked = slot.bookedParticipants ?? 0;
  const max = slot.maxParticipants ?? 1;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="relative h-full w-full rounded-[7px] border border-dashed border-[#8b5cf6]/40 bg-[#8b5cf6]/[0.08] cursor-pointer select-none overflow-hidden hover:bg-[#8b5cf6]/15 transition-all"
    >
      <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#8b5cf6]" />
      <div className="h-full pl-[9px] pr-1 py-1 flex flex-col min-w-0 overflow-hidden">
        <span className="text-[10.5px] font-bold tabular-nums leading-none whitespace-nowrap text-[#7c3aed] shrink-0 block">
          {time}
        </span>
        <span className="text-[9.5px] leading-none mt-[3px] truncate text-[#7c3aed] opacity-70 block whitespace-nowrap overflow-hidden">
          {isGroup ? `${booked}/${max} chỗ` : "Khả dụng"}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Session Detail Modal — popup when clicking a session chip
// ============================================================================

function SessionDetailModal({
  session,
  onClose,
  onRefetch,
}: {
  session: Session;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const learner = useLearner(session.learnerId);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const start = new Date(session.start);
  const end = new Date(start.getTime() + session.durationMinutes * 60000);
  const isOnline = session.location?.toLowerCase() === "online";
  const meetingUrl = session.notes?.match(/https?:\/\/\S+/)?.[0];
  const isInProgress = session.status === "in_progress";
  const isCancelled = session.status === "cancelled";
  const isCompleted = session.status === "completed";
  const isPending = session.status === "pending_confirmation";

  const a = chipAccent(session.type);

  const formatDt = (d: Date) =>
    d.toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  async function handleConfirm() {
    if (isMockMode()) { onRefetch(); return; }
    if (confirming) return;
    setConfirming(true);
    try {
      await api.confirmSession(session.id);
      showSuccess("Đã xác nhận buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setConfirming(false);
    }
  }

  async function handleJoin() {
    const url = meetingUrl ?? (isOnline ? session.location : undefined);
    if (url && url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      showInfo("Không có link tham gia cho buổi này.");
    }
  }

  async function handleCancel() {
    if (!window.confirm("Bạn chắc chắn muốn hủy buổi này?")) return;
    if (isMockMode()) { onRefetch(); return; }
    if (cancelling) return;
    setCancelling(true);
    try {
      await api.cancelSession(session.id);
      showSuccess("Đã hủy buổi học thành công.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setCancelling(false);
    }
  }

  async function handleComplete() {
    if (!window.confirm("Xác nhận buổi học đã diễn ra? Doanh thu sẽ được ghi nhận.")) return;
    if (isMockMode()) { onRefetch(); return; }
    if (completing) return;
    setCompleting(true);
    try {
      await api.completeSession(session.id);
      showSuccess("Đã hoàn thành buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setCompleting(false);
    }
  }

  const statusPill: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending_confirmation: "bg-[#f59e0b]/10 text-[#b45309] border-[#f59e0b]/30",
    in_progress: "bg-primary/10 text-primary border-primary/25",
    completed: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
    cancelled: "bg-[#ffdad6] text-[#ba1a1a] border-[#f43f5e]/30",
  };
  const statusLabel: Record<string, string> = {
    confirmed: "Đã xác nhận",
    pending_confirmation: "Chờ xác nhận",
    in_progress: "Đang diễn ra",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-[24px] sm:rounded-[24px] border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        {/* Header with learner avatar */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center text-[14px] font-bold text-primary shrink-0">
              {learner?.avatarUrl
                ? <img src={learner.avatarUrl} alt={learner.name} className="w-full h-full object-cover" />
                : initials(learner?.name ?? "?")}
            </div>
            <div>
              <p className="text-[15.5px] font-semibold tracking-tight leading-snug">
                {learner?.name ?? `Học viên ${session.learnerId.slice(0, 6)}`}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-semibold", a.bg)}>
                  {session.type === "AI-Guided" ? "AI" : session.type === "Group" ? "Nhóm" : "1:1"}
                </span>
                <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-semibold", statusPill[session.status] ?? statusPill.confirmed)}>
                  {statusLabel[session.status] ?? session.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Title */}
          <p className="text-[14px] font-semibold text-on-surface">{session.title}</p>

          {/* Time */}
          <div className="flex items-start gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-primary/15 to-[#7d6dff]/10 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-on-surface">{formatDt(start)}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                đến {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                {" "}· {session.durationMinutes} phút
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-primary/15 to-[#7d6dff]/10 flex items-center justify-center shrink-0">
              {isOnline ? <Video size={14} className="text-primary" /> : <MapPin size={14} className="text-primary" />}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-on-surface">
                {isOnline ? "Trực tuyến (Online)" : (session.location ?? "Chưa đặt địa điểm")}
              </p>
              {meetingUrl && (
                <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline break-all">
                  {meetingUrl}
                </a>
              )}
            </div>
          </div>

          {/* Price */}
          {session.price > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-surface-container-low/60 text-[12px]">
              <span className="text-on-surface-variant">Học phí</span>
              <span className="font-semibold text-on-surface tabular-nums">{formatCurrency(session.price)}</span>
            </div>
          )}

          {/* General notes */}
          {session.notes && !session.learnerNote && !session.coachNote && (
            <p className="text-[12px] text-on-surface-variant italic px-1">📝 {session.notes}</p>
          )}

          {/* Learner note */}
          {session.learnerNote && (
            <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-surface-container-low/60 text-[12px]">
              <span className="shrink-0 mt-[1px]">📝</span>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface mb-0.5">Ghi chú học viên</p>
                <p className="text-on-surface-variant break-words">{session.learnerNote}</p>
              </div>
            </div>
          )}

          {/* Coach note */}
          {session.coachNote && (
            <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-surface-container-low/60 text-[12px]">
              <span className="shrink-0 mt-[1px]">📋</span>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface mb-0.5">Ghi chú của bạn</p>
                <p className="text-on-surface-variant break-words">{session.coachNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors"
          >
            Đóng
          </button>

          {isPending && (
            <button
              onClick={() => void handleConfirm()}
              disabled={confirming}
              className="flex-1 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[13px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Xác nhận
            </button>
          )}

          {isInProgress && (
            <button
              onClick={() => void handleComplete()}
              disabled={completing}
              className="flex-1 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[13px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Hoàn thành
            </button>
          )}

          {!isCancelled && !isCompleted && (isOnline || meetingUrl) && (
            <button
              onClick={() => void handleJoin()}
              className="flex-1 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Video size={14} />
              Tham gia
            </button>
          )}

          {!isCancelled && !isCompleted && (
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="flex-1 h-10 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#ba1a1a] text-[13px] font-semibold hover:bg-[#f43f5e]/20 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Hủy buổi
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MobileSessionCard({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const learner = useLearner(session.learnerId);
  const a = chipAccent(session.type);
  const start = new Date(session.start);
  const time = start.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isOnline = session.location?.toLowerCase() === "online";
  return (
    <div
      onClick={onOpen}
      className={cn(
        "relative rounded-[12px] border p-3 bg-surface-container-lowest cursor-pointer hover:shadow-[0_4px_12px_-4px_rgba(15,15,30,0.12)] transition-all",
        a.bg,
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
            Sportico AI · Gợi ý
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Trực tiếp
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
              <span className="text-[#b95000]">{count} học viên</span> chưa đặt buổi trong 2 tuần.
            </p>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
              Một tin nhắn hỏi thăm nhanh có thể tăng tỉ lệ đặt lại lên{" "}
              <span className="text-on-surface font-medium">28%</span>. Nhắn ngay để duy trì kết nối.
            </p>
          </div>
        </div>

        <Link
          href="/coach/messages"
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Send size={13} />
          Nhắn tin học viên
        </Link>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-primary" />
            <span className="text-on-surface-variant">Học viên</span>
            <span className="font-semibold">{count}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[#10b981]" />
            <span className="text-on-surface-variant">Đặt lại</span>
            <span className="font-semibold">+28%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-[#f59e0b]" />
            <span className="text-on-surface-variant">Thời gian</span>
            <span className="font-semibold">~3ph</span>
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
  onOpenSlot,
}: {
  sessions: Session[];
  openSlots: Date[];
  reduce: boolean;
  onOpenSlot: (time: Date) => void;
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
          <h3 className="text-[16px] font-semibold tracking-tight">Hôm nay</h3>
          <p className="text-[11.5px] text-on-surface-variant mt-0.5">
            {sessions.length} buổi ·{" "}
            {openSlots.length} slot trống
          </p>
        </div>
        <span className="text-[11px] text-on-surface-variant">
          {new Date(NOW).toLocaleDateString("vi-VN", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 && openSlots.length === 0 && (
          <p className="text-center text-[12px] text-on-surface-variant py-6">
            Hôm nay chưa có buổi nào.
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
            onOpen={() => onOpenSlot(d)}
          />
        ))}

        {openSlots.length > 0 && (
          <Link
            href="/coach/learners"
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-9 rounded-[12px] border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/[0.04] text-primary text-[12.5px] font-semibold transition-colors"
          >
            <Sprout size={13} />
            Mời học viên ({openSlots.length} slot)
          </Link>
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
  const time = new Date(session.start).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  onOpen,
}: {
  time: Date;
  delay: number;
  reduce: boolean;
  onOpen: () => void;
}) {
  const t = time.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
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
      onClick={onOpen}
      className="group flex items-center gap-3 p-2.5 rounded-[12px] border border-dashed border-[var(--color-border-soft)] hover:border-primary/30 hover:bg-primary/[0.04] cursor-pointer transition-all"
    >
      <div className="text-center w-14 shrink-0">
        <p className="text-[11.5px] font-bold tabular-nums leading-none text-on-surface-variant group-hover:text-primary transition-colors">
          {t}
        </p>
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          1h
        </p>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-container-low border border-dashed border-[var(--color-border-soft)] group-hover:border-primary/40 group-hover:bg-primary/[0.06] flex items-center justify-center shrink-0 transition-all">
        <Plus size={13} className="text-on-surface-variant group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
          Slot trống
        </p>
        <p className="text-[11px] text-on-surface-variant/70 truncate">
          Nhấn để tạo khung giờ
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
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
          {date.toLocaleDateString("vi-VN", { month: "short" })}
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
          {date.toLocaleDateString("vi-VN", { weekday: "short" })}
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
    label: "Buổi mới",
    desc: "Tạo đặt lịch",
    href: "#",
    accent: "indigo" as const,
  },
  {
    icon: Sprout,
    label: "Chặn thời gian",
    desc: "Đánh dấu bận",
    href: "#",
    accent: "amber" as const,
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
    label: "Khả dụng",
    desc: "Chỉnh giờ làm việc",
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

function QuickActions({ reduce, onNewSlot }: { reduce: boolean; onNewSlot: () => void }) {
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
          const isNewSlot = q.label === "Buổi mới";
          const inner = (
            <>
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
            </>
          );
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
              {isNewSlot ? (
                <button
                  onClick={onNewSlot}
                  className="group w-full text-left rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={q.href}
                  className="group block rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
                >
                  {inner}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Silence unused import warnings
void Zap;

// ============================================================================
// Availability Slot Block (absolutely positioned in calendar grid)
// ============================================================================

// ============================================================================
// Create Availability Slot Modal
// ============================================================================

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateSlotModal({
  initialTime,
  onClose,
  onCreated,
}: {
  initialTime: Date | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [startTime, setStartTime] = useState(() => {
    if (initialTime) {
      return toLocalDatetimeString(initialTime);
    }
    return toLocalDatetimeString(new Date(Date.now() + 3600_000));
  });
  const [endTime, setEndTime] = useState(() => {
    if (initialTime) {
      const end = new Date(initialTime);
      end.setHours(end.getHours() + 1);
      return toLocalDatetimeString(end);
    }
    return toLocalDatetimeString(new Date(Date.now() + 7200_000));
  });
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [note, setNote] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  function validateAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError("Ngày giờ không hợp lệ."); return;
    }
    if (start >= end) {
      setError("Thời gian bắt đầu phải trước thời gian kết thúc."); return;
    }
    doSubmit(start.toISOString(), end.toISOString());
  }

  async function doSubmit(startISO: string, endISO: string) {
    setSubmitting(true);
    try {
      await api.createSlot({
        startTime: startISO,
        endTime: endISO,
        location: location.trim() || undefined,
        isOnline,
        meetingUrl: isOnline && meetingUrl.trim() ? meetingUrl.trim() : undefined,
        note: note.trim() || undefined,
        maxParticipants: maxParticipants > 1 ? maxParticipants : undefined,
      });
      showSuccess("Tạo khung giờ thành công.");
      onCreated();
    } catch (err) {
      showApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const isPast = new Date(startTime) < new Date();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="w-full max-w-md bg-surface-container-lowest rounded-[24px] border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)]">
              <CalendarPlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight">Tạo Slot Khả Dụng</h2>
              <p className="text-[11.5px] text-on-surface-variant">Học viên có thể đặt lịch vào slot này</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={validateAndSubmit} className="px-6 py-5 space-y-4">
          {/* Past-time warning */}
          {isPast && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[12px] text-[#b45309]">
              <Clock size={13} className="mt-0.5 shrink-0" />
              Thời gian bắt đầu đã qua — slot vẫn được tạo nhưng học viên có thể không đặt được.
            </div>
          )}

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
                Bắt đầu *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
                Kết thúc *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Online toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              isOnline ? "bg-primary" : "bg-surface-container-high",
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                isOnline ? "left-5" : "left-0.5",
              )} />
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
            />
            <div>
              <p className="text-[13px] font-medium">Buổi online</p>
              <p className="text-[11px] text-on-surface-variant">Học qua video call</p>
            </div>
            <Video size={15} className={cn("ml-auto transition-colors", isOnline ? "text-primary" : "text-on-surface-variant")} />
          </label>

          {/* Location / Meeting URL */}
          {isOnline ? (
            <div>
              <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
                Link tham gia (tuỳ chọn)
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
                Địa điểm (tuỳ chọn)
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sân cầu lông ABC..."
                  className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* Max participants */}
          <div>
            <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
              Số học viên tối đa
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMaxParticipants((n) => Math.max(1, n - 1))}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center text-on-surface font-bold transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center text-[14px] font-semibold tabular-nums">{maxParticipants}</span>
                <button
                  type="button"
                  onClick={() => setMaxParticipants((n) => Math.min(50, n + 1))}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center text-on-surface font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                  maxParticipants === 1
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-[#8b5cf6]/10 text-[#7c3aed] border-[#8b5cf6]/20",
                )}>
                  <Users size={11} />
                  {maxParticipants === 1 ? "Cá nhân (1:1)" : `Nhóm (tối đa ${maxParticipants})`}
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1.5">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Yêu cầu đặc biệt, chuẩn bị dụng cụ..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-[#ba1a1a]/10 border border-[#ba1a1a]/25 text-[12px] text-[#ba1a1a]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[var(--color-border-soft)] text-[13.5px] font-medium hover:bg-surface-container-low transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {submitting ? "Đang tạo…" : "Tạo Slot"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Slot Detail / Cancel Modal
// ============================================================================

const SLOT_STATUS_LABEL: Record<string, { label: string; pill: string }> = {
  available: { label: "Khả dụng", pill: "bg-[#8b5cf6]/10 text-[#7c3aed] border-[#8b5cf6]/25" },
  booked:    { label: "Đã đặt",  pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã hủy", pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]" },
};

function SlotDetailModal({
  slot,
  onClose,
  onCancelled,
}: {
  slot: AvailabilitySlot;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cancelling, setCancelling] = useState(false);

  const start = new Date(slot.startTime);
  const end   = new Date(slot.endTime);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  const statusMeta = SLOT_STATUS_LABEL[slot.status?.toLowerCase() ?? "available"] ?? SLOT_STATUS_LABEL.available;

  const canCancel = slot.status?.toLowerCase() === "available";
  const isGroup = (slot.maxParticipants ?? 1) > 1;
  const bookedCount = slot.bookedParticipants ?? 0;
  const maxCount = slot.maxParticipants ?? 1;

  const formatDt = (d: Date) =>
    d.toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  async function handleCancel() {
    if (!window.confirm("Bạn chắc chắn muốn hủy khung giờ này?\nHọc viên sẽ không thể đặt slot này nữa.")) return;
    if (isMockMode()) { onCancelled(); return; }
    setCancelling(true);
    try {
      await api.cancelSlot(slot.id);
      showSuccess("Đã hủy khung giờ thành công.");
      onCancelled();
    } catch (err) {
      showApiError(err);
      setCancelling(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-sm bg-surface-container-lowest rounded-t-[24px] sm:rounded-[24px] border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_3px_10px_-2px_rgba(139,92,246,0.4)] shrink-0">
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Chi tiết khung giờ</p>
              <span className={cn(
                "inline-flex items-center border px-2 py-0.5 rounded-full text-[10.5px] font-semibold mt-0.5",
                statusMeta.pill,
              )}>
                {statusMeta.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Time row */}
          <div className="flex items-start gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#8b5cf6]/15 to-[#c084fc]/10 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-on-surface">{formatDt(start)}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                đến {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                {" "}· {durationMin} phút
              </p>
            </div>
          </div>

          {/* Location / Online */}
          <div className="flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#8b5cf6]/15 to-[#c084fc]/10 flex items-center justify-center shrink-0">
              {slot.isOnline ? <Video size={14} className="text-[#7c3aed]" /> : <MapPin size={14} className="text-[#7c3aed]" />}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-on-surface">
                {slot.isOnline ? "Trực tuyến (Online)" : (slot.location ?? "Chưa đặt địa điểm")}
              </p>
              {slot.isOnline && slot.meetingUrl && (
                <a
                  href={slot.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline break-all"
                >
                  {slot.meetingUrl}
                </a>
              )}
            </div>
          </div>

          {/* Capacity row (group slots) */}
          {isGroup && (
            <div className="flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
              <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#8b5cf6]/15 to-[#c084fc]/10 flex items-center justify-center shrink-0">
                <Users size={14} className="text-[#7c3aed]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-on-surface">
                  {bookedCount}/{maxCount} chỗ đã đặt
                </p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-on-surface-variant/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#c084fc] transition-all"
                    style={{ width: maxCount > 0 ? `${Math.round((bookedCount / maxCount) * 100)}%` : "0%" }}
                  />
                </div>
                <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                  {slot.remainingParticipants ?? (maxCount - bookedCount)} chỗ còn trống
                </p>
              </div>
            </div>
          )}

          {/* Note */}
          {slot.note && (
            <p className="text-[12px] text-on-surface-variant italic px-1">
              📝 {slot.note}
            </p>
          )}

          {/* Booked/Cancelled explanation */}
          {slot.status?.toLowerCase() === "booked" && !isGroup && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              Slot này đã có học viên đặt lịch — không thể hủy trực tiếp.
            </div>
          )}
          {slot.status?.toLowerCase() === "booked" && isGroup && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              Slot nhóm đã đầy ({maxCount}/{maxCount} chỗ) — không thể đặt thêm.
            </div>
          )}
          {/* Warn coach if cancelling a group slot with existing bookings */}
          {canCancel && isGroup && bookedCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[12px] text-[#b45309]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {bookedCount} học viên đã đặt slot này. Hủy slot sẽ ảnh hưởng đến họ.
            </div>
          )}
          {slot.status?.toLowerCase() === "cancelled" && (
            <div className="flex items-start gap-2 p-3 rounded-[12px] bg-surface-container-low border border-[var(--color-border-soft)] text-[12px] text-on-surface-variant">
              <Ban size={14} className="mt-0.5 shrink-0" />
              Slot này đã bị hủy.
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors"
          >
            Đóng
          </button>
          {canCancel && (
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="flex-1 h-10 rounded-xl bg-[#f43f5e] text-white text-[13px] font-semibold shadow-[0_3px_10px_-2px_rgba(244,63,94,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(244,63,94,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100 inline-flex items-center justify-center gap-1.5"
            >
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              {cancelling ? "Đang hủy…" : "Hủy khung giờ"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
