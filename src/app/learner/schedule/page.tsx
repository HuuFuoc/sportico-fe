"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, initials, localDateKey } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showApiError } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, Session } from "@/types";

const NOW = new Date();
const EASE = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type TabId = "all" | "requested" | "upcoming" | "completed" | "cancelled";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",       label: "Tất cả" },
  { id: "requested", label: "Chờ xác nhận" },
  { id: "upcoming",  label: "Sắp tới" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã huỷ" },
];

const STATUS_DISPLAY: Record<string, { label: string; chip: string; dotColor: string }> = {
  pending_confirmation: {
    label: "Chờ xác nhận",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400",
  },
  scheduled: {
    label: "Đã xác nhận",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
  },
  in_progress: {
    label: "Đang diễn ra",
    chip: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary",
  },
  completed: {
    label: "Hoàn thành",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  cancelled: {
    label: "Đã huỷ",
    chip: "bg-red-50 text-red-600 border-red-200",
    dotColor: "bg-red-400",
  },
};

function statusDisplay(status: string) {
  return (
    STATUS_DISPLAY[status?.toLowerCase()] ?? {
      label: status ?? "Không rõ",
      chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
      dotColor: "bg-on-surface-variant",
    }
  );
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

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

function getSessionTitle(session: Session, coach?: Coach): string {
  if (coach?.sport && coach?.name) return `${coach.sport} với ${coach.name}`;
  if (coach?.name) return `Buổi tập với ${coach.name}`;
  if (session.title && session.title !== "Buổi tập") return session.title;
  return "Buổi tập";
}

function formatGroupDate(date: Date): string {
  const today = localDateKey(new Date());
  const tomorrow = localDateKey(new Date(Date.now() + 86_400_000));
  const key = localDateKey(date);
  if (key === today) return "Hôm nay";
  if (key === tomorrow) return "Ngày mai";
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function groupSessionsByDate(
  sessions: Session[],
): { dateKey: string; date: Date; items: Session[] }[] {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = localDateKey(new Date(s.start));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      dateKey: key,
      date: new Date(items[0].start),
      items: items.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    }));
}

// ---- Cancel hook ------------------------------------------------------------

function useCancelSession(onSuccess: () => void) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancel(sessionId: string) {
    if (!window.confirm("Bạn chắc chắn muốn huỷ buổi tập này?")) return;
    setCancelling(sessionId);
    try {
      await api.cancelSession(sessionId);
      showSuccess("Đã hủy buổi tập thành công.");
      onSuccess();
    } catch (err) {
      showApiError(err);
    } finally {
      setCancelling(null);
    }
  }

  return { cancel, cancelling };
}

// ---- Detail Modal -----------------------------------------------------------

type DetailRowIconType = React.ComponentType<{ size?: number; className?: string }>;

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: DetailRowIconType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-[8px] bg-surface-container-low flex items-center justify-center shrink-0">
        <Icon size={14} className="text-on-surface-variant" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant/60 mb-0.5">
          {label}
        </p>
        <div className="text-[13px]">{children}</div>
      </div>
    </div>
  );
}

function SessionDetailModal({
  session,
  coach,
  onClose,
  onCancel,
  cancelling,
}: {
  session: Session;
  coach?: Coach;
  onClose: () => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const { label, chip } = statusDisplay(session.status);
  const start = new Date(session.start);
  const isOnline =
    session.meetingUrl != null || session.location?.toLowerCase() === "online";
  const canCancel =
    session.status === "pending_confirmation" || session.status === "scheduled";
  const title = getSessionTitle(session, coach);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="w-full max-w-md rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_20px_60px_-10px_rgba(15,15,30,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
              {coach?.avatarUrl ? (
                <img
                  src={coach.avatarUrl}
                  alt={coach.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(coach?.name ?? "HLV")
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-on-surface leading-tight truncate">
                {title}
              </p>
              <span
                className={cn(
                  "inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1",
                  chip,
                )}
              >
                {label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5">
          <DetailRow icon={Clock} label="Thời gian">
            <p className="font-semibold text-on-surface">
              {start.toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-on-surface-variant text-[12.5px]">
              {formatTimeRange(start, session.durationMinutes)} ·{" "}
              {session.durationMinutes} phút
            </p>
          </DetailRow>

          {(isOnline || session.location) && (
            <DetailRow
              icon={isOnline ? Video : MapPin}
              label="Địa điểm"
            >
              {isOnline ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">Trực tuyến</span>
                  {session.meetingUrl && (
                    <a
                      href={session.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-primary hover:underline"
                    >
                      Tham gia →
                    </a>
                  )}
                </div>
              ) : (
                <p className="font-medium text-on-surface">{session.location}</p>
              )}
            </DetailRow>
          )}

          {session.learnerNote && (
            <DetailRow icon={MessageSquare} label="Ghi chú của bạn">
              <p className="text-on-surface italic">{session.learnerNote}</p>
            </DetailRow>
          )}

          {session.coachNote && (
            <DetailRow icon={Sparkles} label="Ghi chú của HLV">
              <p className="text-primary/80 italic">{session.coachNote}</p>
            </DetailRow>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-[var(--color-border-soft)]">
          {session.status === "completed" && (
            <Link
              href={`/learner/coaches/${session.coachId}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[9px] border border-primary/20 bg-primary/5 text-primary text-[12.5px] font-semibold hover:bg-primary/10 transition-colors"
            >
              <Star size={13} />
              Đánh giá HLV
            </Link>
          )}
          {(session.status === "completed" || session.status === "cancelled") && (
            <Link
              href="/learner/bookings"
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface text-[12.5px] font-medium hover:bg-surface-container-low transition-colors"
            >
              <CalendarPlus size={13} />
              Đặt lại
            </Link>
          )}
          {canCancel && (
            <button
              onClick={() => {
                onCancel(session.id);
                onClose();
              }}
              disabled={cancelling}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[9px] border border-red-200 bg-red-50 text-red-700 text-[12.5px] font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
            >
              {cancelling ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              Huỷ buổi tập
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[12.5px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Session Card -----------------------------------------------------------

function SessionCard({
  session,
  coach,
  delay,
  reduce,
  onCancel,
  cancelling,
  onViewDetail,
}: {
  session: Session;
  coach?: Coach;
  delay: number;
  reduce: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
  onViewDetail: (s: Session) => void;
}) {
  const { label, chip } = statusDisplay(session.status);
  const start = new Date(session.start);
  const canCancel =
    session.status === "pending_confirmation" || session.status === "scheduled";
  const isOnline =
    session.meetingUrl != null || session.location?.toLowerCase() === "online";
  const title = getSessionTitle(session, coach);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : delay, ease: EASE }}
      className="group flex items-start gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5 hover:border-primary/20 hover:bg-surface-container-low/30 hover:shadow-[0_2px_12px_-4px_rgba(15,15,30,0.1)] transition-all cursor-pointer"
      onClick={() => onViewDetail(session)}
    >
      {/* Left: time column */}
      <div className="w-14 shrink-0 text-center pt-0.5">
        <p className="text-[13px] font-bold text-on-surface tabular-nums">
          {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-[10.5px] text-on-surface-variant tabular-nums">
          {session.durationMinutes}ph
        </p>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-1 shrink-0",
            statusDisplay(session.status).dotColor,
          )}
        />
        <div className="w-px flex-1 bg-[var(--color-border-soft)] mt-1 mb-1 min-h-[20px]" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-on-surface leading-tight truncate">
              {title}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
              chip,
            )}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* Coach avatar + name */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center text-[8px] font-semibold text-primary shrink-0">
              {coach?.avatarUrl ? (
                <img
                  src={coach.avatarUrl}
                  alt={coach.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(coach?.name ?? "HLV")
              )}
            </div>
            <span className="text-[12px] text-on-surface-variant truncate max-w-[120px]">
              {coach?.name ?? "Huấn luyện viên"}
            </span>
          </div>

          {/* Location */}
          {isOnline ? (
            <div className="flex items-center gap-1 text-[12px] text-primary">
              <Video size={11} />
              <span>Trực tuyến</span>
            </div>
          ) : session.location ? (
            <div className="flex items-center gap-1 text-[12px] text-on-surface-variant">
              <MapPin size={11} />
              <span className="truncate max-w-[140px]">{session.location}</span>
            </div>
          ) : null}
        </div>

        {/* Coach note inline */}
        {session.coachNote && (
          <p className="mt-1.5 flex items-start gap-1 text-[11.5px] text-primary/70 italic">
            <Sparkles size={11} className="mt-0.5 shrink-0" />
            <span className="truncate">{session.coachNote}</span>
          </p>
        )}
      </div>

      {/* Quick cancel (stop propagation so it doesn't open modal) */}
      {canCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel(session.id);
          }}
          disabled={cancelling}
          title="Huỷ buổi tập"
          className="ml-1 w-7 h-7 rounded-[6px] border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-60 flex items-center justify-center transition-colors shrink-0 mt-0.5"
        >
          {cancelling ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <XCircle size={12} />
          )}
        </button>
      )}
    </motion.div>
  );
}

// ---- Grouped sessions list --------------------------------------------------

function GroupedSessionList({
  groups,
  coachById,
  reduce,
  onCancel,
  cancelling,
  onViewDetail,
}: {
  groups: { dateKey: string; date: Date; items: Session[] }[];
  coachById: Map<string, Coach>;
  reduce: boolean;
  onCancel: (id: string) => void;
  cancelling: string | null;
  onViewDetail: (s: Session) => void;
}) {
  let globalIndex = 0;
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* Day header */}
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <p className="text-[12px] font-semibold text-on-surface-variant capitalize">
              {formatGroupDate(group.date)}
            </p>
            <div className="flex-1 h-px bg-[var(--color-border-soft)]" />
            <span className="text-[11px] text-on-surface-variant/60 tabular-nums">
              {group.items.length} buổi
            </span>
          </div>
          <div className="space-y-2">
            {group.items.map((s) => {
              const idx = globalIndex++;
              return (
                <SessionCard
                  key={s.id}
                  session={s}
                  coach={coachById.get(s.coachId)}
                  delay={idx * 0.035}
                  reduce={reduce}
                  onCancel={onCancel}
                  cancelling={cancelling === s.id}
                  onViewDetail={onViewDetail}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Empty state per tab ----------------------------------------------------

function EmptyTabState({ tab }: { tab: TabId }) {
  const messages: Record<TabId, { title: string; body: string; showCta: boolean }> = {
    all: {
      title: "Chưa có buổi tập nào",
      body: "Mua gói tập và đặt lịch để bắt đầu hành trình của bạn.",
      showCta: true,
    },
    requested: {
      title: "Không có buổi chờ xác nhận",
      body: "Tất cả các buổi bạn đặt đã được xác nhận.",
      showCta: false,
    },
    upcoming: {
      title: "Không có buổi tập sắp tới",
      body: "Đặt lịch mới từ gói tập đang hoạt động.",
      showCta: true,
    },
    completed: {
      title: "Chưa có buổi tập hoàn thành",
      body: "Các buổi đã hoàn thành sẽ xuất hiện ở đây.",
      showCta: false,
    },
    cancelled: {
      title: "Không có buổi tập đã huỷ",
      body: "Tốt lắm!",
      showCta: false,
    },
  };
  const m = messages[tab];
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
        <CalendarCheck size={16} className="text-on-surface-variant" />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-on-surface">{m.title}</p>
        <p className="text-[12.5px] text-on-surface-variant mt-0.5 max-w-[220px]">
          {m.body}
        </p>
      </div>
      {m.showCta && (
        <Link
          href="/learner/bookings"
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[9px] bg-primary/10 text-primary text-[12.5px] font-semibold hover:bg-primary/15 transition-colors"
        >
          <CalendarPlus size={13} />
          Đặt buổi tập
        </Link>
      )}
    </div>
  );
}

// ---- AI Insight Card --------------------------------------------------------

function AIInsightCard({
  sessions,
  nextUpcoming,
  requested,
  coachById,
  reduce,
}: {
  sessions: Session[];
  nextUpcoming: Session | null;
  requested: number;
  coachById: Map<string, Coach>;
  reduce: boolean;
}) {
  const completed = sessions.filter((s) => s.status === "completed").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;
  const nonCancelled = completed + sessions.filter(
    (s) => s.status === "scheduled" || s.status === "in_progress" || s.status === "pending_confirmation",
  ).length;
  const completionRate =
    nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0;

  let title: string;
  let body: string;
  let ctaLabel: string;
  let ctaHref: string;

  if (requested > 0) {
    title = `${requested} buổi đang chờ HLV xác nhận`;
    body = "HLV sẽ phản hồi sớm. Bạn sẽ nhận thông báo khi có cập nhật.";
    ctaLabel = "Xem gói tập";
    ctaHref = "/learner/bookings";
  } else if (nextUpcoming) {
    const start = new Date(nextUpcoming.start);
    const coach = coachById.get(nextUpcoming.coachId);
    const sessionTitle = getSessionTitle(nextUpcoming, coach);
    title = `Buổi tiếp theo: ${start.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })}`;
    body = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${sessionTitle}`;
    ctaLabel = "Xem lịch";
    ctaHref = "#upcoming";
  } else if (cancelled >= 3) {
    title = "Bạn đã huỷ nhiều buổi gần đây";
    body = "Thử điều chỉnh lịch tập để tránh bỏ lỡ các buổi đã đặt.";
    ctaLabel = "Đặt buổi tập mới";
    ctaHref = "/learner/bookings";
  } else if (completionRate >= 80 && completed >= 3) {
    title = `Tuyệt vời! Tỉ lệ hoàn thành ${completionRate}%`;
    body = "Bạn đang duy trì đà tập luyện tốt. Tiếp tục phát huy!";
    ctaLabel = "Đặt thêm buổi";
    ctaHref = "/learner/bookings";
  } else if (sessions.length === 0) {
    title = "Chưa có lịch tập nào";
    body = "Đặt buổi mới từ gói tập đang hoạt động để bắt đầu.";
    ctaLabel = "Đặt buổi tập";
    ctaHref = "/learner/bookings";
  } else {
    title = "Không có buổi tập sắp tới";
    body = "Duy trì đà tập luyện bằng cách đặt buổi mới.";
    ctaLabel = "Đặt buổi tập";
    ctaHref = "/learner/bookings";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.14, ease: EASE }}
      className="relative overflow-hidden rounded-[16px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-4 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-14px_rgba(53,37,205,0.2)]"
    >
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
            Sportico AI
          </span>
        </div>
        <p className="text-[13.5px] font-semibold text-on-surface leading-snug mb-1">
          {title}
        </p>
        <p className="text-[12px] text-on-surface-variant leading-relaxed mb-3">{body}</p>
        <Link
          href={ctaHref}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.35)] hover:shadow-[0_5px_14px_-3px_rgba(53,37,205,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          {ctaLabel}
        </Link>
      </div>
    </motion.div>
  );
}

// ---- Next Upcoming Card -----------------------------------------------------

function NextSessionCard({
  session,
  coach,
  reduce,
}: {
  session: Session | null;
  coach?: Coach;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, delay: 0.2, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
    >
      <div className="px-4 pt-3.5 pb-2.5 border-b border-[var(--color-border-soft)]">
        <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
          Buổi tiếp theo
        </p>
      </div>
      {session ? (
        <div className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
              {coach?.avatarUrl ? (
                <img
                  src={coach.avatarUrl}
                  alt={coach.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(coach?.name ?? "HLV")
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-on-surface truncate">
                {getSessionTitle(session, coach)}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                {coach?.name ?? "Huấn luyện viên"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
            <CalendarCheck size={12} className="text-primary shrink-0" />
            <span className="font-medium text-on-surface">
              {new Date(session.start).toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span>·</span>
            <span className="tabular-nums">
              {new Date(session.start).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>·</span>
            <span className="tabular-nums">{session.durationMinutes}ph</span>
          </div>
          {session.location && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{session.location}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-5 text-center">
          <p className="text-[12.5px] text-on-surface-variant">
            Bạn chưa có buổi tập sắp tới.
          </p>
          <Link
            href="/learner/bookings"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary font-semibold hover:underline"
          >
            Đặt buổi tập
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ---- Weekly Timeline Sidebar ------------------------------------------------

function WeeklyTimeline({
  weekDays,
  weekBuckets,
  coachById,
  reduce,
}: {
  weekDays: Date[];
  weekBuckets: Session[][];
  coachById: Map<string, Coach>;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.26, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04)] overflow-hidden"
    >
      <div className="px-4 pt-3.5 pb-2.5 border-b border-[var(--color-border-soft)]">
        <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
          Tuần này
        </p>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {weekDays.map((d, i) => {
          const isToday = localDateKey(d) === localDateKey(new Date());
          const sessions = weekBuckets[i] ?? [];
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2.5 px-2 py-2 rounded-[8px] transition-colors",
                isToday && "bg-primary/[0.05]",
              )}
            >
              {/* Day label */}
              <div className="w-8 text-center shrink-0 pt-0.5">
                <p
                  className={cn(
                    "text-[9.5px] uppercase tracking-wide font-bold",
                    isToday ? "text-primary" : "text-on-surface-variant/70",
                  )}
                >
                  {WEEKDAYS_SHORT[i]}
                </p>
                <p
                  className={cn(
                    "text-[14px] font-bold leading-none mt-0.5",
                    isToday ? "text-primary" : "text-on-surface",
                  )}
                >
                  {d.getDate()}
                </p>
              </div>

              {/* Sessions for the day */}
              <div className="flex-1 min-w-0 pt-0.5">
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/40 mt-1">
                    Không có lịch
                  </p>
                ) : (
                  <>
                    {sessions.slice(0, 2).map((s) => {
                      const coach = coachById.get(s.coachId);
                      const { dotColor } = statusDisplay(s.status);
                      const time = new Date(s.start).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const sportLabel = coach?.sport ?? null;
                      const coachLast = coach?.name?.split(" ").pop() ?? "HLV";
                      const entryText = sportLabel
                        ? `${time} · ${sportLabel} (${coachLast})`
                        : `${time} · Buổi tập (${coachLast})`;
                      return (
                        <div key={s.id} className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)}
                          />
                          <span className="text-[11.5px] truncate text-on-surface tabular-nums">
                            {entryText}
                          </span>
                        </div>
                      );
                    })}
                    {sessions.length > 2 && (
                      <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                        +{sessions.length - 2} buổi khác
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function LearnerSchedulePage() {
  const {
    data: sessionsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyTrainingSessions(), []);
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);

  const { data: coachesData } = useApiResource(() => api.fetchCoaches(), []);
  const coachById = useMemo(
    () => new Map((coachesData ?? []).map((c) => [c.id, c])),
    [coachesData],
  );

  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailSession, setDetailSession] = useState<Session | null>(null);

  const { cancel, cancelling } = useCancelSession(refetch);

  // ---- Week navigation -----
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
  })} – ${weekDays[6].toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}`;

  // ---- Stats (from all sessions, NOT filtered by tab) -----
  const upcoming = sessions.filter(
    (s) =>
      (s.status === "scheduled" || s.status === "in_progress") &&
      new Date(s.start) >= NOW,
  ).length;
  const requested = sessions.filter((s) => s.status === "pending_confirmation").length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;

  // ---- Next upcoming session -----
  const nextUpcoming = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            (s.status === "scheduled" || s.status === "in_progress") &&
            new Date(s.start).getTime() >= NOW.getTime(),
        )
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null,
    [sessions],
  );

  // ---- Filtered sessions for the list (tab-dependent) -----
  const filteredSessions = useMemo(
    () => filterSessions(sessions, activeTab),
    [sessions, activeTab],
  );

  const groupedSessions = useMemo(
    () => groupSessionsByDate(filteredSessions),
    [filteredSessions],
  );

  // ---- Weekly timeline uses ALL sessions (not filtered by tab) -----
  const weekBuckets = useMemo(() => {
    const weekStartKey = localDateKey(weekDays[0]);
    const weekEndKey = localDateKey(weekDays[6]);
    const weekAll = sessions.filter((s) => {
      const k = localDateKey(new Date(s.start));
      return k >= weekStartKey && k <= weekEndKey;
    });
    return weekDays.map((d) => {
      const key = localDateKey(d);
      return weekAll
        .filter((s) => localDateKey(new Date(s.start)) === key)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });
  }, [weekDays, sessions]);

  // ---- Render -----

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

  const statCards = [
    {
      icon: CalendarCheck,
      label: "Sắp tới",
      value: upcoming,
      accent: "indigo",
    },
    {
      icon: Hourglass,
      label: "Chờ xác nhận",
      value: requested,
      accent: "amber",
    },
    {
      icon: CheckCircle2,
      label: "Hoàn thành",
      value: completed,
      accent: "emerald",
    },
    {
      icon: XCircle,
      label: "Đã huỷ",
      value: cancelled,
      accent: "rose",
    },
  ] as const;

  const accentStyles: Record<string, { iconBg: string; glow: string }> = {
    indigo: {
      iconBg: "from-primary to-[#7d6dff]",
      glow: "from-primary/15 to-primary/0",
    },
    amber: {
      iconBg: "from-amber-400 to-orange-400",
      glow: "from-amber-400/15 to-transparent",
    },
    emerald: {
      iconBg: "from-[#10b981] to-[#34d399]",
      glow: "from-[#34d399]/15 to-transparent",
    },
    rose: {
      iconBg: "from-[#f43f5e] to-[#fb7185]",
      glow: "from-[#fb7185]/15 to-transparent",
    },
  };

  return (
    <AppShell role="learner" title="Lịch tập">
      <div className="max-w-[1200px] mx-auto space-y-5">
        {/* ---- HEADER ---- */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.42, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
        >
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-on-surface">
              Lịch tập của tôi
            </h1>
            <p className="text-[13.5px] text-on-surface-variant mt-0.5">
              Theo dõi buổi sắp tới, lịch sử tập và trạng thái đặt lịch.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Tuần trước"
              className="w-8 h-8 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="h-8 px-3 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Tuần sau"
              className="w-8 h-8 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low flex items-center justify-center transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <span className="hidden sm:inline text-[12px] text-on-surface-variant px-1 tabular-nums">
              {weekRangeLabel}
            </span>
            <Link
              href="/learner/bookings"
              className="ml-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CalendarPlus size={13} strokeWidth={2.5} />
              Đặt buổi tập
            </Link>
          </div>
        </motion.header>

        {/* ---- STATS ---- */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {statCards.map(({ icon: Icon, label, value, accent }, i) => {
            const a = accentStyles[accent];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.38, delay: i * 0.04, ease: EASE }}
                className="relative overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
              >
                <div
                  className={cn(
                    "absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br blur-xl opacity-50",
                    a.glow,
                  )}
                />
                <div className="relative flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-[8px] bg-gradient-to-br flex items-center justify-center text-white shrink-0",
                      a.iconBg,
                    )}
                  >
                    <Icon size={15} strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-[22px] font-bold tracking-tight tabular-nums leading-none">
                      {value}
                    </p>
                    <p className="text-[10.5px] uppercase tracking-wider font-medium text-on-surface-variant mt-0.5">
                      {label}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* ---- MAIN LAYOUT ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* LEFT: Sessions list */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.45, delay: 0.08, ease: EASE }}
            className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_6px_20px_-10px_rgba(15,15,30,0.06)]"
          >
            {/* Tabs */}
            <div className="px-4 pt-3.5 pb-0 border-b border-[var(--color-border-soft)] flex items-center gap-0.5 overflow-x-auto">
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
                      "relative shrink-0 px-3 h-9 text-[12.5px] font-medium rounded-t-[6px] transition-colors whitespace-nowrap pb-px",
                      activeTab === tab.id
                        ? "text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.span
                        layoutId="scheduleTabPill"
                        className="absolute inset-0 bg-surface-container-low rounded-t-[6px]"
                        transition={{
                          type: "spring",
                          duration: reduce ? 0 : 0.32,
                          bounce: 0.2,
                        }}
                      />
                    )}
                    <span className="relative">
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={cn(
                            "ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                            activeTab === tab.id
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {filteredSessions.length === 0 ? (
                    <EmptyTabState tab={activeTab} />
                  ) : (
                    <GroupedSessionList
                      groups={groupedSessions}
                      coachById={coachById}
                      reduce={reduce ?? false}
                      onCancel={cancel}
                      cancelling={cancelling}
                      onViewDetail={setDetailSession}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT: Sidebar */}
          <aside className="space-y-3">
            <AIInsightCard
              sessions={sessions}
              nextUpcoming={nextUpcoming}
              requested={requested}
              coachById={coachById}
              reduce={reduce ?? false}
            />
            <NextSessionCard
              session={nextUpcoming}
              coach={nextUpcoming ? coachById.get(nextUpcoming.coachId) : undefined}
              reduce={reduce ?? false}
            />
            <WeeklyTimeline
              weekDays={weekDays}
              weekBuckets={weekBuckets}
              coachById={coachById}
              reduce={reduce ?? false}
            />
          </aside>
        </div>
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {detailSession && (
          <SessionDetailModal
            session={detailSession}
            coach={coachById.get(detailSession.coachId)}
            onClose={() => setDetailSession(null)}
            onCancel={cancel}
            cancelling={cancelling === detailSession.id}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// suppress unused import lint warnings
void TrendingUp;
