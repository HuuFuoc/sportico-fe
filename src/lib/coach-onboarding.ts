// ============================================================================
// Coach registration → role elevation sequence (STEP 3 of the brief).
//
// The access-token JWT bakes roles at issue time, so a freshly-registered coach
// is still "learner" in their current token. After a successful registration we
// MUST: refresh the tokens (new token carries the coach role) → re-read
// /api/auth/me → confirm the coach role is now visible → only then proceed.
//
// We never fake the coach role locally and never rely on a page reload alone.
// ============================================================================

import { registerCoach } from "@/lib/coach-api";
import { refreshTokens } from "@/lib/auth-api";
import { clearAuthTokens } from "@/lib/auth-token";
import { useAuthStore, userIsCoach } from "@/lib/store/useAuthStore";
import { ApiResultError } from "@/lib/api-result";
import type { RegisterCoachRequest } from "@/lib/types/coach";

export type CoachElevationOutcome =
  | { ok: true }
  /** Registered, but the coach role could not be confirmed in this session →
   *  the user must log in again to receive a token with the coach role. */
  | { ok: false; reason: "needs-relogin" };

/**
 * Register as coach (if not already), then refresh + hydrate so the coach role
 * becomes effective. Registration failures (validation, invalid sport, etc.)
 * propagate as {@link ApiResultError} for the caller to display; only the
 * refresh/hydrate stage can yield a `needs-relogin` outcome.
 */
export async function registerCoachAndElevate(
  payload: RegisterCoachRequest,
): Promise<CoachElevationOutcome> {
  // 1. Create the coach profile + grant the coach role server-side.
  try {
    await registerCoach(payload);
  } catch (err) {
    // If a coach profile already exists, the user is already a coach on the
    // server — fall through to refresh + hydrate to make the role effective.
    if (!(err instanceof ApiResultError && err.code === "COACH_PROFILE_ALREADY_EXISTS")) {
      throw err;
    }
  }

  // 2. Rotate tokens so the new access token carries the coach role.
  try {
    await refreshTokens();
  } catch {
    // Refresh helper already cleared tokens on failure; force re-login.
    return { ok: false, reason: "needs-relogin" };
  }

  // 3. Re-read /api/auth/me and hydrate the store with the fresh roles.
  const me = await useAuthStore.getState().hydrate({ force: true });

  // 4. Confirm the coach role is now present.
  if (me && userIsCoach(me)) return { ok: true };

  // Registered but role still not visible — force a clean re-login.
  clearAuthTokens();
  useAuthStore.getState().clear();
  return { ok: false, reason: "needs-relogin" };
}
