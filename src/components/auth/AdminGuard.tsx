"use client";

// ============================================================================
// AdminGuard — route gate for all /admin/* pages.
//
// ── LIVE API MODE (NEXT_PUBLIC_API_BASE_URL is set) ─────────────────────────
//
//  1. No stored token         → redirect /login (with ?redirect= return URL).
//  2. Token exists, store idle → hydrate from GET /api/auth/me.
//  3. Hydration loading       → show neutral spinner.
//  4. Hydration failed        → redirect /login.
//  5. Authenticated — route by PRIMARY role (admin > coach > learner):
//       • primary "admin"     → allow (the only accounts that belong here).
//       • primary "coach"     → redirect /coach/dashboard.
//       • primary "learner"   → redirect /learner/bookings.
//       • primary null        → unknown role, never render admin → /login.
//
//  Same contract as LearnerGuard / CoachGuard: the section is decided by
//  `primaryRole(user)` (the authoritative GET /api/auth/me roles), never by a
//  hard-coded role, the route, the JWT alone, or email/name. /admin/* had NO
//  guard before, so any signed-in account could open it by typing the URL —
//  this closes that gap without touching the backend.
//
// ── MOCK / DEMO MODE (NEXT_PUBLIC_API_BASE_URL unset) ───────────────────────
//
//  Guard is bypassed. All /admin routes render with mock fixtures.
//  This allows `pnpm build` SSG and demo/design review without credentials.
// ============================================================================

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore, primaryRole } from "@/lib/store/useAuthStore";
import { LoadingState } from "@/components/common/AsyncStates";

// Where to send an authenticated account whose primary role is NOT admin.
const HOME_FOR_NON_ADMIN: Record<"coach" | "learner", string> = {
  coach: "/coach/dashboard",
  learner: "/learner/bookings",
};

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  // `getAccessToken()` reads localStorage — unavailable on the server. Waiting
  // for mount keeps the server render and the client's first render identical
  // (both `null`), avoiding a React hydration mismatch. The real auth check
  // only runs after mount. (Same approach as LearnerGuard.)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isMockMode()) return;
    if (!getAccessToken()) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (status === "idle") {
      void hydrate();
      return;
    }
    if (status === "loading") return;
    // Token present but store says unauthenticated: re-hydrate (force) to
    // resolve state set just before this guard mounted; only give up (→ login)
    // when the token is actually gone.
    if (status === "unauthenticated") {
      if (getAccessToken()) {
        void hydrate({ force: true });
        return;
      }
      router.replace("/login");
      return;
    }
    // Authenticated: only admins belong here. Route everyone else to their own
    // section by primary role (see header comment). Unknown role → /login.
    const primary = primaryRole(user);
    if (primary === "coach" || primary === "learner") {
      router.replace(HOME_FOR_NON_ADMIN[primary]);
    } else if (primary !== "admin") {
      router.replace("/login");
    }
  }, [mounted, status, user, router, pathname, hydrate]);

  // Mock mode: passthrough (env var is static — same on server and client)
  if (isMockMode()) return <>{children}</>;

  // Before hydration: return null to match the server's output.
  if (!mounted) return null;

  // No token: redirect in progress — render nothing to avoid flash
  if (!getAccessToken()) return null;

  // Loading auth state
  if (status === "idle" || status === "loading") {
    return <LoadingState label="Đang kiểm tra quyền truy cập…" />;
  }

  // Unauthenticated: redirect already triggered
  if (status === "unauthenticated") return null;

  // Authenticated but not an admin: a redirect is in flight — render a neutral
  // screen, never the admin UI (no flash for coach/learner accounts).
  if (primaryRole(user) !== "admin") {
    return <LoadingState label="Đang chuyển hướng…" />;
  }

  // Authenticated admin — allow
  return <>{children}</>;
}
