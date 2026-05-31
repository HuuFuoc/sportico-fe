"use client";

// ============================================================================
// LearnerGuard — route gate for all /learner/* pages.
//
// ── LIVE API MODE (NEXT_PUBLIC_API_BASE_URL is set) ─────────────────────────
//
//  1. No stored token         → redirect /login (with ?redirect= return URL).
//  2. Token exists, store idle → hydrate from GET /api/auth/me.
//  3. Hydration loading       → show neutral spinner.
//  4. Hydration failed        → redirect /login.
//  5. Authenticated           → allow any role (learner, coach, admin may all
//                               view learner pages in the current design).
//
// ── MOCK / DEMO MODE (NEXT_PUBLIC_API_BASE_URL unset) ───────────────────────
//
//  Guard is bypassed. All /learner routes render with mock fixtures.
//  This allows `pnpm build` SSG and demo/design review without credentials.
// ============================================================================

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { LoadingState } from "@/components/common/AsyncStates";

export function LearnerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (isMockMode()) return;
    if (!getAccessToken()) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (status === "idle") {
      void hydrate();
    }
  }, [status, router, pathname, hydrate]);

  // Mock mode: passthrough
  if (isMockMode()) return <>{children}</>;

  // No token: redirect in progress — render nothing to avoid flash
  if (!getAccessToken()) return null;

  // Loading auth state
  if (status === "idle" || status === "loading") {
    return <LoadingState label="Đang xác thực…" />;
  }

  // Unauthenticated: redirect already triggered
  if (status === "unauthenticated") return null;

  // Authenticated — allow
  return <>{children}</>;
}
