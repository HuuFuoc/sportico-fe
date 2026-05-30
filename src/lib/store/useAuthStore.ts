"use client";

// ============================================================================
// Hydrated auth/user store — holds the CurrentUser from GET /api/auth/me, which
// is the AUTHORITATIVE source of the user's roles + profiles.
//
// Why a dedicated store (separate from useAppStore): useAppStore tracks the
// dev/demo role + sidebar UI and is seeded from hard-coded ids. This store holds
// the REAL backend identity so route guards and role checks stop relying on the
// (possibly stale) JWT or hard-coded role. Coach-role checks are case-insensitive.
// ============================================================================

import { create } from "zustand";
import { getCurrentUser } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-token";
import type { CurrentUserResponse } from "@/lib/types/coach";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

/** Case-insensitive role check against the backend roles array. */
export function hasRole(
  user: CurrentUserResponse | null,
  role: string,
): boolean {
  if (!user?.roles) return false;
  const target = role.toLowerCase();
  return user.roles.some((r) => r.toLowerCase() === target);
}

export function userIsCoach(user: CurrentUserResponse | null): boolean {
  return hasRole(user, "coach");
}

export function userIsAdmin(user: CurrentUserResponse | null): boolean {
  return hasRole(user, "admin");
}

interface AuthState {
  user: CurrentUserResponse | null;
  status: AuthStatus;
  /** Replace the user (e.g. immediately after a fresh /me read). */
  setUser: (user: CurrentUserResponse) => void;
  /** Drop the user (logout / failed refresh). */
  clear: () => void;
  /**
   * Load the current user from GET /api/auth/me into the store.
   *  - No token → status `unauthenticated`, returns null.
   *  - Already authenticated and not forced → returns the cached user.
   *  - On failure → status `unauthenticated`, returns null.
   * Concurrent calls share one in-flight request.
   */
  hydrate: (opts?: { force?: boolean }) => Promise<CurrentUserResponse | null>;
}

let inFlight: Promise<CurrentUserResponse | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  setUser: (user) => set({ user, status: "authenticated" }),

  clear: () => {
    inFlight = null;
    set({ user: null, status: "unauthenticated" });
  },

  hydrate: async ({ force = false } = {}) => {
    if (!getAccessToken()) {
      set({ user: null, status: "unauthenticated" });
      return null;
    }
    const { status, user } = get();
    if (!force && status === "authenticated" && user) return user;
    if (inFlight) return inFlight;

    set({ status: "loading" });
    inFlight = (async () => {
      try {
        const me = await getCurrentUser();
        set({ user: me, status: "authenticated" });
        return me;
      } catch {
        set({ user: null, status: "unauthenticated" });
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));
