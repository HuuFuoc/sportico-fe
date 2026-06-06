"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { sessionErrorMessage } from "@/lib/errors-vi";
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot, Booking } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  booking: Booking;
  onClose: () => void;
  /**
   * Called after a session was successfully created OR when SESSION_LIMIT_EXCEEDED
   * is detected. The caller is responsible for refetching all stale data.
   */
  onBooked: () => void;
}

type ModalState = "select" | "note" | "success";

function groupByDate(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const map = new Map<string, AvailabilitySlot[]>();
  for (const s of slots) {
    const key = new Date(s.startTime).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return map;
}

function timeRange(s: AvailabilitySlot): string {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} - ${fmt(end)}`;
}

function durationMin(s: AvailabilitySlot): number {
  return Math.round(
    (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000,
  );
}

/** Check if an API error is specifically SESSION_LIMIT_EXCEEDED. */
function isSessionLimitError(err: unknown): boolean {
  if (err instanceof Error && err.name === "ApiError") {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === "object") {
      const envelope = body as { error?: { code?: string }; code?: string };
      const code = envelope.error?.code ?? (envelope as { code?: string }).code;
      return code === "SESSION_LIMIT_EXCEEDED";
    }
  }
  return false;
}

export function BookSessionModal({ booking, onClose, onBooked }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const [modalState, setModalState] = useState<ModalState>("select");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [learnerNote, setLearnerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: slotsData,
    loading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useApiResource(
    () =>
      api.fetchCoachSlots(booking.coachId, {
        startFrom: new Date().toISOString(),
      }),
    [booking.coachId],
  );

  // Derive usage from backend-supplied fields; fall back to completedSessions only
  // if the new fields haven't arrived yet (e.g. cached stale booking object).
  const remainingSessions =
    booking.remainingSessions ?? Math.max(0, booking.totalSessions - booking.completedSessions);
  const usedSessions = booking.usedSessions ?? booking.completedSessions;

  // Use backend canBookSession as primary gate; fall back to remainingSessions > 0.
  const isSessionsFull =
    booking.canBookSession === false || remainingSessions <= 0;

  const availableSlots = useMemo(
    () =>
      (slotsData ?? []).filter((s) => {
        if (s.status?.toLowerCase() !== "available") return false;
        if (s.isFull === true) return false;
        if (typeof s.remainingParticipants === "number" && s.remainingParticipants <= 0) return false;
        return true;
      }),
    [slotsData],
  );

  const grouped = useMemo(() => groupByDate(availableSlots), [availableSlots]);

  const handleSelectSlot = useCallback((slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setModalState("note");
  }, []);

  const handleBack = useCallback(() => {
    setModalState("select");
    setSelectedSlot(null);
    setLearnerNote("");
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) return;

    // Guard: backend fields take priority; block immediately if no slots remain.
    if (booking.canBookSession === false || remainingSessions <= 0) {
      showError(
        "Gói tập này đã hết số buổi có thể đặt. Vui lòng kiểm tra lại gói tập hoặc mua gói mới.",
      );
      setModalState("select");
      setSelectedSlot(null);
      return;
    }

    setSubmitting(true);
    try {
      await api.bookSession(
        booking.id,
        selectedSlot.id,
        learnerNote.trim() || undefined,
      );
      setModalState("success");
      refetchSlots();
      onBooked();
    } catch (err) {
      showError(sessionErrorMessage(err, "Đặt lịch thất bại. Vui lòng thử lại."));
      // If backend rejects due to slot exhaustion, refetch booking so usage refreshes.
      if (isSessionLimitError(err)) {
        onBooked(); // triggers parent refetch + closes modal
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedSlot, booking, remainingSessions, learnerNote, refetchSlots, onBooked]);

  // Progress bar shows "đã hoàn thành" fraction (completed / total).
  const progressCompletedPct =
    booking.totalSessions > 0
      ? Math.round((booking.completedSessions / booking.totalSessions) * 100)
      : 0;
  // Secondary bar shows "đã giữ chỗ" fraction (used / total).
  const progressUsedPct =
    booking.totalSessions > 0
      ? Math.round((usedSessions / booking.totalSessions) * 100)
      : 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current && modalState !== "success") onClose();
      }}
    >
      <motion.div
        key={modalState}
        initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.97 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
        className="w-full sm:max-w-lg bg-surface-container-lowest rounded-t-[24px] sm:rounded-[24px] border border-[var(--color-border-soft)] shadow-[0_24px_80px_-12px_rgba(15,15,30,0.4)] flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] shrink-0">
              <CalendarDays size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-on-surface">
                {modalState === "success"
                  ? "Đặt lịch thành công"
                  : modalState === "note"
                    ? "Xác nhận buổi tập"
                    : "Chọn lịch tập"}
              </h2>
              <p className="text-[12px] text-on-surface-variant mt-0.5 line-clamp-1">
                {booking.title}
              </p>
            </div>
          </div>
          {modalState !== "success" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Booking usage strip */}
        {modalState === "select" && (
          <div className="px-5 py-3 border-b border-[var(--color-border-soft)] bg-surface-container-low/40 shrink-0 space-y-1.5">
            {/* Used / total row */}
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-on-surface-variant">Đã giữ chỗ</span>
              <span className={cn("font-semibold tabular-nums", isSessionsFull ? "text-red-600" : "text-on-surface")}>
                {usedSessions}/{booking.totalSessions} buổi
              </span>
            </div>
            {/* Progress bar — used fraction */}
            <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isSessionsFull
                    ? "bg-gradient-to-r from-red-400 to-rose-400"
                    : "bg-gradient-to-r from-primary to-[#7d6dff]",
                )}
                style={{ width: `${progressUsedPct}%` }}
              />
            </div>
            {/* Completed + remaining sub-row */}
            <div className="flex items-center justify-between text-[11.5px] text-on-surface-variant">
              <span className="tabular-nums">
                Đã hoàn thành: <strong className="text-on-surface">{booking.completedSessions}/{booking.totalSessions}</strong>
              </span>
              {remainingSessions > 0 ? (
                <span className="tabular-nums text-emerald-700 font-medium">
                  Còn {remainingSessions} buổi
                </span>
              ) : (
                <span className="tabular-nums text-red-600 font-semibold">
                  Hết lượt đặt
                </span>
              )}
            </div>
            {/* Completed progress bar (secondary, thinner) */}
            {usedSessions !== booking.completedSessions && (
              <div className="h-1 w-full rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400/70 transition-all"
                  style={{ width: `${progressCompletedPct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait" initial={false}>
            {/* SELECT STATE */}
            {modalState === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {!isSessionsFull && slotsLoading && (
                  <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-on-surface-variant">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    Đang tải lịch trống…
                  </div>
                )}

                {!isSessionsFull && !slotsLoading && slotsError && (
                  <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-[13px] font-medium text-red-700 mb-2">
                      Không tải được lịch
                    </p>
                    <button
                      onClick={refetchSlots}
                      className="text-[12px] text-primary hover:underline font-semibold"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {isSessionsFull && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <CheckCircle2 size={22} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-on-surface">
                        Gói tập đã hết số buổi có thể đặt
                      </p>
                      <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-[280px]">
                        Đã giữ chỗ {usedSessions}/{booking.totalSessions} buổi
                        {booking.completedSessions < usedSessions && ` (hoàn thành: ${booking.completedSessions})`}.
                        Hãy mua gói mới để tiếp tục tập luyện.
                      </p>
                    </div>
                  </div>
                )}

                {!isSessionsFull && !slotsLoading && !slotsError && availableSlots.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                      <CalendarDays size={20} className="text-on-surface-variant" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-on-surface">
                        Không còn lịch trống
                      </p>
                      <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-[240px]">
                        Huấn luyện viên chưa mở lịch, hoặc tất cả slot đã đầy. Bạn có thể nhắn tin để hỏi thêm.
                      </p>
                    </div>
                  </div>
                )}

                {!isSessionsFull && !slotsLoading && !slotsError && availableSlots.length > 0 && (
                  <div className="space-y-5">
                    <p className="text-[12px] text-on-surface-variant">
                      {availableSlots.length} slot còn chỗ — chọn một buổi để đặt
                    </p>
                    {Array.from(grouped.entries()).map(([date, slots]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays size={13} className="text-primary shrink-0" />
                          <span className="text-[12px] font-semibold text-on-surface capitalize">
                            {date}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {slots.map((slot) => (
                            <SlotButton
                              key={slot.id}
                              slot={slot}
                              onSelect={handleSelectSlot}
                              reduce={reduce ?? false}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* NOTE STATE */}
            {modalState === "note" && selectedSlot && (
              <motion.div
                key="note"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Selected slot summary */}
                <div className="rounded-[14px] border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] p-4 space-y-2.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary">
                    Lịch đã chọn
                  </p>
                  <div className="flex items-center gap-2.5 text-[13px] text-on-surface">
                    <Clock size={14} className="text-on-surface-variant shrink-0" />
                    <span className="font-semibold">{timeRange(selectedSlot)}</span>
                    <span className="text-on-surface-variant">
                      {new Date(selectedSlot.startTime).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-on-surface-variant ml-auto tabular-nums">
                      {durationMin(selectedSlot)} phút
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px] text-on-surface-variant">
                    {selectedSlot.isOnline ? (
                      <>
                        <Video size={13} className="text-primary shrink-0" />
                        <span>Trực tuyến (Online)</span>
                        {selectedSlot.meetingUrl && (
                          <a
                            href={selectedSlot.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-[140px]"
                          >
                            {selectedSlot.meetingUrl}
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <MapPin size={13} className="text-on-surface-variant shrink-0" />
                        <span>{selectedSlot.location ?? "Địa điểm chưa xác định"}</span>
                      </>
                    )}
                  </div>
                  {selectedSlot.note && (
                    <p className="text-[12px] text-on-surface-variant italic">
                      {selectedSlot.note}
                    </p>
                  )}
                </div>

                {/* Learner note */}
                <div>
                  <label className="flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant mb-1.5">
                    <MessageSquare size={13} />
                    Ghi chú cho HLV (tuỳ chọn)
                  </label>
                  <textarea
                    value={learnerNote}
                    onChange={(e) => setLearnerNote(e.target.value)}
                    rows={3}
                    placeholder="Mục tiêu buổi tập, điều muốn tập trung, câu hỏi cho HLV…"
                    className="w-full px-3 py-2.5 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low text-[13px] resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-on-surface-variant/50"
                  />
                </div>

              </motion.div>
            )}

            {/* SUCCESS STATE */}
            {modalState === "success" && selectedSlot && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(16,185,129,0.5)]">
                    <CheckCircle2 size={28} className="text-white" />
                  </div>
                </div>

                <div>
                  <p className="text-[17px] font-semibold text-on-surface">
                    Đã gửi yêu cầu đặt lịch
                  </p>
                  <p className="text-[13px] text-on-surface-variant mt-1.5 leading-relaxed max-w-[260px]">
                    Buổi tập đang chờ HLV xác nhận. Bạn có thể xem trạng thái trong lịch tập của mình.
                  </p>
                </div>

                {/* Slot summary */}
                <div className="w-full rounded-[14px] border border-emerald-200 bg-emerald-50 p-3.5 text-[12.5px] text-emerald-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="shrink-0" />
                    <span className="font-semibold">{timeRange(selectedSlot)}</span>
                    <span className="text-emerald-600">
                      {new Date(selectedSlot.startTime).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {selectedSlot.isOnline ? (
                    <div className="flex items-center gap-2">
                      <Video size={13} className="shrink-0" />
                      <span>Trực tuyến</span>
                    </div>
                  ) : selectedSlot.location ? (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="shrink-0" />
                      <span>{selectedSlot.location}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 w-full pt-1">
                  <a
                    href="/learner/schedule"
                    className="w-full h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] transition-all"
                  >
                    <Zap size={15} />
                    Xem lịch tập của tôi
                  </a>
                  <button
                    onClick={onClose}
                    className="w-full h-10 rounded-[12px] border border-[var(--color-border-soft)] text-[13px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {modalState !== "success" && (
          <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border-soft)] flex gap-2 shrink-0">
            {modalState === "note" ? (
              <>
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-[12px] border border-[var(--color-border-soft)] text-[13.5px] font-medium hover:bg-surface-container-low disabled:opacity-60 transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => void handleConfirm()}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {submitting ? "Đang đặt…" : "Xác nhận đặt lịch"}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-[12px] border border-[var(--color-border-soft)] text-[13.5px] font-medium hover:bg-surface-container-low transition-colors"
              >
                Đóng
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ---- Slot button -------------------------------------------------------

function SlotButton({
  slot,
  onSelect,
  reduce,
}: {
  slot: AvailabilitySlot;
  onSelect: (s: AvailabilitySlot) => void;
  reduce: boolean;
}) {
  const start = new Date(slot.startTime);
  const dur = durationMin(slot);
  const isGroup = (slot.maxParticipants ?? 1) > 1;
  const remaining = slot.remainingParticipants ?? (isGroup ? (slot.maxParticipants ?? 1) - (slot.bookedParticipants ?? 0) : undefined);

  return (
    <motion.button
      whileHover={reduce ? {} : { y: -2, scale: 1.01 }}
      whileTap={reduce ? {} : { scale: 0.98 }}
      onClick={() => onSelect(slot)}
      className="w-full flex items-center gap-3 rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent p-3 transition-all text-left group shadow-[0_1px_2px_rgba(15,15,30,0.04)] hover:shadow-[0_6px_18px_-6px_rgba(53,37,205,0.18)]"
    >
      {/* Time column */}
      <div className="w-20 shrink-0 text-center">
        <p className="text-[13px] font-bold tabular-nums text-on-surface">
          {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-[10.5px] text-on-surface-variant mt-0.5 tabular-nums">
          {dur} phút
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-[var(--color-border-soft)] shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {slot.isOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold border border-primary/15">
              <Video size={10} />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-semibold">
              <MapPin size={10} />
              Trực tiếp
            </span>
          )}
          {/* Group slot capacity badge */}
          {isGroup && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#7c3aed] text-[11px] font-semibold border border-[#8b5cf6]/15">
              <Users size={10} />
              Còn {remaining} chỗ
            </span>
          )}
          {!slot.isOnline && slot.location && (
            <span className="text-[11px] text-on-surface-variant truncate">
              {slot.location}
            </span>
          )}
          {slot.isOnline && slot.meetingUrl && (
            <span className="text-[11px] text-on-surface-variant truncate">
              {slot.meetingUrl.replace(/^https?:\/\//, "").split("/")[0]}
            </span>
          )}
        </div>
        {slot.note && (
          <p className="text-[11px] text-on-surface-variant mt-0.5 truncate italic">
            {slot.note}
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="w-7 h-7 rounded-full bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
        <CheckCircle2
          size={14}
          className="text-on-surface-variant group-hover:text-primary transition-colors"
        />
      </div>
    </motion.button>
  );
}
