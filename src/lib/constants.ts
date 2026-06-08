import type { Sport } from "@/types";

/**
 * Canonical list of sport disciplines.
 *
 * This is frontend reference data tied to the `Sport` union in `@/types` (a TS
 * type cannot be enumerated at runtime, so the runtime list lives here). It is
 * imported directly by filter/select UIs where an async fetch would be overkill
 * for a fixed enum.
 *
 * If the backend should drive the catalogue instead, use `api.fetchSports()` —
 * it returns this same list in mock mode.
 */
export const AVAILABLE_SPORTS: Sport[] = [
  "Badminton",
  "Pickleball",
];

/** Vietnamese display names for each sport discipline. */
export const SPORT_LABEL_VI: Record<Sport, string> = {
  Badminton: "Cầu lông",
  Pickleball: "Pickleball",
  Tennis: "Quần vợt",
  Yoga: "Yoga",
  HIIT: "HIIT",
  Strength: "Sức mạnh",
  Running: "Chạy bộ",
  Swimming: "Bơi lội",
  Boxing: "Quyền anh",
  Pilates: "Pilates",
  Cycling: "Đạp xe",
  Basketball: "Bóng rổ",
  Football: "Bóng đá",
  Golf: "Golf",
  Mindfulness: "Thiền / Mindfulness",
};

/** Returns the Vietnamese label for a sport, or a fallback string when null/missing. */
export function sportLabel(sport: Sport | null | undefined, fallback = "Chưa cập nhật chuyên môn"): string {
  if (!sport) return fallback;
  return SPORT_LABEL_VI[sport] ?? sport;
}
