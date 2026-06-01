"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Video,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, initials, localDateKey } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, Session } from "@/types";

// Use real current date.
const NOW = new Date();

const EASE = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type TabId = "all" | "requested" | "upcoming" | "completed" | "cancelled";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",       label: "Tất cả" },
  { id: "requested", label: "Chờ xác nhận" },
  { id: "upcoming",  label: "Sắp tới" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã huỷ" },
];

// Status display map
const STATUS_DISPLAY: Record<string, { label: string; chip: string }> = {
  pending_confirmation: { label: "Chờ xác nhận", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  scheduled:           { label: "Đã xác nhận",   chip: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress:         { label: "Đang diễn ra",   chip: "bg-primary/10 text-primary border-primary/20" },
  completed:           { label: "Hoàn thành",     chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:           { label: "Đã huỷ",         chip: "bg-red-50 text-red-600 border-red-200" },
};

function statusDisplay(status: string) {
  return STATUS_DISPLAY[status?.toLowerCase()] ?? {
    label: status ?? "Không rõ",
    chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
  };
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

// ---- Tab filter helper ----------------------------------------------------

function filterSessions(sessions: Session[], tab: TabId): Session[] {
  const now = NOW.getTime();
  switch (tab) {
    case "requested":
      return sessions.filter((s) => s.status === "pending_confirmation");
    case "upcoming":
      return sessions.filter(
        (s) =>
          (s.status === "scheduled" || s.status === "in_progress") &&
          new Date(s.start).getTime() >= now,
      );
    case "completed":
      return sessions.filter((s) => s.status === "completed");
    case "cancelled":
      return sessions.filter((s) => s.status === "cancelled");
    default:
      return sessions;
  }
}

// ---- Cancel session -------------------------------------------------------

function useCancelSession(onSuccess: () => void) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancel(sessionId: string) {
    if (!window.confirm("Bạn chắc chắn muốn huỷ buổi tập này?")) return;
    setCancelling(sessionId);
    setCancelError(null);
    try {
      await api.cancelSession(sessionId);
      onSuccess();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Huỷ buổi thất bại.");
    } finally {
      setCancelling(null);
    }
  }

  return { cancel, cancelling, cancelError };
}

// ---- Main page ------------------------------------------------------------

export default function LearnerSchedulePage() {
  const {
    data: sessionsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyTrainingSessions(), []);
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);

  // Coach lookup for display names
  const { data: coachesData } = useApiResource(() => api.fetchCoaches(), []);
  const coachById = useMemo(
    () => new Map((coachesData ?? []).map((c) => [c.id, c])),
    [coachesData],
  );

  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const { cancel, cancelling } = useCancelSession(refetch);

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

  const weekRangeLabel = `${weekStart.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  })} - ${weekDays[6].toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}`;

  // Stats
  const completed = sessions.filter((s) => s.status === "completed").length;
  const upcoming = sessions.filter(
    (s) =>
      (s.status === "scheduled" || s.status === "pending_confirmation") &&
      new Date(s.start) >= NOW,
  ).length;
  const requested = sessions.filter((s) => s.status === "pending_confirmation").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;
  const totalTracked = completed + cancelled + upcoming;
  const consistency =
    totalTracked > 0 ? Math.round((completed / Math.max(completed + cancelled, 1)) * 100) : 0;

  const filteredSessions = useMemo(
    () => filterSessions(sessions, activeTab),
    [sessions, activeTab],
  );

  // Week calendar buckets
  const dayBuckets = useMemo(
    () =>
      weekDays.map((d) => {
        const key = localDateKey(d);
        return filteredSessions
          .filter((s) => localDateKey(new Date(s.start)) === key)
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      }),
    [weekDays, filteredSessions],
  );

  if (loading) {
    return (
      <AppShell role="learner" title="Lịch tập">
        <LoadingState label="Đang tải lịch tập…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Lịch tập">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="learner" title="Lịch tập">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-on-surface">
              Lịch tập của tôi
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1">
              {sessions.length} buổi tập · {weekRangeLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Tuần trước"
              className="w-9 h-9 rounded-[10px] border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="h-9 px-3.5 rounded-[10px] border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Tuần sau"
              className="w-9 h-9 rounded-[10px] border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <ChevronRight size={15} />
            </button>
            <Link
              href="/learner/bookings"
              className="ml-1 inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CalendarPlus size={14} strokeWidth={2.5} />
              Đặt buổi tập
            </Link>
          </div>
        </motion.header>

        {/* ============ STATS ============ */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: CalendarCheck, label: "Sắp tới", value: upcoming, accent: "indigo" },
            { icon: CheckCircle2,  label: "Hoàn thành", value: completed, accent: "emerald" },
            { icon: XCircle,       label: "Đã huỷ",  value: cancelled,  accent: "rose" },
            { icon: TrendingUp,    label: "Đều đặn", value: `${consistency}%`, accent: "violet" },
          ].map(({ icon: Icon, label, value, accent }, i) => {
            const accents: Record<string, { iconBg: string; decor: string }> = {
              indigo:  { iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",        decor: "from-primary/15 to-primary/0" },
              emerald: { iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",      decor: "from-[#34d399]/15 to-transparent" },
              rose:    { iconBg: "bg-gradient-to-br from-[#f43f5e] to-[#fb7185]",      decor: "from-[#fb7185]/15 to-transparent" },
              violet:  { iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",      decor: "from-[#c084fc]/15 to-transparent" },
            };
            const a = accents[accent];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.45, delay: i * 0.05, ease: EASE }}
                className="group relative overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
              >
                <div className={cn("absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br blur-xl opacity-50", a.decor)} />
                <div className="relative flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-[12px] flex items-center justify-center text-white shrink-0", a.iconBg)}>
                    <Icon size={17} strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-[24px] font-bold tracking-tight tabular-nums leading-none">{value}</p>
                    <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant mt-1">{label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* ============ MAIN LAYOUT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* ============ LEFT: SESSIONS LIST ============ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.08, ease: EASE }}
            className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            {/* Tabs */}
            <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border-soft)] flex items-center gap-1 overflow-x-auto">
              {TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? sessions.length
                    : filterSessions(sessions, tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative shrink-0 px-3.5 h-8 text-[12.5px] font-medium rounded-[8px] transition-colors whitespace-nowrap",
                      activeTab === tab.id
                        ? "text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.span
                        layoutId="tabPill"
                        className="absolute inset-0 bg-surface-container-low rounded-[8px]"
                        transition={{ type: "spring", duration: reduce ? 0 : 0.35, bounce: 0.2 }}
                      />
                    )}
                    <span className="relative">
                      {tab.label}
                      {count > 0 && (
                        <span className={cn(
                          "ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                          activeTab === tab.id
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant",
                        )}>
                          {count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sessions list */}
            <div className="p-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {filteredSessions.length === 0 ? (
                    <EmptyTabState tab={activeTab} />
                  ) : (
                    <div className="space-y-3">
                      {filteredSessions.map((s, i) => (
                        <SessionCard
                          key={s.id}
                          session={s}
                          coach={coachById.get(s.coachId)}
                          delay={i * 0.04}
                          reduce={reduce ?? false}
                          onCancel={cancel}
                          cancelling={cancelling === s.id}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ============ RIGHT: SIDEBAR ============ */}
          <aside className="space-y-4">
            <AIHintCard requested={requested} reduce={reduce ?? false} />
            <WeekCalendar weekDays={weekDays} dayBuckets={dayBuckets} coachById={coachById} reduce={reduce ?? false} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ---- Empty state per tab --------------------------------------------------

function EmptyTabState({ tab }: { tab: TabId }) {
  const messages: Record<TabId, { title: string; body: string }> = {
    all:       { title: "Chưa có buổi tập nào", body: "Mua gói tập và đặt lịch để bắt đầu." },
    requested: { title: "Không có buổi chờ xác nhận", body: "Tất cả các buổi bạn đặt đã được xác nhận hoặc chưa đặt buổi nào." },
    upcoming:  { title: "Không có buổi sắp tới", body: "Đặt lịch mới từ gói tập đang hoạt động." },
    completed: { title: "Chưa hoàn thành buổi nào", body: "Các buổi đã hoàn thành sẽ xuất hiện ở đây." },
    cancelled: { title: "Không có buổi đã huỷ", body: "Tốt lắm!" },
  };
  const m = messages[tab];
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
        <CalendarCheck size={16} className="text-on-surface-variant" />
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-on-surface">{m.title}</p>
        <p className="text-[12.5px] text-on-surface-variant mt-0.5 max-w-[220px]">{m.body}</p>
      </div>
      {(tab === "all" || tab === "upcoming") && (
        <Link
          href="/learner/bookings"
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[9px] bg-primary/10 text-primary text-[12.5px] font-semibold hover:bg-primary/15 transition-colors"
        >
          Đặt buổi tập
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

// ---- Session card ---------------------------------------------------------

function SessionCard({
  session,
  coach,
  delay,
  reduce,
  onCancel,
  cancelling,
}: {
  session: Session;
  coach?: Coach;
  delay: number;
  reduce: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const { label, chip } = statusDisplay(session.status);
  const start = new Date(session.start);
  const canCancel = session.status === "pending_confirmation" || session.status === "scheduled";
  const isOnline = session.meetingUrl != null || session.location?.toLowerCase() === "online";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : delay, ease: EASE }}
      className="group rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 hover:border-primary/20 hover:shadow-[0_4px_16px_-6px_rgba(15,15,30,0.12)] transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Coach avatar */}
        <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden text-[11px] flex items-center justify-center text-primary font-semibold shrink-0">
          {coach?.avatarUrl ? (
            <img src={coach.avatarUrl} alt={coach.name} className="w-full h-full object-cover" />
          ) : (
            initials(coach?.name ?? "HLV")
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[13.5px] font-semibold text-on-surface leading-tight">
                {session.title}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                với {coach?.name ?? "Huấn luyện viên"}
              </p>
            </div>
            <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0", chip)}>
              {label}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
            <Clock size={12} className="shrink-0" />
            <span className="font-medium text-on-surface">
              {start.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <span>
              {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="tabular-nums">{session.durationMinutes} phút</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
            {isOnline ? (
              <>
                <Video size={12} className="text-primary shrink-0" />
                <span>Trực tuyến</span>
                {session.meetingUrl && (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate max-w-[180px]"
                  >
                    Tham gia
                  </a>
                )}
              </>
            ) : session.location ? (
              <>
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{session.location}</span>
              </>
            ) : null}
          </div>

          {/* Notes */}
          {session.learnerNote && (
            <p className="flex items-start gap-1.5 text-[12px] text-on-surface-variant">
              <MessageSquare size={12} className="mt-0.5 shrink-0" />
              <span className="italic truncate">{session.learnerNote}</span>
            </p>
          )}
          {session.coachNote && (
            <p className="flex items-start gap-1.5 text-[12px] text-primary/80">
              <Sparkles size={12} className="mt-0.5 shrink-0" />
              <span className="italic truncate">{session.coachNote}</span>
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-soft)] flex justify-end">
          <button
            onClick={() => onCancel(session.id)}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-red-200 bg-red-50 text-red-700 text-[12px] font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            {cancelling ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            {cancelling ? "Đang huỷ…" : "Huỷ buổi tập"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ---- AI hint card ---------------------------------------------------------

function AIHintCard({ requested, reduce }: { requested: number; reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.14, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary">Sportico AI</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Hoạt động
          </span>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-40" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-on-surface leading-snug">
              {requested > 0
                ? `${requested} buổi chờ HLV xác nhận.`
                : "Lịch tập tuần này trống."}
            </p>
            <p className="text-[12.5px] text-on-surface-variant mt-1 leading-relaxed">
              {requested > 0
                ? "HLV sẽ xác nhận sớm. Bạn sẽ nhận thông báo khi có cập nhật."
                : "Đặt buổi mới từ gói tập đang hoạt động để duy trì đà tập luyện."}
            </p>
          </div>
        </div>

        <Link
          href="/learner/bookings"
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-[12px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Activity size={14} />
          Đặt buổi tập mới
        </Link>
      </div>
    </motion.div>
  );
}

// ---- Mini week calendar sidebar -------------------------------------------

function WeekCalendar({
  weekDays,
  dayBuckets,
  coachById,
  reduce,
}: {
  weekDays: Date[];
  dayBuckets: Session[][];
  coachById: Map<string, Coach>;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.22, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-3 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[15px] font-semibold tracking-tight">Tuần này</h3>
      </div>
      <div className="px-3 py-3 space-y-1">
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === NOW.toDateString();
          const sessions = dayBuckets[i] ?? [];
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-[10px] transition-colors",
                isToday && "bg-primary/[0.05]",
              )}
            >
              <div className="w-8 text-center shrink-0">
                <p className={cn("text-[10px] uppercase tracking-wide font-semibold", isToday ? "text-primary" : "text-on-surface-variant")}>
                  {WEEKDAYS[i]}
                </p>
                <p className={cn(
                  "text-[15px] font-bold leading-none mt-0.5",
                  isToday ? "text-primary" : "text-on-surface",
                )}>
                  {d.getDate()}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                {sessions.length === 0 ? (
                  <p className="text-[11.5px] text-on-surface-variant/60">Không có lịch</p>
                ) : (
                  sessions.slice(0, 2).map((s) => {
                    const coach = coachById.get(s.coachId);
                    const { chip } = statusDisplay(s.status);
                    return (
                      <div key={s.id} className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0 border", chip)} />
                        <span className="text-[11.5px] truncate text-on-surface">
                          {new Date(s.start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          {" "}
                          {coach?.name?.split(" ").pop() ?? "HLV"}
                        </span>
                      </div>
                    );
                  })
                )}
                {sessions.length > 2 && (
                  <p className="text-[10.5px] text-on-surface-variant">+{sessions.length - 2} buổi</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Silence unused imports
void RefreshCw;
