"use client";

// ============================================================================
// CoachGuard — route gate for all /coach/* pages.
//
// ── LIVE API MODE (NEXT_PUBLIC_API_BASE_URL is set) ─────────────────────────
//
//  Guard logic (enforced — cannot be bypassed):
//   1. No stored token         → redirect /login immediately.
//   2. Token exists, store idle → hydrate from GET /api/auth/me (the
//                                 authoritative role source).
//   3. Hydration loading       → show neutral spinner.
//   4. Hydration failed /
//      status = unauthenticated → redirect /login.
//   5. User is coach
//      (roles includes "coach", case-insensitive):
//      • On /coach/onboarding   → redirect /coach/dashboard (already a coach).
//      • Anywhere else          → allow.
//   6. User is NOT coach:
//      • On /coach/onboarding   → allow (this is the enrollment page).
//      • Anywhere else          → redirect /coach/onboarding.
//
//  A freshly-registered coach is elevated BEFORE reaching this guard via
//  `registerCoachAndElevate` (coach-onboarding.ts), which calls
//  refreshTokens() + /api/auth/me and updates the store. By the time the
//  browser navigates here the store already contains the coach role, so the
//  guard never blocks a newly-promoted user.
//
//  Hard rules:
//   • The guard NEVER relies on a hard-coded role or a stale JWT claim.
//   • The guard NEVER silently allows a non-coach into coach-only pages.
//   • The guard NEVER fakes the coach role locally.
//
// ── MOCK / DEMO MODE (NEXT_PUBLIC_API_BASE_URL is unset) ────────────────────
//
//  The guard is fully bypassed. There is no real backend, no Bearer token, and
//  no /api/auth/me to call. Every page renders directly using mock fixtures and
//  the dev RoleSwitcher. This passthrough exists solely so:
//   • `pnpm build` / SSG can prerender all /coach routes without a backend.
//   • The demo app stays navigable for design review without credentials.
//
//  Mock passthrough MUST NOT appear in live (production) deployments. It is
//  conditional on `isMockMode()` which returns false whenever
//  NEXT_PUBLIC_API_BASE_URL is set.
// ============================================================================

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore, userIsCoach } from "@/lib/store/useAuthStore";
import { LoadingState } from "@/components/common/AsyncStates";

const ONBOARDING_PATH = "/onboarding";
const COACH_HOME = "/coach/dashboard";

export function CoachGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  const isOnboarding = pathname === ONBOARDING_PATH;

  // ── LIVE MODE guard ──────────────────────────────────────────────────────
  useEffect(() => {
    // Mock/demo mode: guard is inactive — see header comment.
    if (isMockMode()) return;

    // Rule 1: no token → go to login.
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    // Rule 2: token present but store not yet loaded → hydrate /api/auth/me.
    if (status === "idle") {
      void hydrate();
      return;
    }

    // Rule 3: hydration in progress → wait (the spinner renders below).
    if (status === "loading") return;

    // Rule 4: hydration failed → go to login.
    // Exception: if a token exists and status is "unauthenticated", this may be
    // stale state from a previous clear(). Re-hydrate before giving up so a
    // freshly-logged-in coach is not bounced back to /login.
    if (status === "unauthenticated") {
      if (getAccessToken()) {
        void hydrate({ force: true });
        return;
      }
      router.replace("/login");
      return;
    }

    // Rules 5–6: authenticated — route by coach role.
    const isCoach = userIsCoach(user);

    if (isOnboarding && isCoach) {
      // Already a coach — skip onboarding, go to dashboard.
      router.replace(COACH_HOME);
    } else if (!isOnboarding && !isCoach) {
      // Authenticated but not a coach — send to onboarding.
      router.replace(ONBOARDING_PATH);
    }
    // Otherwise: (onboarding + not coach) or (not onboarding + is coach) → allow.
  }, [status, user, isOnboarding, hydrate, router]);

  // ── MOCK / DEMO MODE passthrough ─────────────────────────────────────────
  if (isMockMode()) {
    // No backend, no real auth. Pass through unconditionally so SSG + demo work.
    return <>{children}</>;
  }

  // ── LIVE MODE render decision ─────────────────────────────────────────────

  if (status === "authenticated") {
    const isCoach = userIsCoach(user);
    // Allow when (onboarding && !isCoach) or (!onboarding && isCoach).
    if (isOnboarding ? !isCoach : isCoach) {
      return <>{children}</>;
    }
  }

  // idle | loading | unauthenticated | pending redirect → neutral screen.
  // This prevents a flash of the underlying page before the redirect fires.
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <LoadingState label="Đang kiểm tra quyền truy cập…" />
    </div>
  );
}
