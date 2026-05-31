"use client";

import { use, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Loader2,
  Plus,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { backend } from "@/lib/backend/client";
import { isMockMode } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  CreateDayRequest,
  CreateExerciseRequest,
  CreateWeekRequest,
} from "@/lib/backend/dto";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

// ---- Status helpers ---------------------------------------------------------

const SESSION_STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: "Chờ xác nhận", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  pending_confirmation: { label: "Chờ xác nhận", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  scheduled: { label: "Đã lên lịch", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã huỷ", cls: "bg-red-50 text-red-600 border-red-200" },
  active: { label: "Đang học", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

// ---- Small primitives -------------------------------------------------------

function Badge({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  const cfg = SESSION_STATUS[s] ?? { label: status ?? "—", cls: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-on-surface">
        {Icon && <Icon size={16} className="text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---- Exercise row -----------------------------------------------------------

// Normalized exercise shape used throughout the builder (UI type, not raw DTO).
type LocalExercise = {
  id: string;
  name?: string | null;
  sets?: number | null;
  reps?: string | null;
  intensity?: string | null;
  restSeconds?: number | null;
  notes?: string | null;
};

function ExerciseRow({
  ex,
  onDelete,
  readOnly = false,
}: {
  ex: LocalExercise;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting || isMockMode()) return;
    setDeleting(true);
    try {
      await backend.deleteExercise(ex.id);
      onDelete(ex.id);
    } catch {
      // swallow — refetch on parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low p-3">
      <Dumbbell size={14} className="mt-0.5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-on-surface">{ex.name ?? "—"}</p>
        <p className="text-[12px] text-on-surface-variant">
          {[
            ex.sets != null && `${ex.sets} sets`,
            ex.reps && `${ex.reps} reps`,
            ex.intensity && ex.intensity,
            ex.restSeconds != null && `nghỉ ${ex.restSeconds}s`,
          ].filter(Boolean).join(" · ")}
        </p>
        {ex.notes && (
          <p className="mt-1 text-[11px] italic text-on-surface-variant">{ex.notes}</p>
        )}
      </div>
      {!readOnly && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 rounded p-1 text-on-surface-variant/60 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      )}
    </div>
  );
}

// ---- Add exercise form ------------------------------------------------------

function AddExerciseForm({
  dayId,
  onAdded,
  onCancel,
}: {
  dayId: string;
  onAdded: (ex: LocalExercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [intensity, setIntensity] = useState("");
  const [rest, setRest] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setErr("Vui lòng nhập tên bài tập."); return; }
    setSaving(true);
    setErr(null);
    try {
      const body: CreateExerciseRequest = {
        exerciseName: name.trim(),
        orderIndex: 0, // backend accepts 0; server may re-order
        sets: sets ? parseInt(sets) : undefined,
        reps: reps || undefined,
        intensity: intensity || undefined,
        restSeconds: rest ? parseInt(rest) : undefined,
        notes: notes || undefined,
      };
      if (isMockMode()) {
        onAdded({ id: `mock-${Date.now()}`, name: body.exerciseName, sets: body.sets ?? null, reps: body.reps ?? null, intensity: body.intensity ?? null, restSeconds: body.restSeconds ?? null, notes: body.notes ?? null });
        return;
      }
      const created = await backend.addExercise(dayId, body);
      onAdded({ id: created.id, name: created.exerciseName, sets: created.sets ?? null, reps: created.reps ?? null, intensity: created.intensity ?? null, restSeconds: created.restSeconds ?? null, notes: created.notes ?? null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi khi thêm bài tập.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-[8px] border border-primary/20 bg-primary/[0.03] p-3 space-y-2">
      <input className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-1.5 text-[13px] outline-none focus:border-primary" placeholder="Tên bài tập *" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input className="rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Sets" type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} />
        <input className="rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Reps (vd: 10-12)" value={reps} onChange={(e) => setReps(e.target.value)} />
        <input className="rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Cường độ" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
        <input className="rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Nghỉ (giây)" type="number" min="0" value={rest} onChange={(e) => setRest(e.target.value)} />
      </div>
      <textarea className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-1.5 text-[12px] outline-none focus:border-primary resize-none" placeholder="Ghi chú (tuỳ chọn)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p className="text-[12px] text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary disabled:opacity-60">
          {saving && <Loader2 size={12} className="animate-spin" />}
          Lưu
        </button>
        <button onClick={onCancel} className="rounded-[6px] px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-container-low transition-colors">
          Huỷ
        </button>
      </div>
    </div>
  );
}

// ---- Day accordion ----------------------------------------------------------

function DayCard({
  day,
  readOnly = false,
}: {
  day: { id: string; dayNumber: number; title?: string | null; notes?: string | null; exercises?: LocalExercise[] | null };
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<LocalExercise[]>(day.exercises ?? []);
  const [adding, setAdding] = useState(false);

  const handleDelete = useCallback((id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleAdded = useCallback((ex: LocalExercise) => {
    setExercises((prev) => [...prev, ex]);
    setAdding(false);
  }, []);

  return (
    <div className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-primary shrink-0" />
          <span className="text-[13px] font-semibold text-on-surface">
            Ngày {day.dayNumber}{day.title ? ` — ${day.title}` : ""}
          </span>
          <span className="text-[11px] text-on-surface-variant">
            ({exercises.length} bài)
          </span>
        </div>
        <ChevronDown size={14} className={cn("text-on-surface-variant transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {day.notes && (
                <p className="text-[12px] italic text-on-surface-variant">{day.notes}</p>
              )}
              {exercises.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} onDelete={handleDelete} readOnly={readOnly} />
              ))}
              {exercises.length === 0 && !adding && (
                <p className="text-[12px] text-on-surface-variant/60">Chưa có bài tập.</p>
              )}
              {!readOnly && (adding ? (
                <AddExerciseForm
                  dayId={day.id}
                  onAdded={handleAdded}
                  onCancel={() => setAdding(false)}
                />
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                >
                  <Plus size={12} />
                  Thêm bài tập
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Week accordion ---------------------------------------------------------

function WeekCard({
  week,
  readOnly = false,
}: {
  week: { id: string; weekNumber: number; focus?: string | null; notes?: string | null; days?: Array<{ id: string; dayNumber: number; title?: string | null; notes?: string | null; exercises?: LocalExercise[] | null }> | null };
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(week.weekNumber === 1);
  const [days, setDays] = useState(week.days ?? []);
  const [addingDay, setAddingDay] = useState(false);
  const [dayNum, setDayNum] = useState("");
  const [dayTitle, setDayTitle] = useState("");
  const [savingDay, setSavingDay] = useState(false);

  const handleAddDay = async () => {
    if (!dayNum) return;
    setSavingDay(true);
    try {
      const body: CreateDayRequest = { dayNumber: parseInt(dayNum), title: dayTitle || "" };
      if (isMockMode()) {
        setDays((prev) => [...prev, { id: `mock-day-${Date.now()}`, dayNumber: parseInt(dayNum), title: dayTitle || null, notes: null, exercises: [] }]);
        setAddingDay(false); setDayNum(""); setDayTitle("");
        return;
      }
      const created = await backend.addPlanDay(week.id, body);
      setDays((prev) => [...prev, { ...created, exercises: [] }]);
      setAddingDay(false); setDayNum(""); setDayTitle("");
    } catch {
      // ignore for now
    } finally {
      setSavingDay(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
            {week.weekNumber}
          </div>
          <span className="text-[14px] font-semibold text-on-surface">
            Tuần {week.weekNumber}
            {week.focus ? ` — ${week.focus}` : ""}
          </span>
          <span className="text-[12px] text-on-surface-variant">
            ({days.length} ngày)
          </span>
        </div>
        <ChevronDown size={15} className={cn("text-on-surface-variant transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {week.notes && (
                <p className="text-[12px] italic text-on-surface-variant">{week.notes}</p>
              )}
              {days.map((d) => (
                <DayCard key={d.id} day={d} readOnly={readOnly} />
              ))}
              {!readOnly && (addingDay ? (
                <div className="flex flex-wrap items-end gap-2 rounded-[8px] border border-primary/20 bg-primary/[0.03] p-3">
                  <div>
                    <p className="mb-1 text-[11px] text-on-surface-variant">Số ngày *</p>
                    <input type="number" min="1" className="w-20 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" value={dayNum} onChange={(e) => setDayNum(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] text-on-surface-variant">Tiêu đề</p>
                    <input className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Ví dụ: Kỹ thuật phát cầu" value={dayTitle} onChange={(e) => setDayTitle(e.target.value)} />
                  </div>
                  <button onClick={handleAddDay} disabled={savingDay} className="inline-flex items-center gap-1 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary disabled:opacity-60">
                    {savingDay && <Loader2 size={12} className="animate-spin" />}
                    Thêm
                  </button>
                  <button onClick={() => setAddingDay(false)} className="rounded-[6px] px-2 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-container-high">
                    Huỷ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingDay(true)}
                  className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline"
                >
                  <Plus size={13} />
                  Thêm ngày
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Training plan builder --------------------------------------------------

function TrainingPlanBuilder({ bookingId }: { bookingId: string }) {
  const {
    data: plan,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchTrainingPlan(bookingId), [bookingId]);

  const [localWeeks, setLocalWeeks] = useState<NonNullable<typeof plan>["weeks"]>([]);
  const weeks = plan?.weeks?.length ? (localWeeks.length ? localWeeks : plan.weeks) : localWeeks;
  const setWeeks = setLocalWeeks;
  const [addingWeek, setAddingWeek] = useState(false);
  const [weekNum, setWeekNum] = useState("");
  const [weekFocus, setWeekFocus] = useState("");
  const [savingWeek, setSavingWeek] = useState(false);

  const [creating, setCreating] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planOverview, setPlanOverview] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  const handleCreatePlan = async () => {
    if (!planTitle.trim() || !planStart || !planEnd) {
      setCreateErr("Vui lòng điền tiêu đề, ngày bắt đầu và kết thúc.");
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      if (isMockMode()) { refetch(); return; }
      await backend.createTrainingPlan(bookingId, {
        title: planTitle.trim(),
        goalType: "Cá nhân hóa",
        overview: planOverview || undefined,
        startDate: new Date(planStart).toISOString(),
        endDate: new Date(planEnd).toISOString(),
        totalWeeks: Math.max(1, Math.ceil((new Date(planEnd).getTime() - new Date(planStart).getTime()) / (7 * 24 * 60 * 60 * 1000))),
      });
      refetch();
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : "Lỗi khi tạo lộ trình.");
    } finally {
      setCreating(false);
    }
  };

  const handleAddWeek = async () => {
    if (!plan?.id || !weekNum) return;
    setSavingWeek(true);
    try {
      const body: CreateWeekRequest = { weekNumber: parseInt(weekNum), focus: weekFocus || undefined };
      if (isMockMode()) {
        setWeeks((prev) => [...(prev ?? []), { id: `mock-week-${Date.now()}`, weekNumber: parseInt(weekNum), focus: weekFocus || undefined, notes: undefined, days: [] }]);
        setAddingWeek(false); setWeekNum(""); setWeekFocus("");
        return;
      }
      const created = await backend.addPlanWeek(plan.id, body);
      setWeeks((prev) => [...(prev ?? []), { id: created.id, weekNumber: created.weekNumber, focus: created.focus ?? undefined, notes: created.notes ?? undefined, days: [] }]);
      setAddingWeek(false); setWeekNum(""); setWeekFocus("");
    } catch {
      // ignore
    } finally {
      setSavingWeek(false);
    }
  };

  if (loading) return <LoadingState label="Đang tải lộ trình…" />;
  if (error) return <ErrorState message="Không tải được lộ trình." onRetry={refetch} />;

  if (!plan) {
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-on-surface-variant">
          Học viên này chưa có lộ trình tập. Tạo lộ trình để bắt đầu.
        </p>
        <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low p-4 space-y-3">
          <input className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[13px] outline-none focus:border-primary" placeholder="Tiêu đề lộ trình *" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
          <textarea className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[12px] outline-none focus:border-primary resize-none" placeholder="Tổng quan (tuỳ chọn)" rows={2} value={planOverview} onChange={(e) => setPlanOverview(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-[11px] text-on-surface-variant">Ngày bắt đầu *</p>
              <input type="date" className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-2 text-[12px] outline-none focus:border-primary" value={planStart} onChange={(e) => setPlanStart(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-on-surface-variant">Ngày kết thúc *</p>
              <input type="date" className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-2 text-[12px] outline-none focus:border-primary" value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} />
            </div>
          </div>
          {createErr && <p className="text-[12px] text-red-600">{createErr}</p>}
          <button onClick={handleCreatePlan} disabled={creating} className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary disabled:opacity-60">
            {creating && <Loader2 size={14} className="animate-spin" />}
            Tạo lộ trình
          </button>
        </div>
      </div>
    );
  }

  const readOnly = plan.isReadOnly === true;

  return (
    <div className="space-y-3">
      {/* Plan header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-on-surface">{plan.title}</p>
          {plan.overview && <p className="text-[13px] text-on-surface-variant">{plan.overview}</p>}
          <p className="mt-1 text-[12px] text-on-surface-variant">
            {new Date(plan.startDate).toLocaleDateString("vi-VN")} → {new Date(plan.endDate).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <Badge status={plan.status} />
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          {plan.readOnlyReason ?? "Lộ trình này chỉ có thể xem — không thể chỉnh sửa."}
        </div>
      )}

      {/* Weeks */}
      <div className="space-y-2">
        {(weeks ?? []).map((week) => (
          <WeekCard key={week.id} week={week} readOnly={readOnly} />
        ))}
      </div>

      {/* Add week — hidden when read-only */}
      {!readOnly && (addingWeek ? (
        <div className="flex flex-wrap items-end gap-2 rounded-[8px] border border-primary/20 bg-primary/[0.03] p-3">
          <div>
            <p className="mb-1 text-[11px] text-on-surface-variant">Số tuần *</p>
            <input type="number" min="1" className="w-20 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" value={weekNum} onChange={(e) => setWeekNum(e.target.value)} />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[11px] text-on-surface-variant">Trọng tâm tuần</p>
            <input className="w-full rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2 py-1.5 text-[12px] outline-none focus:border-primary" placeholder="Ví dụ: Nâng cao thể lực" value={weekFocus} onChange={(e) => setWeekFocus(e.target.value)} />
          </div>
          <button onClick={handleAddWeek} disabled={savingWeek} className="inline-flex items-center gap-1 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary disabled:opacity-60">
            {savingWeek && <Loader2 size={12} className="animate-spin" />}
            Thêm tuần
          </button>
          <button onClick={() => setAddingWeek(false)} className="rounded-[6px] px-2 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-container-high">
            Huỷ
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingWeek(true)} className="inline-flex items-center gap-1.5 rounded-[8px] border border-dashed border-[var(--color-border-soft)] px-4 py-2 text-[13px] text-primary hover:border-primary/40 hover:bg-primary/[0.03] transition-colors">
          <Plus size={14} />
          Thêm tuần
        </button>
      ))}
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export default function CoachLearnerDetailPage({ params }: PageProps) {
  const { bookingId } = use(params);

  const {
    data: booking,
    loading: bookingLoading,
    error: bookingError,
  } = useApiResource(() => api.fetchBooking(bookingId), [bookingId]);

  const {
    data: assessment,
    loading: assessmentLoading,
  } = useApiResource(() => api.fetchAssessment(bookingId), [bookingId]);

  const {
    data: sessionsData,
    loading: sessionsLoading,
    refetch: refetchSessions,
  } = useApiResource(() => api.fetchSessions(), []);

  const bookingSessions = useMemo(
    () => (sessionsData ?? []).filter((s) => s.bookingId === bookingId),
    [sessionsData, bookingId],
  );

  const [activeTab, setActiveTab] = useState<"plan" | "sessions" | "assessment">("plan");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSessionAction = async (
    sessionId: string,
    action: "confirm" | "cancel" | "complete",
  ) => {
    if (isMockMode()) { refetchSessions(); return; }
    setActionLoading(sessionId + action);
    try {
      if (action === "confirm") await backend.confirmSession(sessionId);
      else if (action === "cancel") await backend.cancelSession(sessionId);
      else await backend.completeSession(sessionId);
      refetchSessions();
    } catch {
      // silent for now — real app would show a toast
    } finally {
      setActionLoading(null);
    }
  };

  if (bookingLoading) {
    return (
      <AppShell role="coach" title="Chi tiết học viên">
        <LoadingState label="Đang tải…" />
      </AppShell>
    );
  }

  if (bookingError || !booking) notFound();

  const TABS = [
    { key: "plan", label: "Lộ trình tập", icon: ClipboardList },
    { key: "sessions", label: "Buổi tập", icon: Calendar },
    { key: "assessment", label: "Đánh giá ban đầu", icon: HeartPulse },
  ] as const;

  return (
    <AppShell role="coach" title="Chi tiết học viên">
      <div className="mx-auto max-w-[960px] space-y-5">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link
            href="/coach/learners"
            className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant hover:text-primary transition-colors"
          >
            <ArrowLeft size={15} />
            Danh sách học viên
          </Link>
          <ChevronRight size={13} className="text-on-surface-variant/40" />
          <span className="text-[13px] text-on-surface-variant">
            {booking.title}
          </span>
        </div>

        {/* Booking summary card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="flex flex-col gap-4 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:flex-row sm:items-center"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-primary/[0.08]">
            <Users size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-on-surface">{booking.title}</p>
            <p className="text-[12px] text-on-surface-variant">
              {booking.completedSessions}/{booking.totalSessions} buổi · {new Date(booking.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
          <Badge status={booking.status} />
        </motion.div>

        {/* Tab nav */}
        <div className="flex gap-1 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2 text-[13px] font-medium transition-colors",
                activeTab === key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low",
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "plan" && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <SectionCard title="Lộ trình tập luyện" icon={ClipboardList}>
                <TrainingPlanBuilder bookingId={bookingId} />
              </SectionCard>
            </motion.div>
          )}

          {activeTab === "sessions" && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <SectionCard title="Buổi tập" icon={Calendar}>
                {sessionsLoading && <LoadingState label="Đang tải buổi tập…" />}
                {!sessionsLoading && bookingSessions.length === 0 && (
                  <p className="text-[14px] text-on-surface-variant">Chưa có buổi tập nào.</p>
                )}
                <div className="space-y-3">
                  {bookingSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-on-surface">{s.title}</p>
                          <Badge status={s.status} />
                        </div>
                        <p className="text-[12px] text-on-surface-variant">
                          {new Date(s.start).toLocaleString("vi-VN", {
                            weekday: "short",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {s.status === "pending_confirmation" && (
                          <>
                            <button
                              onClick={() => handleSessionAction(s.id, "confirm")}
                              disabled={actionLoading === s.id + "confirm"}
                              className="inline-flex items-center gap-1 rounded-[6px] bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-on-primary disabled:opacity-60"
                            >
                              {actionLoading === s.id + "confirm" && <Loader2 size={11} className="animate-spin" />}
                              <CheckCircle2 size={12} />
                              Xác nhận
                            </button>
                            <button
                              onClick={() => handleSessionAction(s.id, "cancel")}
                              disabled={actionLoading === s.id + "cancel"}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 disabled:opacity-60"
                            >
                              <XCircle size={12} />
                              Huỷ
                            </button>
                          </>
                        )}
                        {s.status === "scheduled" && (
                          <>
                            <button
                              onClick={() => handleSessionAction(s.id, "complete")}
                              disabled={actionLoading === s.id + "complete"}
                              className="inline-flex items-center gap-1 rounded-[6px] bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                            >
                              {actionLoading === s.id + "complete" && <Loader2 size={11} className="animate-spin" />}
                              <CheckCircle2 size={12} />
                              Hoàn thành
                            </button>
                            <button
                              onClick={() => handleSessionAction(s.id, "cancel")}
                              disabled={actionLoading === s.id + "cancel"}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 disabled:opacity-60"
                            >
                              <XCircle size={12} />
                              Huỷ
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {activeTab === "assessment" && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <SectionCard title="Đánh giá ban đầu" icon={HeartPulse}>
                {assessmentLoading && <LoadingState label="Đang tải…" />}
                {!assessmentLoading && !assessment && (
                  <p className="text-[14px] text-on-surface-variant">
                    Học viên chưa điền đánh giá ban đầu.
                  </p>
                )}
                {assessment && (
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {([
                      ["Mục tiêu", assessment.goalType],
                      ["Mô tả mục tiêu", assessment.goalDescription],
                      ["Trình độ", assessment.currentLevel],
                      ["Chiều cao (cm)", assessment.heightCm],
                      ["Cân nặng (kg)", assessment.weightKg],
                      ["% Mỡ cơ thể", assessment.bodyFatPercent],
                      ["Số ngày/tuần", assessment.availableDaysPerWeek],
                      ["Thời gian mỗi buổi", assessment.preferredSessionDurationMinutes ? `${assessment.preferredSessionDurationMinutes} phút` : null],
                      ["Thiết bị", assessment.equipmentAvailable],
                      ["Lịch sử tập", assessment.trainingHistory],
                      ["Sức khoẻ", assessment.healthNotes],
                      ["Chấn thương", assessment.injuryNotes],
                    ] as [string, unknown][]).filter(([, v]) => v != null && v !== "").map(([label, value]) => (
                      <div key={label} className="rounded-[8px] bg-surface-container-low p-3">
                        <dt className="text-[11px] uppercase tracking-[0.06em] text-on-surface-variant">{label}</dt>
                        <dd className="mt-1 text-[13px] text-on-surface">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
