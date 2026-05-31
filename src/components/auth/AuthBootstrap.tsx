"use client";

// ============================================================================
// App bootstrap: when a token already exists (returning visit / refreshed tab),
// read GET /api/auth/me once so the auth store knows the user's real roles
// before any route guard runs. No-op in mock mode and when signed out.
// ============================================================================

import { useEffect } from "react";
import { isMockMode, setRefreshCallback } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { refreshTokens } from "@/lib/auth-api";
import { useAuthStore } from "@/lib/store/useAuthStore";

export function AuthBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    // Register the token-refresh callback once so apiFetch can transparently
    // retry on 401 before redirecting to login.
    if (!isMockMode()) {
      setRefreshCallback(async () => {
        try {
          await refreshTokens();
          return true;
        } catch {
          return false;
        }
      });
    }

    if (isMockMode()) return;
    if (!getAccessToken()) return;
    void hydrate();
  }, [hydrate]);

  return null;
}
