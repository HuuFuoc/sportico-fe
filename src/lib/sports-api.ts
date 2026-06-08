// ============================================================================
// Sports source for coach onboarding (sportIds) and training packages (sportId).
//
// BACKEND STATUS (verified 2026-05-30 from sportico-platform source):
//   • SportsController  — only exposes admin POST /api/sports (create).
//   • ISportRepository  — no GetAllAsync / GetActiveAsync method.
//   • ISportService     — only CreateAsync.
//   • Migrations        — NO seed data for Sports table.
//
// Result: there is NO public GET /api/sports endpoint and never will be until
// the backend team adds one. The stable local constant below IS the current
// production source of truth for the sports catalogue.
//
// TODO(api): when the backend exposes GET /api/sports (or similar), replace
// this entire module with a single callData<SportResponse[]> call and remove
// the fallback constant. For now do NOT derive sports from public training
// packages — that approach is unstable (empty if no published packages exist).
// ============================================================================

import type { SportOption } from "@/lib/types/coach";

/**
 * Stable local sports catalogue.
 *
 * IDs correspond to the admin-created Sport rows in the Azure production DB.
 * If the admin creates sports in a different order, these IDs may drift —
 * update them by inspecting `GET /api/public/training-packages` for the actual
 * sportId values returned alongside sportName.
 *
 * TODO(api): replace with a real GET /api/sports endpoint once the backend
 * exposes one. These IDs are the best-known stable values for the current DB.
 */
export const STABLE_SPORTS: SportOption[] = [
  { id: 1, name: "Cầu lông" },
  { id: 9, name: "Pickleball" },
];

/**
 * Returns the list of selectable sports for dropdowns and multi-selects.
 *
 * Always returns the stable local constant in BOTH mock and live mode — there
 * is no backend endpoint to call. This is synchronous underneath but async for
 * forward-compatibility: when a real endpoint lands, change only this body and
 * the rest of the UI remains unchanged.
 */
export async function getSports(): Promise<SportOption[]> {
  return STABLE_SPORTS;
}

/** Find a sport option by id (used to display sport name in list views). */
export function sportById(id: number | null | undefined): SportOption | undefined {
  if (id == null) return undefined;
  return STABLE_SPORTS.find((s) => s.id === id);
}
