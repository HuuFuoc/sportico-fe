// ============================================================================
// Schedule logic for the "Create fixed-schedule package" form.
//
// Pure functions only — no React. The Schedule Builder UI is just a way to
// produce a `SessionDraft[]`; this module generates them from a weekly repeat
// rule, validates the whole form, and maps everything back to the UNCHANGED
// backend payload (`TrainingPackageRequest` with `sessions[]`). The repeat rule
// is a frontend convenience and is NEVER sent to the backend.
// ============================================================================

import { calculatePricePerSession } from "@/lib/training-package-format";
import type {
  TrainingPackageRequest,
  TrainingPackageSessionRequest,
} from "@/lib/types/coach";

// ---- Weekdays ---------------------------------------------------------------

export interface Weekday {
  /** JS Date#getDay() value (0 = Sunday … 6 = Saturday). */
  js: number;
  short: string;
  label: string;
}

/** Display order Mon → Sun (Vietnamese week starts on Monday). */
export const WEEKDAYS: Weekday[] = [
  { js: 1, short: "T2", label: "Thứ 2" },
  { js: 2, short: "T3", label: "Thứ 3" },
  { js: 3, short: "T4", label: "Thứ 4" },
  { js: 4, short: "T5", label: "Thứ 5" },
  { js: 5, short: "T6", label: "Thứ 6" },
  { js: 6, short: "T7", label: "Thứ 7" },
  { js: 0, short: "CN", label: "Chủ nhật" },
];

const JS_TO_SHORT: Record<number, string> = Object.fromEntries(
  WEEKDAYS.map((w) => [w.js, w.short]),
);

/** "2026-07-01" → "T4" (weekday short label). */
export function weekdayShort(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return JS_TO_SHORT[d.getDay()] ?? "";
}

// ---- Types ------------------------------------------------------------------

/** One editable session row. Date + HH:mm are kept split for easy editing. */
export interface SessionDraft {
  /** Stable client id (React key / inline-edit target). */
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isOnline: boolean;
  location: string; // địa điểm / sân
  meetingUrl: string;
  maxParticipants: string;
  note: string;
  level: string;
}

/** Per-session defaults applied to newly created rows. */
export interface DefaultConfig {
  isOnline: boolean;
  location: string;
  meetingUrl: string;
  maxParticipants: string;
  durationMinutes: number;
  level: string;
}

/** Weekly repeat rule used by the auto-generator. */
export interface RepeatConfig {
  weekdays: number[]; // JS getDay() values
  startTime: string;
  endTime: string;
  fromDate: string;
  toDate: string;
  isOnline: boolean;
  location: string;
  meetingUrl: string;
  maxParticipants: string;
  note: string;
}

/** The full set of form values the validator + payload builder read. */
export interface PackageFormValues {
  sportId: string;
  title: string;
  description: string;
  price: string;
  startDate: string;
  endDate: string;
  level: string;
  goalType: string;
  defaultLocation: string;
  defaultIsOnline: boolean;
  sessions: SessionDraft[];
}

// ---- Small helpers ----------------------------------------------------------

let idCounter = 0;
export function newSessionId(): string {
  idCounter += 1;
  return `s_${Date.now().toString(36)}_${idCounter}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → local "YYYY-MM-DD". */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO datetime → local "YYYY-MM-DD". */
export function isoToDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : ymd(d);
}

/** ISO datetime → local "HH:mm". */
export function isoToTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "2026-07-01" + "18:00" → Date (local). */
export function combineLocal(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00`);
}

/** Combined local datetime → ISO (UTC) string for the backend. */
export function combineLocalISO(date: string, time: string): string {
  return combineLocal(date, time).toISOString();
}

/** Minutes between two "HH:mm" on the same day. Null when not computable. */
export function calculateDurationMinutes(
  startTime: string,
  endTime: string,
): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const min = eh * 60 + em - (sh * 60 + sm);
  return min > 0 ? min : null;
}

/** Inclusive day span of the package window (01/07 → 31/07 = 31). */
export function calculatePackageDurationDays(
  startDate: string,
  endDate: string,
): number | null {
  if (!startDate || !endDate) return null;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return days >= 1 ? days : null;
}

export { calculatePricePerSession };

/** Sort ascending by combined start datetime (stable). */
export function sortSessionsByStartTime(sessions: SessionDraft[]): SessionDraft[] {
  return [...sessions].sort(
    (a, b) =>
      combineLocal(a.date, a.startTime).getTime() -
      combineLocal(b.date, b.startTime).getTime(),
  );
}

/** Build a blank manual session row from the per-session defaults. */
export function blankSession(d: DefaultConfig): SessionDraft {
  return {
    id: newSessionId(),
    date: "",
    startTime: "",
    endTime: "",
    isOnline: d.isOnline,
    location: d.isOnline ? "" : d.location,
    meetingUrl: d.isOnline ? d.meetingUrl : "",
    maxParticipants: d.maxParticipants || "1",
    note: "",
    level: d.level,
  };
}

// ---- Weekly generator -------------------------------------------------------

/**
 * Expand a weekly repeat rule into concrete sessions, one per matching weekday
 * in [fromDate, toDate]. Returns them sorted; numbering is by position.
 */
export function generateWeeklySessions(repeat: RepeatConfig): SessionDraft[] {
  const from = new Date(`${repeat.fromDate}T00:00:00`);
  const to = new Date(`${repeat.toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  if (from > to) return [];

  const out: SessionDraft[] = [];
  const cursor = new Date(from);
  // Hard cap to avoid pathological loops (≈1 year of daily sessions).
  let guard = 0;
  while (cursor <= to && guard < 400) {
    guard += 1;
    if (repeat.weekdays.includes(cursor.getDay())) {
      out.push({
        id: newSessionId(),
        date: ymd(cursor),
        startTime: repeat.startTime,
        endTime: repeat.endTime,
        isOnline: repeat.isOnline,
        location: repeat.isOnline ? "" : repeat.location,
        meetingUrl: repeat.isOnline ? repeat.meetingUrl : "",
        maxParticipants: repeat.maxParticipants || "1",
        note: repeat.note,
        level: "",
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sortSessionsByStartTime(out);
}

// ---- Validation -------------------------------------------------------------

/** Validate the repeat rule before generating. Returns a VN error or null. */
export function validateRepeatConfig(repeat: RepeatConfig): string | null {
  if (repeat.weekdays.length === 0)
    return "Vui lòng chọn ít nhất một ngày trong tuần.";
  if (!repeat.fromDate || !repeat.toDate)
    return "Vui lòng chọn khoảng ngày áp dụng cho lịch lặp.";
  if (new Date(`${repeat.toDate}T00:00:00`) < new Date(`${repeat.fromDate}T00:00:00`))
    return "Ngày kết thúc của lịch lặp phải sau ngày bắt đầu.";
  if (!repeat.startTime || !repeat.endTime)
    return "Vui lòng nhập giờ bắt đầu và giờ kết thúc cho lịch lặp.";
  if (calculateDurationMinutes(repeat.startTime, repeat.endTime) == null)
    return "Giờ kết thúc phải sau giờ bắt đầu.";
  return null;
}

/** Count sessions that fall outside the package window (for live warnings). */
export function sessionsOutOfRange(values: PackageFormValues): number {
  const { startDate, endDate, sessions } = values;
  if (!startDate || !endDate) return 0;
  return sessions.filter((s) => s.date && (s.date < startDate || s.date > endDate))
    .length;
}

/**
 * Full form validation. Returns the FIRST Vietnamese error message, or null
 * when the form is ready to submit. Mirrors every backend rule so the coach
 * gets immediate feedback.
 */
export function validatePackageForm(values: PackageFormValues): string | null {
  const { sportId, title, description, price, startDate, endDate, sessions } =
    values;

  if (!Number(sportId)) return "Vui lòng chọn môn thể thao.";
  if (!title.trim()) return "Vui lòng nhập tên gói tập.";
  if (title.trim().length > 200) return "Tên gói tập tối đa 200 ký tự.";
  if (description.length > 3000) return "Mô tả tối đa 3000 ký tự.";

  const p = Number(price);
  if (!Number.isInteger(p) || p <= 0)
    return "Giá gói phải là số nguyên dương.";

  if (!startDate) return "Vui lòng chọn ngày bắt đầu.";
  if (!endDate) return "Vui lòng chọn ngày kết thúc.";
  if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`))
    return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";

  if (sessions.length === 0)
    return "Vui lòng thêm ít nhất một buổi học cho gói tập.";

  const sorted = sortSessionsByStartTime(sessions);
  const intervals: { start: number; end: number; n: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const n = i + 1;
    if (!s.date) return `Buổi ${n}: vui lòng chọn ngày học.`;
    if (!s.startTime) return `Buổi ${n}: vui lòng nhập giờ bắt đầu.`;
    if (!s.endTime) return `Buổi ${n}: vui lòng nhập giờ kết thúc.`;
    if (calculateDurationMinutes(s.startTime, s.endTime) == null)
      return `Buổi ${n}: giờ kết thúc phải sau giờ bắt đầu.`;
    if (s.date < startDate || s.date > endDate)
      return `Buổi ${n} (${s.date.split("-").reverse().join("/")}) nằm ngoài thời gian của gói tập.`;
    const mp = Number(s.maxParticipants);
    if (!Number.isInteger(mp) || mp <= 0)
      return `Buổi ${n}: số học viên tối đa phải lớn hơn 0.`;
    if (!s.isOnline && !s.location.trim())
      return `Buổi ${n}: buổi trực tiếp cần có địa điểm hoặc sân tập.`;
    const start = combineLocal(s.date, s.startTime).getTime();
    const end = combineLocal(s.date, s.endTime).getTime();
    intervals.push({ start, end, n });
  }

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i].start < intervals[i - 1].end) {
      return `Buổi ${intervals[i - 1].n} và buổi ${intervals[i].n} bị trùng giờ, vui lòng kiểm tra lại.`;
    }
  }
  return null;
}

// ---- Payload ----------------------------------------------------------------

/**
 * Map the form values to the UNCHANGED backend request. Sessions are sorted and
 * numbered 1..N; the repeat rule never leaves the frontend.
 */
export function buildPackagePayload(
  values: PackageFormValues,
): TrainingPackageRequest {
  const sorted = sortSessionsByStartTime(values.sessions);
  const sessions: TrainingPackageSessionRequest[] = sorted.map((s, i) => ({
    sessionNumber: i + 1,
    startTime: combineLocalISO(s.date, s.startTime),
    endTime: combineLocalISO(s.date, s.endTime),
    level: s.level.trim() || undefined,
    maxParticipants: Number(s.maxParticipants),
    isOnline: s.isOnline,
    location: s.isOnline ? undefined : s.location.trim() || undefined,
    meetingUrl: s.isOnline ? s.meetingUrl.trim() || null : null,
    note: s.note.trim() || undefined,
  }));

  return {
    sportId: Number(values.sportId),
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    price: Number(values.price),
    sessionCount: sessions.length,
    // Backend derives durationDays from this window.
    startDate: new Date(`${values.startDate}T00:00:00`).toISOString(),
    endDate: new Date(`${values.endDate}T23:59:59`).toISOString(),
    location: values.defaultLocation.trim() || undefined,
    isOnline: values.defaultIsOnline,
    level: values.level.trim() || undefined,
    goalType: values.goalType.trim() || undefined,
    sessions,
  };
}
