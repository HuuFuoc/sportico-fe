// ============================================================================
// Auth token store for Bearer-token auth (access + refresh rotation).
//
// The backend returns `{ accessToken, refreshToken, expiresAt }` in the login /
// refresh response body (NOT cookies), and the refresh-token call additionally
// requires the user's `email`. All of it is held here, centrally — pages and
// components must never touch localStorage directly.
//
// Storage: a single JSON blob in `localStorage`, mirrored in memory for
// synchronous, SSR-safe reads. SECURITY NOTE: localStorage is readable by any
// script on the origin (XSS exposure); this is the conventional tradeoff for a
// Bearer-token SPA. If the backend can issue HttpOnly+SameSite cookies instead,
// prefer that and delete this module.
// ============================================================================

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  /** Needed by POST /api/auth/refresh-token. */
  email: string;
}

const STORAGE_KEY = "sportico.auth";

let memory: StoredAuth | null | undefined;

function read(): StoredAuth | null {
  if (memory !== undefined) return memory;
  if (typeof window === "undefined") {
    memory = null;
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    memory = null;
  }
  return memory;
}

/** Persist the full token set (replaces any previous one). */
export function setAuthTokens(tokens: StoredAuth): void {
  memory = tokens;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

/** Discard all tokens (logout / failed refresh). */
export function clearAuthTokens(): void {
  memory = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Current access token, or null. SSR-safe. Read by `apiFetch`. */
export function getAccessToken(): string | null {
  return read()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return read()?.refreshToken ?? null;
}

export function getAuthEmail(): string | null {
  return read()?.email ?? null;
}

export function getTokenExpiry(): string | null {
  return read()?.expiresAt ?? null;
}
