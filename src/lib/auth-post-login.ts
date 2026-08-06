// ============================================================================
// Where a freshly signed-in user lands, and how a pre-login return path
// survives a full-page OAuth round trip.
//
// Shared by the email/password login page and both Google flows so all three
// agree on the destination. Only INTERNAL paths are ever honoured — a
// `?redirect=` (or a stashed return path) that points off-origin is an open
// redirect, so it is dropped rather than followed.
// ============================================================================

import type { Role } from "@/types";

/** Post-login destination for a role. */
export function postLoginHref(role: Role): string {
  if (role === "admin") return "/admin/settings?fromLogin=1";
  if (role === "coach") return "/coach/settings?fromLogin=1";
  return "/";
}

/**
 * Accept a candidate redirect only when it is a same-origin absolute path.
 * Rejects "//evil.com" (protocol-relative) and any absolute URL.
 */
export function safeInternalPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

// ---- Return path across the OAuth redirect round trip ----------------------
//
// Flow B leaves the SPA entirely (browser navigation → backend → Google →
// backend → /auth/google/callback), so the `?redirect=` that the 401
// interceptor put on /login is gone by the time we come back. Stash it.
//
// A path is NOT a secret: sessionStorage is fine here. The one-time exchange
// code is a different matter and is never stored anywhere.

const RETURN_TO_KEY = "sportico.auth.returnTo";

/** Remember where to go after the OAuth round trip. No-op for external paths. */
export function rememberReturnTo(path: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = safeInternalPath(path);
  try {
    if (safe) window.sessionStorage.setItem(RETURN_TO_KEY, safe);
    else window.sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // Private-mode / storage-disabled: fall back to the role default.
  }
}

/** Read and consume the stashed return path (single use). */
export function takeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RETURN_TO_KEY);
    window.sessionStorage.removeItem(RETURN_TO_KEY);
    return safeInternalPath(raw);
  } catch {
    return null;
  }
}

/** The `?redirect=` currently on the URL, if it is safe to follow. */
export function redirectParamFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return safeInternalPath(
    new URLSearchParams(window.location.search).get("redirect"),
  );
}
