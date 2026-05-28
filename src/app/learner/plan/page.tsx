"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Loader2,
  Plus,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn } from "@/lib/utils";
import type {
  Booking,
  LearnerAssessment,
  PlanWeek,
  ProgressCheckIn,
} from "@/types";

export default function LearnerPlanPage() {
  const {
    data: bookingsData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchMyBookings(), []);
  const bookings = useMemo(() => bookingsData ?? [], [bookingsData]);

  const [bookingId, setBookingId] = useState("");
  useEffect(() => {
    if (bookings.length && !bookings.some((b) => b.id === bookingId)) {
      setBookingId(bookings[0].id);
    }
  }, [bookings, bookingId]);

  if (loading) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <LoadingState label="Đang tải lộ trình…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Lộ trình">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="learner" title="Lộ trình">
      <div className="max-w-[960px] mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Lộ trình tập luyện</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Đánh giá ban đầu, kế hoạch tập và nhật ký tiến độ theo gói đã mua.
            </p>
          </div>
          {bookings.length > 1 && (
            <div className="relative">
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="appearance-none h-10 pl-3 pr-9 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] text-body-sm outline-none focus:border-primary transition-colors"
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
              />
            </div>
          )}
        </header>

        {bookings.length === 0 ? (
          <EmptyState />
        ) : bookingId ? (
          <BookingPlan key={bookingId} booking={bookings.find((b) => b.id === bookingId)!} />
        ) : null}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
        <Dumbbell size={20} className="text-on-surface-variant" />
      </div>
      <p className="text-body-base font-medium">Chưa có gói tập nào</p>
      <p className="text-body-sm text-on-surface-variant mt-1">
        Đặt một gói huấn luyện để bắt đầu lộ trình của bạn.
      </p>
    </div>
  );
}

function BookingPlan({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-5">
      {/* Booking summary */}
      <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{booking.title}</p>
          <p className="text-body-sm text-on-surface-variant">
            {booking.completedSessions}/{booking.totalSessions} buổi · {booking.status}
          </p>
        </div>
        <div className="w-28 h-1.5 rounded-full bg-surface-container-low overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${booking.totalSessions ? (booking.completedSessions / booking.totalSessions) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <AssessmentSection bookingId={booking.id} />
      <PlanSection bookingId={booking.id} />
      <CheckInsSection bookingId={booking.id} />
    </div>
  );
}

// ============================================================================
// Assessment
// ============================================================================

function AssessmentSection({ bookingId }: { bookingId: string }) {
  const { data, loading, refetch } = useApiResource(
    () => api.fetchAssessment(bookingId),
    [bookingId],
  );
  const [editing, setEditing] = useState(false);

  return (
    <Section icon={Target} title="Đánh giá ban đầu">
      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      ) : editing || !data ? (
        <AssessmentForm
          bookingId={bookingId}
          existing={data ?? null}
          onSaved={() => {
            refetch();
            setEditing(false);
          }}
          onCancel={data ? () => setEditing(false) : undefined}
        />
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KV label="Mục tiêu" value={data.goalType} />
            <KV label="Trình độ" value={data.currentLevel} />
            <KV
              label="Chiều cao"
              value={data.heightCm ? `${data.heightCm} cm` : undefined}
            />
            <KV
              label="Cân nặng"
              value={data.weightKg ? `${data.weightKg} kg` : undefined}
            />
            <KV label="Ngày/tuần" value={data.availableDaysPerWeek} />
            <KV label="Thiết bị" value={data.equipmentAvailable} />
          </div>
          {data.goalDescription && (
            <p className="text-body-sm text-on-surface-variant mt-3">
              {data.goalDescription}
            </p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-3 text-body-sm text-primary hover:underline"
          >
            Chỉnh sửa
          </button>
        </div>
      )}
    </Section>
  );
}

const FIELD_CLS =
  "w-full h-10 px-3 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-sm transition-colors";

function AssessmentForm({
  bookingId,
  existing,
  onSaved,
  onCancel,
}: {
  bookingId: string;
  existing: LearnerAssessment | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<LearnerAssessment>(existing ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<LearnerAssessment>) =>
    setF((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.saveAssessment(
        bookingId,
        {
          goalType: f.goalType,
          goalDescription: f.goalDescription,
          heightCm: f.heightCm,
          weightKg: f.weightKg,
          bodyFatPercent: f.bodyFatPercent,
          currentLevel: f.currentLevel,
          healthNotes: f.healthNotes,
          injuryNotes: f.injuryNotes,
          trainingHistory: f.trainingHistory,
          availableDaysPerWeek: f.availableDaysPerWeek,
          preferredSessionDurationMinutes: f.preferredSessionDurationMinutes,
          equipmentAvailable: f.equipmentAvailable,
        },
        !!existing,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu đánh giá thất bại.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Mục tiêu">
          <input
            className={FIELD_CLS}
            value={f.goalType ?? ""}
            onChange={(e) => set({ goalType: e.target.value })}
            placeholder="Giảm cân / Tăng cơ…"
          />
        </Labeled>
        <Labeled label="Trình độ hiện tại">
          <input
            className={FIELD_CLS}
            value={f.currentLevel ?? ""}
            onChange={(e) => set({ currentLevel: e.target.value })}
            placeholder="Mới bắt đầu / Trung cấp…"
          />
        </Labeled>
        <Labeled label="Chiều cao (cm)">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.heightCm ?? ""}
            onChange={(e) => set({ heightCm: num(e.target.value) })}
          />
        </Labeled>
        <Labeled label="Cân nặng (kg)">
          <input
            className={FIELD_CLS}
            type="number"
            value={f.weightKg ?? ""}
            onChange={(e) => set({ weightKg: num(e.target.value) })}
          />
        </Labeled>
        <Labeled label="Số ngày tập/tuần">
          <input
            className={FIELD_CLS}
            value={f.availableDaysPerWeek ?? ""}
            onChange={(e) => set({ availableDaysPerWeek: e.target.value })}
            placeholder="VD: 3-4"
          />
        </Labeled>
        <Labeled label="Thiết bị có sẵn">
          <input
            className={FIELD_CLS}
            value={f.equipmentAvailable ?? ""}
            onChange={(e) => set({ equipmentAvailable: e.target.value })}
            placeholder="Tạ tay, dây kháng lực…"
          />
        </Labeled>
      </div>
      <Labeled label="Mô tả mục tiêu">
        <textarea
          rows={2}
          className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
          value={f.goalDescription ?? ""}
          onChange={(e) => set({ goalDescription: e.target.value })}
        />
      </Labeled>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Tiền sử chấn thương">
          <textarea
            rows={2}
            className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
            value={f.injuryNotes ?? ""}
            onChange={(e) => set({ injuryNotes: e.target.value })}
          />
        </Labeled>
        <Labeled label="Lưu ý sức khỏe">
          <textarea
            rows={2}
            className={cn(FIELD_CLS, "h-auto py-2 resize-none")}
            value={f.healthNotes ?? ""}
            onChange={(e) => set({ healthNotes: e.target.value })}
          />
        </Labeled>
      </div>

      {error && (
        <p className="text-body-sm text-[#ba1a1a]" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            Hủy
          </button>
        )}
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] disabled:opacity-60 inline-flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {existing ? "Cập nhật đánh giá" : "Lưu đánh giá"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Training plan
// ============================================================================

function PlanSection({ bookingId }: { bookingId: string }) {
  const { data, loading } = useApiResource(
    () => api.fetchTrainingPlan(bookingId),
    [bookingId],
  );

  return (
    <Section icon={ClipboardList} title="Kế hoạch tập luyện">
      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      ) : !data ? (
        <p className="text-body-sm text-on-surface-variant">
          Huấn luyện viên chưa tạo kế hoạch cho gói này.
        </p>
      ) : (
        <div className="space-y-3">
          {data.overview && (
            <p className="text-body-sm text-on-surface-variant">{data.overview}</p>
          )}
          <p className="text-body-sm text-on-surface-variant">
            {data.totalWeeks} tuần · {data.goalType ?? "Kế hoạch cá nhân hóa"}
          </p>
          <div className="space-y-2">
            {data.weeks.map((w) => (
              <WeekAccordion key={w.id} week={w} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function WeekAccordion({ week }: { week: PlanWeek }) {
  const [open, setOpen] = useState(week.weekNumber === 1);
  return (
    <div className="border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container-low/50 transition-colors text-left"
      >
        <span className="text-body-base font-medium">
          Tuần {week.weekNumber}
          {week.focus ? ` — ${week.focus}` : ""}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-on-surface-variant transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-3 border-t border-[var(--color-border-soft)] pt-3">
          {week.days.map((d) => (
            <div key={d.id}>
              <p className="text-body-sm font-semibold mb-1.5">
                Ngày {d.dayNumber}
                {d.title ? ` · ${d.title}` : ""}
              </p>
              <ul className="space-y-1">
                {d.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-baseline justify-between gap-3 text-body-sm py-1 border-b border-[var(--color-border-soft)] last:border-b-0"
                  >
                    <span>{ex.name}</span>
                    <span className="text-on-surface-variant tabular-nums shrink-0">
                      {[
                        ex.sets ? `${ex.sets} set` : null,
                        ex.reps ? `× ${ex.reps}` : null,
                        ex.intensity,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                  </li>
                ))}
                {d.exercises.length === 0 && (
                  <li className="text-body-sm text-on-surface-variant">
                    Nghỉ / phục hồi
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Progress check-ins
// ============================================================================

function CheckInsSection({ bookingId }: { bookingId: string }) {
  const { data, loading, refetch } = useApiResource(
    () => api.fetchProgressCheckIns(bookingId),
    [bookingId],
  );
  const checkIns = useMemo(() => data ?? [], [data]);
  const [adding, setAdding] = useState(false);

  return (
    <Section
      icon={HeartPulse}
      title="Nhật ký tiến độ"
      action={
        <button
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
        >
          <Plus size={14} />
          Thêm
        </button>
      }
    >
      {adding && (
        <CheckInForm
          bookingId={bookingId}
          onSaved={() => {
            refetch();
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
      ) : checkIns.length === 0 && !adding ? (
        <p className="text-body-sm text-on-surface-variant">
          Chưa có lần check-in nào. Ghi lại cân nặng và cảm giác để theo dõi tiến độ.
        </p>
      ) : (
        <ul className="space-y-2">
          {checkIns.map((c) => (
            <CheckInRow key={c.id} c={c} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function CheckInRow({ c }: { c: ProgressCheckIn }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[8px] bg-surface-container-low/40 border border-[var(--color-border-soft)]">
      <div className="flex items-center gap-2 text-body-sm">
        <CalendarDays size={14} className="text-on-surface-variant" />
        {new Date(c.checkInDate).toLocaleDateString("vi-VN")}
      </div>
      <div className="flex items-center gap-4 text-body-sm text-on-surface-variant tabular-nums">
        {c.weightKg != null && <span>{c.weightKg} kg</span>}
        {c.bodyFatPercent != null && <span>{c.bodyFatPercent}% mỡ</span>}
        {c.energyLevel && <span>{c.energyLevel}</span>}
      </div>
    </li>
  );
}

function CheckInForm({
  bookingId,
  onSaved,
  onCancel,
}: {
  bookingId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [energy, setEnergy] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.createProgressCheckIn(bookingId, {
        checkInDate: new Date(date).toISOString(),
        weightKg: weight === "" ? undefined : Number(weight),
        bodyFatPercent: bodyFat === "" ? undefined : Number(bodyFat),
        energyLevel: energy || undefined,
        learnerNote: note || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu check-in thất bại.");
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 p-3 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low/30 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Labeled label="Ngày">
          <input
            type="date"
            className={FIELD_CLS}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Labeled>
        <Labeled label="Cân nặng (kg)">
          <input
            type="number"
            className={FIELD_CLS}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Labeled>
        <Labeled label="% mỡ">
          <input
            type="number"
            className={FIELD_CLS}
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
          />
        </Labeled>
        <Labeled label="Năng lượng">
          <input
            className={FIELD_CLS}
            value={energy}
            onChange={(e) => setEnergy(e.target.value)}
            placeholder="Tốt / Mệt…"
          />
        </Labeled>
      </div>
      <Labeled label="Ghi chú">
        <input
          className={FIELD_CLS}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Cảm giác sau tuần tập…"
        />
      </Labeled>
      {error && (
        <p className="text-body-sm text-[#ba1a1a]" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] disabled:opacity-60 inline-flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Lưu
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Shared primitives
// ============================================================================

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Target;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[8px] bg-primary/10 flex items-center justify-center text-primary">
            <Icon size={16} />
          </div>
          <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-on-surface-variant mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
        {label}
      </p>
      <p className="text-body-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}
