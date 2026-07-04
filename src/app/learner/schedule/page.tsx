"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Hourglass,
  MapPin,
  MessageSquare,
  Package,
  Sparkles,
  Star,
  Video,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, initials, localDateKey, formatCurrencyVnd } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { bookingStatus, sessionStatus } from "@/lib/status-labels";
import type { Booking, Coach, Session } from "@/types";

const NOW = new Date();
const EASE = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type TabId = "all" | "upcoming" | "completed" | "cancelled" | "pending_payment";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "upcoming", label: "Sắp học" },
  { id: "completed", label: "Đã hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
  { id: "pending_payment", label: "Chờ thanh toán" },
];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function isUpcoming(s: Session): boolean {
  return (
    (s.status === "scheduled" || s.status === "in_progress") &&
    new Date(s.start).getTime() >= NOW.getTime()
  );
}

function getSessionTitle(session: Session, coach?: Coach, booking?: Booking): string {
  if (booking?.title && booking.title !== "Gói tập chưa có tên") return booking.title;
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
  booking,
  onClose,
}: {
  session: Session;
  coach?: Coach;
  booking?: Booking;
  onClose: () => void;
}) {
  const sCfg = sessionStatus(session.status);
  const start = new Date(session.start);
  const isOnline =
    session.meetingUrl != null || session.location?.toLowerCase() === "online";
  const title = getSessionTitle(session, coach, booking);
  const bCfg = booking ? bookingStatus(booking.status) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
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
        className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_20px_60px_-10px_rgba(15,15,30,0.25)] overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)] shrink-0">
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
                  sCfg.chip,
                )}
              >
                {sCfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3.5 overflow-y-auto">
          {booking && (
            <DetailRow icon={Package} label="Gói tập">
              <p className="font-semibold text-on-surface">{booking.title}</p>
              {bCfg && (
                <span
                  className={cn(
                    "inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1",
                    bCfg.chip,
                  )}
                >
                  {bCfg.label}
                </span>
              )}
            </DetailRow>
          )}

          <DetailRow icon={Star} label="Huấn luyện viên">
            <p className="font-medium text-on-surface">
              {coach?.name ?? "Huấn luyện viên"}
            </p>
          </DetailRow>

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

          <DetailRow icon={isOnline ? Video : MapPin} label="Hình thức học">
            {isOnline ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-on-surface">Trực tuyến (Online)</span>
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
              <p className="font-medium text-on-surface">
                {session.location ?? "Trực tiếp (địa điểm sẽ được HLV xác nhận)"}
              </p>
            )}
          </DetailRow>

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

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-[var(--color-border-soft)] shrink-0">
          {session.status === "completed" && coach && (
            <Link
              href={`/learner/coaches/${session.coachId}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[9px] border border-primary/20 bg-primary/5 text-primary text-[12.5px] font-semibold hover:bg-primary/10 transition-colors"
            >
              <Star size={13} />
              Đánh giá HLV
            </Link>
          )}
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[12.5px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0 ml-auto"
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
  booking,
  delay,
  reduce,
  onViewDetail,
}: {
  session: Session;
  coach?: Coach;
  booking?: Booking;
  delay: number;
  reduce: boolean;
  onViewDetail: (s: Session) => void;
}) {
  const sCfg = sessionStatus(session.status);
  const start = new Date(session.start);
  const isOnline =
    session.meetingUrl != null || session.location?.toLowerCase() === "online";
  const title = getSessionTitle(session, coach, booking);

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
        <div className={cn("w-2 h-2 rounded-full mt-1 shrink-0", sCfg.dot)} />
        <div className="w-px flex-1 bg-[var(--color-border-soft)] mt-1 mb-1 min-h-[20px]" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-on-surface leading-tight truncate min-w-0">
            {title}
          </p>
          <span
            className={cn(
              "inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0",
              sCfg.chip,
            )}
          >
            {sCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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

        {session.coachNote && (
          <p className="mt-1.5 flex items-start gap-1 text-[11.5px] text-primary/70 italic">
            <Sparkles size={11} className="mt-0.5 shrink-0" />
            <span className="truncate">{session.coachNote}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---- Pending payment card ---------------------------------------------------

function PendingPaymentCard({
  booking,
  coach,
  delay,
  reduce,
}: {
  booking: Booking;
  coach?: Coach;
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : delay, ease: EASE }}
      className="flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50/50 p-3.5"
    >
      <div className="w-9 h-9 rounded-[9px] bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white shrink-0">
        <Hourglass size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-on-surface leading-tight truncate min-w-0">
            {booking.title}
          </p>
          <span className="inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-amber-100 text-amber-700 border-amber-200">
            Chờ thanh toán
          </span>
        </div>
        <p className="text-[12px] text-on-surface-variant mt-1">
          {coach?.name ? `HLV: ${coach.name} · ` : ""}
          {booking.totalSessions} buổi
          {booking.totalAmount > 0 && ` · ${formatCurrencyVnd(booking.totalAmount)}`}
        </p>
        <p className="text-[11.5px] text-amber-700 mt-1.5 leading-relaxed">
          Lịch học sẽ được tạo tự động sau khi thanh toán thành công.
        </p>
        <Link
          href="/learner/bookings"
          className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-gradient-to-br from-amber-500 to-orange-500 text-white text-[12px] font-semibold shadow-[0_3px_10px_-2px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <CreditCard size={13} />
          Tiếp tục thanh toán
        </Link>
      </div>
    </motion.div>
  );
}

// ---- Grouped sessions list --------------------------------------------------

function GroupedSessionList({
  groups,
  coachById,
  bookingById,
  reduce,
  onViewDetail,
}: {
  groups: { dateKey: string; date: Date; items: Session[] }[];
  coachById: Map<string, Coach>;
  bookingById: Map<string, Booking>;
  reduce: boolean;
  onViewDetail: (s: Session) => void;
}) {
  let globalIndex = 0;
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.dateKey}>
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
                  booking={s.bookingId ? bookingById.get(s.bookingId) : undefined}
                  delay={idx * 0.035}
                  reduce={reduce}
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
      title: "Bạn chưa có lịch học nào",
      body: "Hãy chọn một gói tập phù hợp để bắt đầu. Lịch học sẽ được tạo tự động sau khi bạn mua gói thành công.",
      showCta: true,
    },
    upcoming: {
      title: "Không có buổi học sắp tới",
      body: "Các buổi học sắp diễn ra trong gói của bạn sẽ hiển thị ở đây.",
      showCta: false,
    },
    completed: {
      title: "Chưa có buổi học hoàn thành",
      body: "Các buổi đã hoàn thành sẽ xuất hiện ở đây.",
      showCta: false,
    },
    cancelled: {
      title: "Không có buổi học đã hủy",
      body: "Tốt lắm!",
      showCta: false,
    },
    pending_payment: {
      title: "Không có gói chờ thanh toán",
      body: "Các gói tập bạn đặt nhưng chưa thanh toán sẽ hiển thị ở đây.",
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
        <p className="text-[12.5px] text-on-surface-variant mt-0.5 max-w-[260px]">
          {m.body}
        </p>
      </div>
      {m.showCta && (
        <Link
          href="/learner/coaches"
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[9px] bg-primary/10 text-primary text-[12.5px] font-semibold hover:bg-primary/15 transition-colors"
        >
          <Package size={13} />
          Khám phá gói tập
        </Link>
      )}
    </div>
  );
}

// ---- AI Insight Card --------------------------------------------------------

function AIInsightCard({
  sessions,
  nextUpcoming,
  pendingCount,
  coachById,
  bookingById,
  reduce,
}: {
  sessions: Session[];
  nextUpcoming: Session | null;
  pendingCount: number;
  coachById: Map<string, Coach>;
  bookingById: Map<string, Booking>;
  reduce: boolean;
}) {
  const completed = sessions.filter((s) => s.status === "completed").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;
  const nonCancelled =
    completed +
    sessions.filter(
      (s) => s.status === "scheduled" || s.status === "in_progress",
    ).length;
  const completionRate =
    nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0;

  let title: string;
  let body: string;
  let ctaLabel: string;
  let ctaHref: string;

  if (pendingCount > 0) {
    title = `${pendingCount} gói đang chờ thanh toán`;
    body = "Hoàn tất thanh toán để hệ thống tạo lịch học tự động cho bạn.";
    ctaLabel = "Tiếp tục thanh toán";
    ctaHref = "/learner/bookings";
  } else if (nextUpcoming) {
    const start = new Date(nextUpcoming.start);
    const coach = coachById.get(nextUpcoming.coachId);
    const booking = nextUpcoming.bookingId ? bookingById.get(nextUpcoming.bookingId) : undefined;
    title = `Buổi tiếp theo: ${start.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })}`;
    body = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${getSessionTitle(nextUpcoming, coach, booking)}`;
    ctaLabel = "Xem lịch";
    ctaHref = "#upcoming";
  } else if (cancelled >= 3) {
    title = "Bạn đã bỏ lỡ nhiều buổi gần đây";
    body = "Cố gắng tham gia đầy đủ các buổi học trong gói để đạt kết quả tốt nhất.";
    ctaLabel = "Khám phá gói tập";
    ctaHref = "/learner/coaches";
  } else if (completionRate >= 80 && completed >= 3) {
    title = `Tuyệt vời! Tỉ lệ hoàn thành ${completionRate}%`;
    body = "Bạn đang duy trì đà tập luyện tốt. Tiếp tục phát huy!";
    ctaLabel = "Xem gói tập của tôi";
    ctaHref = "/learner/bookings";
  } else {
    title = "Chưa có lịch học sắp tới";
    body = "Chọn một gói tập phù hợp để bắt đầu hành trình của bạn.";
    ctaLabel = "Khám phá gói tập";
    ctaHref = "/learner/coaches";
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
  booking,
  reduce,
}: {
  session: Session | null;
  coach?: Coach;
  booking?: Booking;
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
                {getSessionTitle(session, coach, booking)}
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
            Bạn chưa có buổi học sắp tới.
          </p>
          <Link
            href="/learner/coaches"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary font-semibold hover:underline"
          >
            Khám phá gói tập
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

              <div className="flex-1 min-w-0 pt-0.5">
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/40 mt-1">
                    Không có lịch
                  </p>
                ) : (
                  <>
                    {sessions.slice(0, 2).map((s) => {
                      const coach = coachById.get(s.coachId);
                      const { dot } = sessionStatus(s.status);
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
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
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

  // Bookings drive the "Chờ thanh toán" entries (pending bookings have no
  // sessions yet) and provide package titles + booking status for sessions.
  const { data: bookingsData } = useApiResource(() => api.fetchMyBookings(), []);
  const bookingById = useMemo(
    () => new Map((bookingsData ?? []).map((b) => [b.id, b])),
    [bookingsData],
  );
  const pendingBookings = useMemo(
    () => (bookingsData ?? []).filter((b) => (b.status ?? "").toLowerCase() === "pending_payment"),
    [bookingsData],
  );

  const { data: coachesData } = useApiResource(() => api.fetchCoaches(), []);
  const coachById = useMemo(
    () => new Map((coachesData ?? []).map((c) => [c.id, c])),
    [coachesData],
  );

  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailSession, setDetailSession] = useState<Session | null>(null);

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

  // ---- Stats -----
  const upcoming = sessions.filter(isUpcoming).length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const cancelled = sessions.filter((s) => s.status === "cancelled").length;
  const pendingPayment = pendingBookings.length;

  // ---- Next upcoming session -----
  const nextUpcoming = useMemo(
    () =>
      sessions
        .filter(isUpcoming)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null,
    [sessions],
  );

  // ---- Filtered sessions for the list (tab-dependent) -----
  const filteredSessions = useMemo(() => {
    switch (activeTab) {
      case "upcoming":
        return sessions.filter(isUpcoming);
      case "completed":
        return sessions.filter((s) => s.status === "completed");
      case "cancelled":
        return sessions.filter((s) => s.status === "cancelled");
      case "pending_payment":
        return [];
      default:
        return sessions;
    }
  }, [sessions, activeTab]);

  const groupedSessions = useMemo(
    () => groupSessionsByDate(filteredSessions),
    [filteredSessions],
  );

  // Pending bookings show on "all" + "pending_payment" tabs only.
  const showPending =
    (activeTab === "all" || activeTab === "pending_payment") && pendingBookings.length > 0;

  const hasListContent = groupedSessions.length > 0 || showPending;

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
      <AppShell role="learner" title="Lịch học">
        <LoadingState label="Đang tải lịch học…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Lịch học">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  const statCards = [
    { icon: CalendarCheck, label: "Sắp học", value: upcoming, accent: "indigo" },
    { icon: CheckCircle2, label: "Hoàn thành", value: completed, accent: "emerald" },
    { icon: XCircle, label: "Đã hủy", value: cancelled, accent: "rose" },
    { icon: Wallet, label: "Chờ thanh toán", value: pendingPayment, accent: "amber" },
  ] as const;

  const accentStyles: Record<string, { iconBg: string; glow: string }> = {
    indigo: { iconBg: "from-primary to-[#7d6dff]", glow: "from-primary/15 to-primary/0" },
    amber: { iconBg: "from-amber-400 to-orange-400", glow: "from-amber-400/15 to-transparent" },
    emerald: { iconBg: "from-[#10b981] to-[#34d399]", glow: "from-[#34d399]/15 to-transparent" },
    rose: { iconBg: "from-[#f43f5e] to-[#fb7185]", glow: "from-[#fb7185]/15 to-transparent" },
  };

  return (
    <AppShell role="learner" title="Lịch học">
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
              Lịch học của tôi
            </h1>
            <p className="text-[13.5px] text-on-surface-variant mt-0.5">
              Xem các buổi học được tạo tự động từ gói tập bạn đã mua.
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
              href="/learner/coaches"
              className="ml-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Package size={13} strokeWidth={2.5} />
              Khám phá gói tập
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
            id="upcoming"
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
                    ? sessions.length + pendingBookings.length
                    : tab.id === "upcoming"
                      ? upcoming
                      : tab.id === "completed"
                        ? completed
                        : tab.id === "cancelled"
                          ? cancelled
                          : pendingPayment;
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
                        transition={{ type: "spring", duration: reduce ? 0 : 0.32, bounce: 0.2 }}
                      />
                    )}
                    <span className="relative">
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={cn(
                            "ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold",
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
                  {!hasListContent ? (
                    <EmptyTabState tab={activeTab} />
                  ) : (
                    <div className="space-y-5">
                      {showPending && (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5 px-1">
                            <p className="text-[12px] font-semibold text-amber-700">
                              Chờ thanh toán
                            </p>
                            <div className="flex-1 h-px bg-[var(--color-border-soft)]" />
                            <span className="text-[11px] text-on-surface-variant/60 tabular-nums">
                              {pendingBookings.length} gói
                            </span>
                          </div>
                          <div className="space-y-2">
                            {pendingBookings.map((b, i) => (
                              <PendingPaymentCard
                                key={b.id}
                                booking={b}
                                coach={coachById.get(b.coachId)}
                                delay={i * 0.035}
                                reduce={reduce ?? false}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {groupedSessions.length > 0 && (
                        <GroupedSessionList
                          groups={groupedSessions}
                          coachById={coachById}
                          bookingById={bookingById}
                          reduce={reduce ?? false}
                          onViewDetail={setDetailSession}
                        />
                      )}
                    </div>
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
              pendingCount={pendingPayment}
              coachById={coachById}
              bookingById={bookingById}
              reduce={reduce ?? false}
            />
            <NextSessionCard
              session={nextUpcoming}
              coach={nextUpcoming ? coachById.get(nextUpcoming.coachId) : undefined}
              booking={nextUpcoming?.bookingId ? bookingById.get(nextUpcoming.bookingId) : undefined}
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
            booking={detailSession.bookingId ? bookingById.get(detailSession.bookingId) : undefined}
            onClose={() => setDetailSession(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
