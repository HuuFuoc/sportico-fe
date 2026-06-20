// ============================================================================
// Image focal-point persistence.
//
// The backend stores cover images as a plain URL string (`coverImageUrl`). It
// has no column for a crop / focal position, so we encode the position INTO the
// URL as a fragment:  `https://…/cover.png#pos=70,40`  (x,y as 0–100 percents).
//
// Why a fragment: the browser never sends the `#…` part to the server when it
// loads an <img>, so it never breaks the image fetch — yet the fragment is part
// of the stored string and therefore visible to EVERY viewer (learner, coach,
// admin) on EVERY device. This replaces the old per-browser localStorage
// approach, which made the same profile look different on each device/role.
// ============================================================================

export interface FocalPos {
  x: number; // 0–100, CSS object-position X %
  y: number; // 0–100, CSS object-position Y %
}

export const DEFAULT_FOCAL: FocalPos = { x: 50, y: 50 };

const POS_RE = /#pos=([\d.]+),([\d.]+)\s*$/;

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

/** Read the focal position encoded in a stored image URL (defaults to center). */
export function parseFocal(url: string | null | undefined): FocalPos {
  if (!url) return DEFAULT_FOCAL;
  const m = url.match(POS_RE);
  if (!m) return DEFAULT_FOCAL;
  return { x: clampPct(parseFloat(m[1])), y: clampPct(parseFloat(m[2])) };
}

/** Strip the focal fragment, returning the bare image URL to use as `src`. */
export function stripFocal(url: string | null | undefined): string {
  return (url ?? "").replace(POS_RE, "");
}

/**
 * Encode a focal position into a clean image URL. A centered position (50/50)
 * produces no fragment, keeping default URLs tidy.
 */
export function withFocal(url: string | null | undefined, pos: FocalPos): string {
  const clean = stripFocal(url);
  if (!clean) return clean;
  const x = Math.round(clampPct(pos.x));
  const y = Math.round(clampPct(pos.y));
  if (x === 50 && y === 50) return clean;
  return `${clean}#pos=${x},${y}`;
}

/** CSS `object-position` value for a focal position. */
export function focalToCss(pos: FocalPos): string {
  return `${pos.x}% ${pos.y}%`;
}
