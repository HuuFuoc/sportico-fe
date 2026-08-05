// ============================================================================
// Avatar utilities — single source of truth for initials + deterministic
// fallback color. No random third-party avatar services (DiceBear, UI
// Avatars, pravatar, randomuser, ...) are used anywhere in the app.
// ============================================================================

/**
 * Derives display initials from a name, falling back to email, falling back
 * to "U". Handles Vietnamese diacritics correctly (JS `toUpperCase()` maps
 * them natively, e.g. "đ" → "Đ").
 *
 *   getUserInitials("Nguyễn Quốc Đoàn", ...) -> "NĐ"  (first + last word)
 *   getUserInitials("Đoàn", ...)             -> "ĐO"  (first 2 chars)
 *   getUserInitials("", "doan@example.com")  -> "D"   (email local-part)
 *   getUserInitials(null, null)              -> "U"
 */
export function getUserInitials(
  name?: string | null,
  email?: string | null,
): string {
  const normalized = (name ?? "").trim().replace(/\s+/g, " ");
  if (normalized) {
    const words = normalized.split(" ").filter(Boolean);
    if (words.length >= 2) {
      const first = words[0]?.[0] ?? "";
      const last = words[words.length - 1]?.[0] ?? "";
      const combined = `${first}${last}`;
      if (combined) return combined.toUpperCase();
    } else if (words.length === 1) {
      const single = words[0].slice(0, 2);
      if (single) return single.toUpperCase();
    }
  }

  const localPart = (email ?? "").trim().split("@")[0];
  if (localPart) return localPart[0].toUpperCase();

  return "U";
}

/** Deterministic tint/text pair for the initials fallback background. */
export interface AvatarPalette {
  bg: string;
  text: string;
}

// Flat tints of the app's existing accent palette (see CLAUDE.md §5b ACCENTS)
// — never random, never gradient, always readable against the light surface.
const AVATAR_PALETTE: AvatarPalette[] = [
  { bg: "bg-primary/12", text: "text-primary" }, // indigo
  { bg: "bg-[#8b5cf6]/12", text: "text-[#7c3aed]" }, // violet
  { bg: "bg-[#10b981]/12", text: "text-[#0d8f66]" }, // emerald
  { bg: "bg-[#f59e0b]/14", text: "text-[#b45309]" }, // amber
  { bg: "bg-[#f43f5e]/12", text: "text-[#e11d48]" }, // rose
  { bg: "bg-[#0ea5e9]/12", text: "text-[#0284c7]" }, // sky
];

/** Same seed always maps to the same palette entry — no `Math.random()`. */
export function getAvatarPalette(seed: string): AvatarPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
