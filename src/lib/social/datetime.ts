// ============================================================================
// UTC-safe date handling for the social/community/chat surfaces.
//
// The backend stores UTC but serialises SOME timestamps without a trailing `Z`
// (DateTimeKind.Unspecified). `new Date("2026-08-04T09:00:00")` is parsed as
// LOCAL time by every JS engine, which silently shifts every rendered time by
// the viewer's offset (+7h in Vietnam). `parseUtc` closes that hole.
//
// Rule: parse with `parseUtc`, send with `toIsoUtc`, display in Asia/Ho_Chi_Minh.
// ============================================================================

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Parse a backend timestamp as UTC, tolerating a missing `Z` suffix. */
export const parseUtc = (value: string): Date =>
  new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);

/** Same as {@link parseUtc} but tolerates null/empty input. */
export function parseUtcSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseUtc(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Serialise for the backend: always ISO-8601 UTC with an explicit `Z`. */
export const toIsoUtc = (date: Date): string => date.toISOString();

/**
 * Convert a `<input type="datetime-local">` value (which the browser gives us
 * in the viewer's local zone) into ISO UTC for the API.
 */
export function localInputToIsoUtc(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Inverse of {@link localInputToIsoUtc} — fills a datetime-local input. */
export function isoUtcToLocalInput(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dayMonthFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
});

/** "04/08/2026 16:00" — Vietnam time. */
export function formatDateTimeVn(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  return d ? dateTimeFmt.format(d) : "—";
}

/** "04/08/2026" — Vietnam time. */
export function formatDateVn(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  return d ? dateFmt.format(d) : "—";
}

/** "16:00" — Vietnam time. */
export function formatTimeVn(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  return d ? timeFmt.format(d) : "—";
}

/**
 * Chat/feed timestamp: time-only for today, "dd/MM" within the last week,
 * full date beyond that. All in Vietnam time.
 */
export function formatChatTimestamp(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  if (!d) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 24 * 3600_000 && dateFmt.format(d) === dateFmt.format(new Date(now))) {
    return timeFmt.format(d);
  }
  if (diff < 7 * 24 * 3600_000) return dayMonthFmt.format(d);
  return dateFmt.format(d);
}

/** "vừa xong" / "5 phút trước" / "3 giờ trước" / "2 ngày trước" / date. */
export function formatRelativeVn(value: string | null | undefined): string {
  const d = parseUtcSafe(value);
  if (!d) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 0) return dateTimeFmt.format(d);
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return dateFmt.format(d);
}

/** True when the instant is in the past (used for expiry / start-time checks). */
export function isPast(value: string | null | undefined): boolean {
  const d = parseUtcSafe(value);
  return d ? d.getTime() < Date.now() : false;
}
