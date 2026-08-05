"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency, localDateKey } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { getCurrentUserId } from "@/lib/auth-session";
import { devUserIdForRole } from "@/lib/auth";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showInfo, showApiError } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { sessionStatus } from "@/lib/status-labels";
import type { Session } from "@/types";

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

// Calendar config
const START_HOUR = 7;
const END_HOUR = 19; // exclusive
const HOUR_HEIGHT = 56; // px per hour
const CAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

// ============================================================================
// Session grouping — same package slot = same start+end. A group with >1
// session is a group class (multiple learners booked the same fixed slot).
// ============================================================================

interface SessionGroup {
  key: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  sessions: Session[];
  isGroup: boolean;
}

function groupSessions(list: Session[]): SessionGroup[] {
  const map = new Map<string, Session[]>();
  for (const s of list) {
    const start = new Date(s.start);
    const end = s.endTime
      ? new Date(s.endTime)
      : new Date(start.getTime() + s.durationMinutes * 60_000);
    const key = `${start.toISOString()}|${end.toISOString()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.entries()]
    .map(([key, sessions]) => {
      const start = new Date(sessions[0].start);
      const end = sessions[0].endTime
        ? new Date(sessions[0].endTime)
        : new Date(start.getTime() + sessions[0].durationMinutes * 60_000);
      return {
        key,
        start,
        end,
        durationMinutes: Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / 60_000),
        ),
        sessions,
        isGroup: sessions.length > 1,
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function isOnlineSession(s: Session): boolean {
  return s.meetingUrl != null || s.location?.toLowerCase() === "online";
}

function sessionEnd(s: Session): Date {
  return s.endTime
    ? new Date(s.endTime)
    : new Date(new Date(s.start).getTime() + s.durationMinutes * 60_000);
}

/** A scheduled session whose time has passed — coach should mark it complete. */
function needsCompletion(s: Session): boolean {
  return (
    (s.status === "scheduled" || s.status === "in_progress") &&
    sessionEnd(s).getTime() < NOW.getTime()
  );
}

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
    // every learner/booking in a single call. These are auto-created by the
    // backend when learners purchase fixed-schedule packages; the coach never
    // creates them manually.
  } = useApiResource(() => api.fetchMyCoachTrainingSessions(), [coachId]);
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);

  const [detailGroup, setDetailGroup] = useState<SessionGroup | null>(null);

  // Learner lookup: mock mode uses mock fixture; live mode resolves via
  // GET /api/users/{id} (AllowAnonymous) for each unique learnerId in sessions.
  const { data: learnersData } = useApiResource(
    () => (isMockMode() ? api.fetchLearners() : Promise.resolve([])),
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

  // Per-day session groups (parallel to weekDays).
  const dayGroupBuckets = useMemo(
    () =>
      weekDays.map((d) => {
        const key = localDateKey(d);
        const dayList = weekSessions.filter(
          (s) => localDateKey(new Date(s.start)) === key,
        );
        return groupSessions(dayList);
      }),
    [weekDays, weekSessions],
  );

  // Today
  const todayKey = localDateKey(new Date(NOW));
  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => localDateKey(new Date(s.start)) === todayKey)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [sessions, todayKey],
  );

  // Upcoming after now
  const upcomingNext = useMemo(
    () =>
      sessions
        .filter((s) => {
          const t = new Date(s.start).getTime();
          return t >= NOW.getTime() && s.status !== "cancelled" && s.status !== "completed";
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 4),
    [sessions],
  );

  // Sessions that already happened but are still "scheduled" → need the coach
  // to confirm completion (coach is paid per completed session).
  const toComplete = useMemo(
    () =>
      sessions
        .filter(needsCompletion)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [sessions],
  );

  // Top summary stats
  const sessionsThisWeek = weekSessions.length;
  const uniqueLearnersThisWeek = useMemo(
    () => new Set(weekSessions.map((s) => s.learnerId).filter(Boolean)).size,
    [weekSessions],
  );
  // Revenue = ONLY completed sessions (coach is paid per completed session,
  // never on purchase). Never imply the full package was paid out.
  const completedRevenueThisWeek = weekSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.price, 0);

  const weekRangeLabel = `${weekStart.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  })}`;

  if (loading) {
    return (
      <AppShell role="coach" title="Lịch dạy">
        <LoadingState label="Đang tải lịch…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Lịch dạy">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  const hasAnySession = sessions.length > 0;

  return (
    <LearnerLookupContext.Provider value={learnerById}>
      <AppShell role="coach" title="Lịch dạy">
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
                  Lịch tự động từ gói tập
                </span>
                <span className="text-[12px] text-on-surface-variant">{weekRangeLabel}</span>
              </div>
              <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
                Lịch dạy
              </h1>
              <p className="text-[14px] text-on-surface-variant mt-1.5">
                {sessionsThisWeek} buổi tuần này ·{" "}
                <span className="text-on-surface font-medium">
                  {uniqueLearnersThisWeek} học viên
                </span>
                {toComplete.length > 0 && (
                  <>
                    {" "}·{" "}
                    <span className="text-[#b45309] font-medium">
                      {toComplete.length} buổi cần xác nhận
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Toolbar — week navigation only (coach cannot create sessions) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                  Hôm nay
                </button>
                <button
                  onClick={() => setWeekOffset((w) => w + 1)}
                  aria-label="Tuần sau"
                  className="w-10 h-10 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <Link
                href="/coach/training-packages"
                className="ml-1 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Package size={16} strokeWidth={2.5} />
                Quản lý gói tập
              </Link>
            </div>
          </motion.header>

          {/* ============ SUMMARY ============ */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SummaryCard
              icon={CalendarDays}
              label="Buổi tập tuần này"
              value={sessionsThisWeek}
              trendLabel="từ các gói tập"
              accent="indigo"
              spark={seedSpark(1, 16, 6)}
              delay={0.05}
              reduce={reduce ?? false}
            />
            <SummaryCard
              icon={Users}
              label="Học viên tuần này"
              value={uniqueLearnersThisWeek}
              trendLabel="đã đăng ký"
              accent="violet"
              spark={seedSpark(2, 12, 4)}
              delay={0.1}
              reduce={reduce ?? false}
            />
            <SummaryCard
              icon={CalendarClock}
              label="Cần xác nhận"
              value={toComplete.length}
              trend={toComplete.length > 0 ? "Chờ xử lý" : "Đã xong"}
              trendLabel="hoàn thành"
              accent="amber"
              spark={seedSpark(3, 6, 3)}
              delay={0.15}
              reduce={reduce ?? false}
            />
            <SummaryCard
              icon={Wallet}
              label="Doanh thu (hoàn thành)"
              value={formatCurrency(completedRevenueThisWeek)}
              trendLabel="buổi đã hoàn thành"
              accent="emerald"
              spark={seedSpark(4, 800, 200)}
              delay={0.2}
              reduce={reduce ?? false}
            />
          </section>

          {/* ============ NEEDS COMPLETION ============ */}
          {toComplete.length > 0 && (
            <NeedsCompletion sessions={toComplete} reduce={reduce ?? false} onRefetch={refetch} />
          )}

          {/* ============ EMPTY STATE ============ */}
          {!hasAnySession ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
              className="flex flex-col items-center gap-5 rounded-[20px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-[#7d6dff]/10">
                <CalendarDays size={28} className="text-primary/60" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-on-surface">
                  Chưa có học viên nào đăng ký lịch học
                </p>
                <p className="mt-1.5 max-w-sm mx-auto text-[14px] text-on-surface-variant">
                  Khi học viên mua gói tập của bạn, hệ thống sẽ tự động tạo các buổi học theo lịch cố định và hiển thị tại đây.
                </p>
              </div>
              <Link
                href="/coach/training-packages"
                className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] px-5 py-2.5 text-[13.5px] font-semibold text-on-primary shadow-[0_4px_14px_-4px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-4px_rgba(53,37,205,0.5)] hover:scale-[1.02] active:scale-[0.99] transition-all"
              >
                <Package size={15} />
                Quản lý gói tập
              </Link>
            </motion.div>
          ) : (
            /* ============ MAIN 2-COLUMN ============ */
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
                    <p className="text-[12px] text-on-surface-variant mt-0.5">{weekRangeLabel}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <LegendDot color="#4f46e5" label="1:1" />
                    <LegendDot color="#8b5cf6" label="Nhóm" />
                  </div>
                </div>

                {/* Desktop time-grid calendar */}
                <div className="hidden md:block">
                  {/* Day headers (sticky) */}
                  <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[var(--color-border-soft)] sticky top-0 bg-surface-container-lowest/95 backdrop-blur-sm z-10">
                    <div />
                    {weekDays.map((d, i) => {
                      const isToday = d.toDateString() === NOW.toDateString();
                      const count = dayGroupBuckets[i].reduce((n, g) => n + g.sessions.length, 0);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "px-2 py-3 flex flex-col items-center transition-colors",
                            isToday && "bg-gradient-to-b from-primary/[0.08] to-transparent",
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
                              {count} buổi
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
                          {/* Hour grid lines (read-only — no click-to-add) */}
                          {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                            <div
                              key={i}
                              style={{ height: HOUR_HEIGHT }}
                              className="relative border-b border-dashed border-[var(--color-border-soft)]/40"
                            />
                          ))}

                          {/* Session group chips — absolutely positioned within column */}
                          {dayGroupBuckets[dayIdx].map((g) => {
                            const top =
                              (g.start.getHours() - START_HOUR) * HOUR_HEIGHT +
                              (g.start.getMinutes() / 60) * HOUR_HEIGHT;
                            const height = Math.max(44, (g.durationMinutes / 60) * HOUR_HEIGHT) - 2;
                            return (
                              <div
                                key={g.key}
                                className="absolute left-1 right-1 z-10 hover:z-20"
                                style={{ top, height }}
                              >
                                <SessionGroupChip group={g} onClick={() => setDetailGroup(g)} />
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
                    const groups = dayGroupBuckets[i];
                    const isToday = d.toDateString() === NOW.toDateString();
                    const count = groups.reduce((n, g) => n + g.sessions.length, 0);
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
                            <span className="text-[13px] font-semibold">{WEEKDAYS[i]}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant">{count} buổi</span>
                        </div>
                        <div className="p-2 space-y-2">
                          {groups.length === 0 ? (
                            <p className="text-[12px] text-on-surface-variant text-center py-3">
                              Ngày trống
                            </p>
                          ) : (
                            groups.map((g) => (
                              <MobileGroupCard
                                key={g.key}
                                group={g}
                                onOpen={() => setDetailGroup(g)}
                              />
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
                <AICoachCard learnerCount={uniqueLearnersThisWeek} reduce={reduce ?? false} />
                <TodayAgenda sessions={todaySessions} reduce={reduce ?? false} />
                <UpcomingSessions sessions={upcomingNext} reduce={reduce ?? false} />
                <QuickActions reduce={reduce ?? false} />
              </aside>
            </div>
          )}
        </div>

        {detailGroup && (
          <GroupDetailModal
            group={detailGroup}
            onClose={() => setDetailGroup(null)}
            onRefetch={() => {
              setDetailGroup(null);
              refetch();
            }}
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
  icon: typeof CalendarDays;
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
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow"
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
        <p className="text-[22px] sm:text-[26px] leading-none font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>
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
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", a.trend)}>
                <TrendingUp size={11} />
                {trend}
              </span>
            )}
            {trendLabel && <span className="text-on-surface-variant">{trendLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Needs-completion banner — past sessions awaiting completion confirmation
// ============================================================================

function NeedsCompletion({
  sessions,
  reduce,
  onRefetch,
}: {
  sessions: Session[];
  reduce: boolean;
  onRefetch: () => void;
}) {
  const learnerById = useContext(LearnerLookupContext);
  const [busy, setBusy] = useState<string | null>(null);

  async function complete(id: string) {
    if (isMockMode() || busy) return;
    setBusy(id + "complete");
    try {
      await api.completeSession(id);
      showSuccess("Đã xác nhận hoàn thành buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: string) {
    if (isMockMode() || busy) return;
    if (!window.confirm("Đánh dấu buổi học này là đã hủy?")) return;
    setBusy(id + "cancel");
    try {
      await api.cancelSession(id);
      showSuccess("Đã hủy buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, delay: 0.05, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-[#f4d68a]/50 bg-gradient-to-br from-[#fffaeb] via-surface-container-lowest to-[#fff5d6]/30 p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_24px_-14px_rgba(245,158,11,0.25)]"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-[#f59e0b]/15 to-transparent blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#fb923c] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(245,158,11,0.45)]">
            <CalendarClock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">
              {sessions.length} buổi cần xác nhận hoàn thành
            </p>
            <p className="text-[12px] text-on-surface-variant">
              Xác nhận để ghi nhận doanh thu cho từng buổi đã dạy
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {sessions.slice(0, 5).map((s) => {
            const learner = learnerById.get(s.learnerId);
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 bg-surface-container-lowest rounded-[14px] p-3 border border-[var(--color-border-soft)] hover:border-[#f59e0b]/30 transition-colors"
              >
                <UserAvatar
                  avatarUrl={learner?.avatarUrl}
                  name={learner?.name ?? s.learnerId.slice(0, 2).toUpperCase()}
                  size="md"
                  className="w-10 h-10 text-[11px] shrink-0"
                />
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
                  aria-label="Hủy"
                  disabled={!!busy}
                  onClick={() => cancel(s.id)}
                  className="h-9 w-9 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-on-surface-variant hover:text-[#ba1a1a] transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {busy === s.id + "cancel" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />}
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => complete(s.id)}
                  className="h-9 px-3.5 rounded-lg bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-1 disabled:opacity-60 disabled:scale-100"
                >
                  {busy === s.id + "complete" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Hoàn thành
                </button>
              </li>
            );
          })}
        </ul>
        {sessions.length > 5 && (
          <p className="text-[12px] text-on-surface-variant mt-2 text-center">
            +{sessions.length - 5} buổi khác cần xác nhận
          </p>
        )}
      </div>
    </motion.section>
  );
}

// ============================================================================
// Session group chip — inside each calendar column
// ============================================================================

function groupAccent(g: SessionGroup) {
  // Cancelled-only group dims out; group classes use violet; 1:1 uses indigo.
  if (g.isGroup) return { bg: "bg-[#8b5cf6]/12 border-[#8b5cf6]/30 text-[#7c3aed]", bar: "bg-[#8b5cf6]" };
  return { bg: "bg-primary/10 border-primary/25 text-primary", bar: "bg-primary" };
}

function SessionGroupChip({ group, onClick }: { group: SessionGroup; onClick: () => void }) {
  const a = groupAccent(group);
  const time = group.start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const allCancelled = group.sessions.every((s) => s.status === "cancelled");
  const allCompleted = group.sessions.every((s) => s.status === "completed");

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "relative h-full w-full rounded-[7px] border cursor-pointer select-none overflow-hidden transition-all hover:shadow-[0_2px_8px_-2px_rgba(15,15,30,0.18)] active:scale-[0.99]",
        allCancelled && "opacity-55",
        a.bg,
      )}
    >
      <span className={cn("absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full z-[1]", a.bar)} />
      <div className="h-full pl-[9px] pr-1 py-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-[3px] shrink-0 min-w-0 overflow-hidden">
          <span className="text-[10.5px] font-bold tabular-nums leading-none whitespace-nowrap shrink-0">
            {time}
          </span>
          {group.isGroup && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold leading-none">
              <Users size={9} />
              {group.sessions.length}
            </span>
          )}
          {allCompleted && <CheckCircle2 size={10} className="shrink-0 text-[#1f7a4d]" />}
        </div>
      </div>
    </div>
  );
}

function MobileGroupCard({ group, onOpen }: { group: SessionGroup; onOpen: () => void }) {
  const a = groupAccent(group);
  const time = group.start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const online = isOnlineSession(group.sessions[0]);
  const label = group.isGroup
    ? `${group.sessions.length} học viên`
    : group.sessions[0].title;
  return (
    <div
      onClick={onOpen}
      className={cn(
        "relative rounded-[12px] border p-3 bg-surface-container-lowest cursor-pointer hover:shadow-[0_4px_12px_-4px_rgba(15,15,30,0.12)] transition-all",
        a.bg,
      )}
    >
      <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full", a.bar)} />
      <div className="pl-2 flex items-center gap-3">
        <div className="text-center w-12 shrink-0">
          <p className="text-[12px] font-bold tabular-nums leading-none">{time}</p>
          <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
            {group.durationMinutes}m
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold truncate">{label}</p>
          <p className="text-[11px] text-on-surface-variant truncate inline-flex items-center gap-1">
            {online ? <Video size={10} /> : <MapPin size={10} />}
            {online ? "Trực tuyến" : group.sessions[0].location ?? "Trực tiếp"}
          </p>
        </div>
        <ChevronRight size={16} className="text-on-surface-variant shrink-0" />
      </div>
    </div>
  );
}

// ============================================================================
// Group detail modal — shows learner list + per-learner actions
// ============================================================================

function GroupDetailModal({
  group,
  onClose,
  onRefetch,
}: {
  group: SessionGroup;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const first = group.sessions[0];
  const online = isOnlineSession(first);
  const meetingUrl = first.meetingUrl;

  const formatDt = (d: Date) =>
    d.toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  async function act(sessionId: string, action: "complete" | "cancel") {
    if (isMockMode()) { onRefetch(); return; }
    if (busy) return;
    if (action === "cancel" && !window.confirm("Đánh dấu buổi học này là đã hủy?")) return;
    if (action === "complete" && !window.confirm("Xác nhận buổi học đã diễn ra? Doanh thu sẽ được ghi nhận.")) return;
    setBusy(sessionId + action);
    try {
      if (action === "complete") await api.completeSession(sessionId);
      else await api.cancelSession(sessionId);
      showSuccess(action === "complete" ? "Đã hoàn thành buổi học." : "Đã hủy buổi học.");
      onRefetch();
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  }

  function join() {
    const url = meetingUrl ?? (online ? first.location : undefined);
    if (url && url.startsWith("http")) window.open(url, "_blank", "noopener,noreferrer");
    else showInfo("Không có link tham gia cho buổi này.");
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
        transition={{ duration: 0.25, ease: EASE }}
        className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-[24px] sm:rounded-[24px] border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden max-h-[90dvh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-11 h-11 rounded-[12px] flex items-center justify-center text-white shrink-0",
                group.isGroup
                  ? "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]"
                  : "bg-gradient-to-br from-primary to-[#7d6dff]",
              )}
            >
              {group.isGroup ? <Users size={18} /> : <CalendarDays size={18} />}
            </div>
            <div className="min-w-0">
              <p className="text-[15.5px] font-semibold tracking-tight leading-snug truncate">
                {first.title}
              </p>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                {group.isGroup ? `Buổi nhóm · ${group.sessions.length} học viên` : "Buổi 1:1"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {/* Time */}
          <div className="flex items-start gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-primary/15 to-[#7d6dff]/10 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-on-surface">{formatDt(group.start)}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                đến {group.end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {group.durationMinutes} phút
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-low/60">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-primary/15 to-[#7d6dff]/10 flex items-center justify-center shrink-0">
              {online ? <Video size={14} className="text-primary" /> : <MapPin size={14} className="text-primary" />}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-on-surface">
                {online ? "Trực tuyến (Online)" : first.location ?? "Chưa đặt địa điểm"}
              </p>
              {meetingUrl && (
                <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline break-all">
                  {meetingUrl}
                </a>
              )}
            </div>
          </div>

          {/* Learner roster */}
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant/70 mb-1.5 px-1">
              Học viên ({group.sessions.length})
            </p>
            <div className="space-y-2">
              {group.sessions.map((s) => (
                <LearnerSessionRow key={s.id} session={s} busy={busy} onAction={act} onJoin={join} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border-soft)] shrink-0">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LearnerSessionRow({
  session,
  busy,
  onAction,
  onJoin,
}: {
  session: Session;
  busy: string | null;
  onAction: (id: string, action: "complete" | "cancel") => void;
  onJoin: () => void;
}) {
  const learner = useLearner(session.learnerId);
  const sCfg = sessionStatus(session.status);
  const online = isOnlineSession(session);
  const canAct = session.status === "scheduled" || session.status === "in_progress";

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <UserAvatar
        avatarUrl={learner?.avatarUrl}
        name={learner?.name ?? session.learnerId.slice(0, 2).toUpperCase()}
        size="sm"
        className="w-9 h-9 text-[11px] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold truncate">
          {learner?.name ?? `Học viên ${session.learnerId.slice(0, 6)}`}
        </p>
        <span
          className={cn(
            "inline-flex items-center border px-1.5 py-0.5 rounded-full text-[10px] font-semibold mt-0.5",
            sCfg.chip,
          )}
        >
          {sCfg.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {canAct && online && (
          <button
            onClick={onJoin}
            aria-label="Tham gia"
            className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 flex items-center justify-center transition-colors"
          >
            <Video size={14} />
          </button>
        )}
        {canAct && (
          <>
            <button
              onClick={() => onAction(session.id, "cancel")}
              disabled={!!busy}
              aria-label="Hủy"
              className="h-8 w-8 rounded-lg border border-[var(--color-border-soft)] text-on-surface-variant hover:text-[#ba1a1a] hover:bg-surface-container-low flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {busy === session.id + "cancel" ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={14} />}
            </button>
            <button
              onClick={() => onAction(session.id, "complete")}
              disabled={!!busy}
              className="h-8 px-2.5 rounded-lg bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[11.5px] font-semibold inline-flex items-center gap-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 disabled:scale-100"
            >
              {busy === session.id + "complete" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Xong
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function NowIndicator() {
  const now = new Date(NOW);
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour < START_HOUR || hour >= END_HOUR) return null;
  const top = (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
  return (
    <div style={{ top }} className="absolute left-0 right-0 z-20 pointer-events-none">
      <div className="relative h-px bg-gradient-to-r from-[#ef4444] via-[#f87171] to-transparent">
        <span className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-variant">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
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

function AICoachCard({ learnerCount, reduce }: { learnerCount: number; reduce: boolean }) {
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
              Hãy nhắc nhở <span className="text-primary">{learnerCount} học viên</span> về buổi học sắp tới.
            </p>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
              Một tin nhắn nhắc lịch giúp giảm tỉ lệ vắng mặt tới{" "}
              <span className="text-on-surface font-medium">30%</span>.
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
      </div>
    </motion.div>
  );
}

// ============================================================================
// Today Agenda
// ============================================================================

function TodayAgenda({ sessions, reduce }: { sessions: Session[]; reduce: boolean }) {
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
          <p className="text-[11.5px] text-on-surface-variant mt-0.5">{sessions.length} buổi</p>
        </div>
        <span className="text-[11px] text-on-surface-variant">
          {new Date(NOW).toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 ? (
          <p className="text-center text-[12px] text-on-surface-variant py-6">
            Hôm nay chưa có buổi nào.
          </p>
        ) : (
          sessions.map((s, i) => <TodayRow key={s.id} session={s} delay={i * 0.05} reduce={reduce} />)
        )}
      </div>
    </motion.div>
  );
}

function TodayRow({ session, delay, reduce }: { session: Session; delay: number; reduce: boolean }) {
  const learner = useLearner(session.learnerId);
  const sCfg = sessionStatus(session.status);
  const time = new Date(session.start).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: EASE }}
      className="flex items-center gap-3 p-2.5 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="text-center w-14 shrink-0">
        <p className="text-[11.5px] font-bold tabular-nums leading-none">{time}</p>
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          {session.durationMinutes}m
        </p>
      </div>
      <UserAvatar
        avatarUrl={learner?.avatarUrl}
        name={learner?.name ?? "?"}
        size="sm"
        className="w-8 h-8 text-[11px] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold truncate">{learner?.name ?? "Học viên"}</p>
        <p className="text-[11px] text-on-surface-variant truncate">{session.title}</p>
      </div>
      <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", sCfg.chip)}>
        {sCfg.label}
      </span>
    </motion.div>
  );
}

// ============================================================================
// Upcoming sessions (sidebar)
// ============================================================================

function UpcomingSessions({ sessions, reduce }: { sessions: Session[]; reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.28, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <h3 className="text-[16px] font-semibold tracking-tight">Sắp tới</h3>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {sessions.length === 0 ? (
          <p className="text-center text-[12px] text-on-surface-variant py-6">
            Chưa có lịch nào sắp tới.
          </p>
        ) : (
          sessions.map((s, i) => <UpcomingRow key={s.id} session={s} delay={i * 0.05} reduce={reduce} />)
        )}
      </div>
    </motion.div>
  );
}

function UpcomingRow({ session, delay, reduce }: { session: Session; delay: number; reduce: boolean }) {
  const learner = useLearner(session.learnerId);
  const date = new Date(session.start);
  const isToday = date.toDateString() === NOW.toDateString();
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: EASE }}
      className="flex items-center gap-3 p-3 rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.03)]"
    >
      <div className="text-center w-11 shrink-0">
        <p className="text-[9.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {date.toLocaleDateString("vi-VN", { month: "short" })}
        </p>
        <p className={cn("text-[18px] font-bold leading-none tabular-nums mt-0.5", isToday ? "text-primary" : "text-on-surface")}>
          {date.getDate()}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          {date.toLocaleDateString("vi-VN", { weekday: "short" })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{session.title}</p>
        <p className="text-[11.5px] text-on-surface-variant truncate mt-0.5">
          {learner?.name ?? "Học viên"} · {time} · {session.durationMinutes}m
        </p>
        {session.location && (
          <p className="text-[10.5px] text-on-surface-variant/70 inline-flex items-center gap-1 mt-0.5">
            {session.location.toLowerCase() === "online" ? <Video size={10} /> : <MapPin size={10} />}
            {session.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

const QUICK_ACTIONS = [
  { icon: Users, label: "Học viên", desc: "Danh sách & tiến độ", href: "/coach/learners", accent: "indigo" as const },
  { icon: Package, label: "Gói tập", desc: "Quản lý lịch cố định", href: "/coach/training-packages", accent: "violet" as const },
  { icon: MessageCircle, label: "Tin nhắn", desc: "Hàng đợi phản hồi", href: "/coach/messages", accent: "emerald" as const },
  { icon: Wallet, label: "Thu nhập", desc: "Ví & rút tiền", href: "/coach/earnings", accent: "amber" as const },
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
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">Thao tác nhanh</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_ACTIONS.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.38 + i * 0.04, ease: EASE }}
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
                <p className="text-[12.5px] font-semibold leading-tight">{q.label}</p>
                <p className="text-[10.5px] text-on-surface-variant mt-0.5">{q.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
