// ============================================================================
// Display/derive helpers for fixed-schedule training packages.
//
// Single source of truth for the math + formatting the learner-facing card and
// detail modal need, so price-per-session / duration / slot logic is never
// duplicated. Operates on structural shapes so both the coach response
// (`TrainingPackageResponse`) and the public response
// (`PublicCoachTrainingPackageResponse`) can be passed in directly.
//
// Rule: NEVER fabricate package data. When a value is missing we derive it from
// the real fixed schedule, fall back to the package field, or return
// "Chưa cập nhật" — never a hardcoded demo value.
// ============================================================================

export const NOT_SET = "Chưa cập nhật";

/** Minimal structural shape of one fixed-schedule session. */
export interface SessionLike {
  sessionNumber: number;
  startTime: string;
  endTime: string;
  isOnline: boolean;
  location?: string | null;
  meetingUrl?: string | null;
  note?: string | null;
  level?: string | null;
  maxParticipants?: number | null;
  remainingParticipants?: number | null;
  status?: string | null;
}

/** Minimal structural shape of a training package. */
export interface PackageLike {
  price: number;
  sessionCount: number;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  isOnline: boolean;
  sessions?: SessionLike[] | null;
}

// ---- Money ------------------------------------------------------------------

/** 1200000 → "1.200.000đ". Missing → "Chưa cập nhật". */
export function formatVND(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return NOT_SET;
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + "đ";
}

/** Price per session = total / sessionCount, rounded. Null when not computable. */
export function calculatePricePerSession(
  totalPrice?: number | null,
  sessionCount?: number | null,
): number | null {
  if (totalPrice == null || !sessionCount || sessionCount <= 0) return null;
  return Math.round(totalPrice / sessionCount);
}

// ---- Date / time ------------------------------------------------------------

function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO → "dd/MM/yyyy". Missing → "Chưa cập nhật". */
export function formatDateVN(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return NOT_SET;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** ISO → "dd/MM" (compact, no year). Missing → "Chưa cập nhật". */
export function formatDateShortVN(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return NOT_SET;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/** ISO → "HH:mm". Missing → "—". */
export function formatTimeVN(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return "—";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** ISO → "dd/MM/yyyy HH:mm". Missing → "Chưa cập nhật". */
export function formatDateTimeVN(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return NOT_SET;
  return `${formatDateVN(iso)} ${formatTimeVN(iso)}`;
}

/** Inclusive day count between two dates. Prefer backend durationDays. */
export function calculateDurationDays(
  startDate?: string | null,
  endDate?: string | null,
): number | null {
  const s = toDate(startDate);
  const e = toDate(endDate);
  if (!s || !e) return null;
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return Math.max(1, days);
}

/** Session length in minutes. Null when not computable. */
export function calculateSessionDuration(
  startTime?: string | null,
  endTime?: string | null,
): number | null {
  const s = toDate(startTime);
  const e = toDate(endTime);
  if (!s || !e) return null;
  const min = Math.round((e.getTime() - s.getTime()) / 60_000);
  return min > 0 ? min : null;
}

/** 90 → "90 phút"; 90+ → "1 giờ 30 phút". Missing → "Chưa cập nhật". */
export function formatDuration(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) return NOT_SET;
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

/** Package window display: "dd/MM/yyyy – dd/MM/yyyy", or duration fallback. */
export function formatPackageWindow(pkg: PackageLike): string {
  if (pkg.startDate || pkg.endDate) {
    return `${formatDateVN(pkg.startDate)} – ${formatDateVN(pkg.endDate)}`;
  }
  const days = pkg.durationDays;
  return days && days > 0 ? `${days} ngày` : NOT_SET;
}

/** Total package length in days. Prefers backend durationDays, then derive. */
export function packageDurationDays(pkg: PackageLike): number | null {
  if (pkg.durationDays && pkg.durationDays > 0) return pkg.durationDays;
  return calculateDurationDays(pkg.startDate, pkg.endDate);
}

// ---- Schedule-derived facts -------------------------------------------------

/** Sessions sorted ascending by start time (defensive copy). */
export function sortedSessions(pkg: PackageLike): SessionLike[] {
  const list = pkg.sessions ?? [];
  return [...list].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

/**
 * The most relevant session to surface: the next upcoming one, or — when all
 * sessions are in the past / no clock context — the earliest session overall.
 */
export function getNextSession(
  pkg: PackageLike,
  now: number = Date.now(),
): SessionLike | undefined {
  const list = sortedSessions(pkg);
  if (list.length === 0) return undefined;
  return list.find((s) => new Date(s.startTime).getTime() >= now) ?? list[0];
}

/**
 * The package's main location: the most common non-empty session location,
 * else the package-level location. Returns undefined when fully online / unset
 * (callers decide the fallback label).
 */
export function getMainLocation(pkg: PackageLike): string | undefined {
  const counts = new Map<string, number>();
  for (const s of pkg.sessions ?? []) {
    const loc = s.location?.trim();
    if (loc) counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [loc, c] of counts) {
    if (c > bestCount) {
      best = loc;
      bestCount = c;
    }
  }
  return best ?? pkg.location?.trim() ?? undefined;
}

/** Overall delivery mode across the schedule. */
export function getDeliveryMode(pkg: PackageLike): "online" | "offline" | "mixed" {
  const list = pkg.sessions ?? [];
  if (list.length === 0) return pkg.isOnline ? "online" : "offline";
  const online = list.filter((s) => s.isOnline).length;
  if (online === 0) return "offline";
  if (online === list.length) return "online";
  return "mixed";
}

/** Min remaining spots across sessions (the binding capacity). Null if no data. */
export function getRemainingSlots(pkg: PackageLike): number | null {
  const vals = (pkg.sessions ?? [])
    .map((s) => s.remainingParticipants)
    .filter((n): n is number => n != null);
  return vals.length ? Math.min(...vals) : null;
}

/** Min max-participants across sessions (per-session capacity). Null if no data. */
export function getMaxParticipants(pkg: PackageLike): number | null {
  const vals = (pkg.sessions ?? [])
    .map((s) => s.maxParticipants)
    .filter((n): n is number => n != null && n > 0);
  return vals.length ? Math.min(...vals) : null;
}

/**
 * Sold out only when EVERY session is unambiguously full/cancelled. Conservative
 * — the backend stays the source of truth and rejects unfillable purchases.
 */
export function isPackageSoldOut(pkg: PackageLike): boolean {
  const list = pkg.sessions ?? [];
  if (list.length === 0) return false;
  return list.every((s) => {
    const status = (s.status ?? "").toLowerCase();
    if (status === "full" || status === "cancelled") return true;
    return s.remainingParticipants != null && s.remainingParticipants <= 0;
  });
}

/** Value, or "Chưa cập nhật" when empty. */
export function displayOr(value?: string | null, fallback = NOT_SET): string {
  const v = value?.trim();
  return v ? v : fallback;
}

// ---- Sport / mode labels (Vietnamese) --------------------------------------

const SPORT_VI: Record<string, string> = {
  badminton: "Cầu lông",
  tennis: "Quần vợt",
  "table tennis": "Bóng bàn",
  pickleball: "Pickleball",
  football: "Bóng đá",
  soccer: "Bóng đá",
  basketball: "Bóng rổ",
  swimming: "Bơi lội",
  volleyball: "Bóng chuyền",
  yoga: "Yoga",
  gym: "Gym",
};

/** Localize a backend sport name; unknown names pass through unchanged. */
export function sportLabelVi(name?: string | null): string {
  const v = name?.trim();
  if (!v) return NOT_SET;
  return SPORT_VI[v.toLowerCase()] ?? v;
}

/** Trực tuyến / Trực tiếp. */
export function modeLabel(isOnline?: boolean | null): string {
  return isOnline ? "Trực tuyến" : "Trực tiếp";
}
