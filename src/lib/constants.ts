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
  "Tennis",
  "Yoga",
  "HIIT",
  "Strength",
  "Running",
  "Swimming",
  "Boxing",
  "Pilates",
  "Cycling",
  "Basketball",
  "Football",
  "Golf",
  "Mindfulness",
];
