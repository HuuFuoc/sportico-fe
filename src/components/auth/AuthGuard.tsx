"use client";

// ============================================================================
// AuthGuard — route gate for pages that require ANY signed-in account
// (community posting, chat, blocked-users settings). Unlike LearnerGuard /
// CoachGuard / AdminGuard, it does not care which role owns the account —
// community and chat are available to learners, coaches and admins alike.
//
// Same contract as the role guards: waits for mount before reading
// localStorage (avoids an SSR/client hydration mismatch), hydrates the auth
// store from GET /api/auth/me when idle, and redirects to /login with a
// `redirect=` return path when there is no token.
//
// Mock mode passes through untouched, same as the role guards.
// ============================================================================

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { LoadingState } from "@/components/common/AsyncStates";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

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
    if (status === "unauthenticated") {
      void hydrate({ force: true });
    }
  }, [mounted, status, router, pathname, hydrate]);

  if (isMockMode()) return <>{children}</>;
  if (!mounted) return null;
  if (!getAccessToken()) return null;

  if (status === "idle" || status === "loading") {
    return <LoadingState label="Đang xác thực…" />;
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
