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

import { useEffect, useState } from "react";
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

  // `getAccessToken()` reads localStorage — unavailable on the server.
  // Without this guard the server renders `null` (no token) while the client's
  // first render sees the real token and renders `<LoadingState>`, causing a
  // React hydration mismatch. By waiting for mount we ensure both the server
  // and the client's initial render return the same output (`null`), and the
  // real auth check only runs after hydration is complete.
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
    }
  }, [mounted, status, router, pathname, hydrate]);

  // Mock mode: passthrough (env var is static — same on server and client)
  if (isMockMode()) return <>{children}</>;

  // Before hydration: return null to match the server's output.
  // (The server can't read localStorage so it also returns null here.)
  if (!mounted) return null;

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
