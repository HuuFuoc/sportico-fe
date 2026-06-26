"use client";

// ============================================================================
// PackageFormModal — sectioned "Create / edit fixed-schedule package" form.
//   1. Thông tin gói tập   2. Giá & thời lượng   3. Thiết lập mặc định
//   4. Tạo lịch học (ScheduleBuilder)            5. Xem trước & tạo gói
// Submits the UNCHANGED backend payload (see schedule.buildPackagePayload).
// ============================================================================

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  CalendarClock,
  Eye,
  Info,
  Loader2,
  Settings2,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createTrainingPackage,
  updateTrainingPackage,
  levelLabel,
  goalTypeLabel,
  LEVEL_OPTIONS,
  GOAL_TYPE_OPTIONS,
} from "@/lib/training-package-api";
import { messageForApiError, validationDetails } from "@/lib/errors-vi";
import {
  formatVND,
  calculatePricePerSession,
  formatDateVN,
  formatTimeVN,
  getMainLocation,
  getNextSession,
  getDeliveryMode,
  NOT_SET,
} from "@/lib/training-package-format";
import type { TrainingPackageResponse, SportOption } from "@/lib/types/coach";
import { Field, ModeToggle, SectionCard, Select, TextInput, Textarea } from "./ui";
import { ScheduleBuilder } from "./ScheduleBuilder";
import {
  type DefaultConfig,
  type PackageFormValues,
  type SessionDraft,
  buildPackagePayload,
  calculatePackageDurationDays,
  combineLocalISO,
  isoToDate,
  isoToTime,
  newSessionId,
  validatePackageForm,
  weekdayShort,
} from "./schedule";

interface FormState extends PackageFormValues {
  defaultMeetingUrl: string;
  defaultMaxParticipants: string;
  defaultDurationMinutes: number;
}

const DURATION_OPTIONS = [60, 90, 120];

export function PackageFormModal({
  initial,
  sports,
  onClose,
  onSaved,
}: {
  initial: TrainingPackageResponse | null;
  sports: SportOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(initial);

  const [values, setValues] = useState<FormState>(() => initialState(initial, sports));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  const set = (patch: Partial<FormState>) => setValues((v) => ({ ...v, ...patch }));
  const setSessions = (next: SessionDraft[]) => set({ sessions: next });

  const defaults: DefaultConfig = {
    isOnline: values.defaultIsOnline,
    location: values.defaultLocation,
    meetingUrl: values.defaultMeetingUrl,
    maxParticipants: values.defaultMaxParticipants,
    durationMinutes: values.defaultDurationMinutes,
    level: values.level,
  };

  const sportName = useMemo(
    () => sports.find((s) => String(s.id) === values.sportId)?.name ?? "",
    [sports, values.sportId],
  );

  const submit = async () => {
    const v = validatePackageForm(values);
    if (v) {
      setErr(v);
      setDetails([]);
      return;
    }
    setSaving(true);
    setErr(null);
    setDetails([]);
    try {
      const payload = buildPackagePayload(values);
      if (isEdit && initial) {
        await updateTrainingPackage(initial.id, payload);
        onSaved("Đã cập nhật gói tập.");
      } else {
        await createTrainingPackage(payload);
        onSaved("Gói tập đã được tạo và đang chờ quản trị viên duyệt.");
      }
    } catch (e) {
      const d = validationDetails(e);
      setDetails(d);
      setErr(d.length > 0 ? "Thông tin gói tập chưa hợp lệ:" : messageForApiError(e));
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !saving && onClose()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-low shadow-[0_24px_70px_-16px_rgba(15,15,30,0.4)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-4">
          <div>
            <h3 className="text-[16px] font-semibold text-on-surface">
              {isEdit ? "Cập nhật gói tập" : "Tạo gói tập theo lịch cố định"}
            </h3>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              Học viên sẽ tập đúng theo các buổi bạn thiết lập bên dưới.
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
          <BasicInfoSection values={values} sports={sports} set={set} />
          <PricingSection values={values} set={set} />
          <DefaultSessionSection values={values} set={set} />

          <SectionCard
            step={4}
            title="Tạo lịch học cố định"
            description="Tạo nhanh nhiều buổi bằng lịch lặp, hoặc thêm từng buổi thủ công."
            icon={<CalendarClock size={16} />}
          >
            <ScheduleBuilder
              sessions={values.sessions}
              setSessions={setSessions}
              defaults={defaults}
              startDate={values.startDate}
              endDate={values.endDate}
            />
          </SectionCard>

          <SectionCard
            step={5}
            title="Xem trước gói tập"
            description="Đây là thông tin học viên sẽ thấy trước khi mua."
            icon={<Eye size={16} />}
          >
            <PackagePreviewCard values={values} sportName={sportName} />
          </SectionCard>

          {err && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5" role="alert">
              <p className="flex items-start gap-1.5 text-[12.5px] font-medium text-rose-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {err}
              </p>
              {details.length > 0 && (
                <ul className="mt-1.5 ml-5 list-disc space-y-0.5 text-[12px] text-rose-600">
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-3">
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="h-10 rounded-[9px] border border-[var(--color-border-soft)] px-4 text-[13px] font-medium hover:bg-surface-container-low disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-primary px-5 text-[13px] font-semibold text-white hover:bg-[#2d20b8] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang lưu…
              </>
            ) : isEdit ? (
              "Cập nhật gói tập"
            ) : (
              "Tạo gói tập"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Section 1: basic info ────────────────────────────────────────────────────

function BasicInfoSection({
  values,
  sports,
  set,
}: {
  values: FormState;
  sports: SportOption[];
  set: (patch: Partial<FormState>) => void;
}) {
  return (
    <SectionCard step={1} title="Thông tin gói tập" icon={<Info size={16} />}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tên gói tập" required>
            <TextInput
              value={values.title}
              onChange={(e) => set({ title: e.target.value.slice(0, 200) })}
              placeholder="VD: Gói cầu lông cơ bản tháng 7"
            />
          </Field>
          <Field label="Môn thể thao" required>
            <Select value={values.sportId} onChange={(e) => set({ sportId: e.target.value })}>
              <option value="" disabled>
                Chọn môn thể thao…
              </option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trình độ phù hợp" hint="Tùy chọn">
            <Select value={values.level} onChange={(e) => set({ level: e.target.value })}>
              <option value="">Không chỉ định</option>
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mục tiêu luyện tập" hint="Tùy chọn">
            <Select value={values.goalType} onChange={(e) => set({ goalType: e.target.value })}>
              <option value="">Không chỉ định</option>
              {GOAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Mô tả gói tập" hint="Hiển thị tóm tắt trên thẻ + chi tiết khi xem">
          <Textarea
            rows={3}
            value={values.description}
            onChange={(e) => set({ description: e.target.value.slice(0, 3000) })}
            placeholder="Nội dung, lộ trình, đối tượng phù hợp, quyền lợi học viên…"
          />
        </Field>
      </div>
    </SectionCard>
  );
}

// ── Section 2: pricing & window ──────────────────────────────────────────────

function PricingSection({
  values,
  set,
}: {
  values: FormState;
  set: (patch: Partial<FormState>) => void;
}) {
  const count = values.sessions.length;
  const perSession = calculatePricePerSession(Number(values.price), count);
  const days = calculatePackageDurationDays(values.startDate, values.endDate);

  return (
    <SectionCard step={2} title="Giá & thời lượng" icon={<Wallet size={16} />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Giá gói (VND)" required hint="Số nguyên">
          <TextInput
            type="number"
            min={1}
            className="tabular-nums"
            value={values.price}
            onChange={(e) => set({ price: e.target.value })}
            placeholder="VD: 1200000"
          />
        </Field>
        <Field label="Ngày bắt đầu" required hint="dd/MM/yyyy">
          <TextInput
            type="date"
            value={values.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Ngày kết thúc" required hint="dd/MM/yyyy">
          <TextInput
            type="date"
            value={values.endDate}
            min={values.startDate || undefined}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </Field>
      </div>

      {/* Auto-computed summary */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2.5 text-[12px]">
        <Computed label="Tổng số ngày" value={days != null ? `${days} ngày` : "—"} />
        <Computed label="Tổng số buổi" value={`${count} buổi`} />
        <Computed
          label="Giá mỗi buổi"
          value={
            Number(values.price) > 0 && perSession != null
              ? `${formatVND(Number(values.price))} / ${count} buổi = ${formatVND(perSession)}/buổi`
              : "—"
          }
          wide
        />
      </div>
    </SectionCard>
  );
}

function Computed({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "w-full sm:w-auto")}>
      <span className="text-on-surface-variant">{label}: </span>
      <span className="font-semibold tabular-nums text-on-surface">{value}</span>
    </div>
  );
}

// ── Section 3: per-session defaults ──────────────────────────────────────────

function DefaultSessionSection({
  values,
  set,
}: {
  values: FormState;
  set: (patch: Partial<FormState>) => void;
}) {
  return (
    <SectionCard
      step={3}
      title="Thiết lập mặc định cho buổi học"
      description="Áp dụng cho các buổi mới tạo. Bạn vẫn chỉnh được từng buổi sau."
      icon={<Settings2 size={16} />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Hình thức mặc định">
          <ModeToggle
            isOnline={values.defaultIsOnline}
            onChange={(o) => set({ defaultIsOnline: o })}
          />
        </Field>
        <Field label="Số học viên tối đa">
          <TextInput
            type="number"
            min={1}
            value={values.defaultMaxParticipants}
            onChange={(e) => set({ defaultMaxParticipants: e.target.value })}
          />
        </Field>
        <Field label="Thời lượng mỗi buổi">
          <Select
            value={String(values.defaultDurationMinutes)}
            onChange={(e) => set({ defaultDurationMinutes: Number(e.target.value) })}
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} phút
              </option>
            ))}
          </Select>
        </Field>
        {values.defaultIsOnline ? (
          <Field label="Link học mặc định" className="sm:col-span-3">
            <TextInput
              type="url"
              value={values.defaultMeetingUrl}
              onChange={(e) => set({ defaultMeetingUrl: e.target.value })}
              placeholder="https://meet.google.com/…"
            />
          </Field>
        ) : (
          <Field label="Địa điểm / sân mặc định" className="sm:col-span-3">
            <TextInput
              value={values.defaultLocation}
              onChange={(e) => set({ defaultLocation: e.target.value.slice(0, 255) })}
              placeholder="VD: Sân cầu lông Sky"
            />
          </Field>
        )}
      </div>
    </SectionCard>
  );
}

// ── Section 5: learner-facing preview ────────────────────────────────────────

function PackagePreviewCard({
  values,
  sportName,
}: {
  values: FormState;
  sportName: string;
}) {
  // Reuse the schedule-derived helpers by shaping a package-like object.
  const pkgLike = useMemo(() => {
    const sessions = values.sessions
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => ({
        sessionNumber: 0,
        startTime: combineLocalISO(s.date, s.startTime),
        endTime: combineLocalISO(s.date, s.endTime),
        isOnline: s.isOnline,
        location: s.location,
        meetingUrl: s.meetingUrl,
        maxParticipants: Number(s.maxParticipants) || null,
        note: s.note,
      }));
    return {
      price: Number(values.price) || 0,
      sessionCount: sessions.length,
      durationDays: null,
      startDate: values.startDate ? combineLocalISO(values.startDate, "00:00") : null,
      endDate: values.endDate ? combineLocalISO(values.endDate, "23:59") : null,
      location: values.defaultLocation,
      isOnline: values.defaultIsOnline,
      sessions,
    };
  }, [values]);

  const count = pkgLike.sessionCount;
  const perSession = calculatePricePerSession(pkgLike.price, count);
  const next = getNextSession(pkgLike);
  const mode = getDeliveryMode(pkgLike);
  const location = getMainLocation(pkgLike);
  const modeText = mode === "mixed" ? "Trực tiếp & trực tuyến" : mode === "online" ? "Trực tuyến" : "Trực tiếp";

  return (
    <div className="rounded-[12px] border border-primary/20 bg-primary/[0.03] p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-[14px] font-bold text-on-surface">
            {values.title.trim() || "Tên gói tập"}
          </h4>
          <p className="mt-0.5 text-[12px] font-medium text-primary">
            {sportName || NOT_SET} · {modeText}
            {levelLabel(values.level) && ` · ${levelLabel(values.level)}`}
            {goalTypeLabel(values.goalType) && ` · ${goalTypeLabel(values.goalType)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-bold tabular-nums text-primary">
            {Number(values.price) > 0 ? formatVND(Number(values.price)) : "—"}
          </p>
          {perSession != null && (
            <p className="text-[11px] tabular-nums text-on-surface-variant">
              {formatVND(perSession)} / buổi
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] sm:grid-cols-3">
        <Preview label="Số buổi" value={`${count} buổi`} />
        <Preview
          label="Thời gian"
          value={
            values.startDate || values.endDate
              ? `${formatDateVN(pkgLike.startDate)} – ${formatDateVN(pkgLike.endDate)}`
              : NOT_SET
          }
        />
        <Preview
          label="Lịch gần nhất"
          value={
            next
              ? `${weekdayShort(isoToDate(next.startTime))} ${formatDateVN(next.startTime)} · ${formatTimeVN(next.startTime)}`
              : NOT_SET
          }
        />
        <Preview label="Hình thức" value={modeText} />
        <Preview
          label="Địa điểm chính"
          value={mode === "online" ? "Học từ xa" : location ?? NOT_SET}
        />
        <Preview label="Trình độ" value={levelLabel(values.level) || "Không chỉ định"} />
      </div>
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-semibold uppercase tracking-wide text-on-surface-variant/70">
        {label}
      </p>
      <p className="truncate text-[12.5px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}

// ── Initial state ────────────────────────────────────────────────────────────

function initialState(
  initial: TrainingPackageResponse | null,
  sports: SportOption[],
): FormState {
  const defaultIsOnline = initial?.isOnline ?? false;
  const defaultLocation = initial?.location ?? "";
  const level = initial?.level ?? "";

  const sessions: SessionDraft[] =
    initial?.sessions && initial.sessions.length > 0
      ? [...initial.sessions]
          .sort((a, b) => a.sessionNumber - b.sessionNumber)
          .map((s) => ({
            id: newSessionId(),
            date: isoToDate(s.startTime),
            startTime: isoToTime(s.startTime),
            endTime: isoToTime(s.endTime),
            isOnline: s.isOnline,
            location: s.location ?? "",
            meetingUrl: s.meetingUrl ?? "",
            maxParticipants: String(s.maxParticipants ?? 1),
            note: s.note ?? "",
            level: s.level ?? "",
          }))
      : [];

  return {
    sportId: initial ? String(initial.sportId) : sports[0] ? String(sports[0].id) : "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial ? String(initial.price) : "",
    startDate: isoToDate(initial?.startDate),
    endDate: isoToDate(initial?.endDate),
    level,
    goalType: initial?.goalType ?? "",
    defaultLocation,
    defaultIsOnline,
    defaultMeetingUrl: "",
    defaultMaxParticipants: "4",
    defaultDurationMinutes: 90,
    sessions,
  };
}
