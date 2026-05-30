"use client";

// ============================================================================
// App bootstrap: when a token already exists (returning visit / refreshed tab),
// read GET /api/auth/me once so the auth store knows the user's real roles
// before any route guard runs. No-op in mock mode and when signed out.
// ============================================================================

import { useEffect } from "react";
import { isMockMode } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/store/useAuthStore";

export function AuthBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (isMockMode()) return;
    if (!getAccessToken()) return;
    void hydrate();
  }, [hydrate]);

  return null;
}
