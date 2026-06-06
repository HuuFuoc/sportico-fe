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
  /** Drop the user (logout / failed refresh). Invalidates any in-flight hydration. */
  clear: () => void;
  /**
   * Load the current user from GET /api/auth/me into the store.
   *  - No token → status `unauthenticated`, returns null.
   *  - Already authenticated and not forced → returns the cached user.
   *  - force: true → always re-fetches, bypasses the in-flight shortcut,
   *    and ignores any stale concurrent request (safe after login / token refresh).
   *  - On failure → status `unauthenticated`, returns null.
   */
  hydrate: (opts?: { force?: boolean }) => Promise<CurrentUserResponse | null>;
}

// Module-level request tracking. `hydrateVersion` lets us discard responses
// from requests that were initiated before clear() or a forced re-hydration,
// preventing a stale /me from "un-logging-out" the user.
let inFlight: Promise<CurrentUserResponse | null> | null = null;
let hydrateVersion = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  setUser: (user) => set({ user, status: "authenticated" }),

  clear: () => {
    // Increment version before nulling inFlight so any in-flight callback
    // sees version !== hydrateVersion and discards its result without
    // overwriting the freshly-cleared state.
    hydrateVersion++;
    inFlight = null;
    set({ user: null, status: "unauthenticated" });
  },

  hydrate: async ({ force = false } = {}) => {
    if (!getAccessToken()) {
      set({ user: null, status: "unauthenticated" });
      return null;
    }
    const { status, user } = get();
    // Short-circuit only when not forcing and we already have a good result.
    if (!force && status === "authenticated" && user) return user;
    // Reuse an in-flight request only when not forcing. force: true always
    // starts a fresh fetch (important after login / logout / token rotation).
    if (!force && inFlight) return inFlight;

    // Claim a new version slot — any in-flight response from an older version
    // will see version !== hydrateVersion and be discarded.
    const version = ++hydrateVersion;
    inFlight = null; // cancel reference to any previous promise

    set({ status: "loading" });
    inFlight = (async () => {
      try {
        const me = await getCurrentUser();
        // Stale-response guard: discard if a newer hydrate / clear() ran.
        if (version !== hydrateVersion) return null;
        set({ user: me, status: "authenticated" });
        return me;
      } catch {
        if (version !== hydrateVersion) return null;
        set({ user: null, status: "unauthenticated" });
        return null;
      } finally {
        if (version === hydrateVersion) inFlight = null;
      }
    })();
    return inFlight;
  },
}));
