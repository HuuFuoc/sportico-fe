// ============================================================================
// HTTP layer for the Sportico frontend.
//
// This module knows HOW to talk to the backend: base URL, request/response
// handling, error shaping, and the mock-mode switch. `src/lib/api.ts` (the
// documented swap point) is built on top of it.
// ============================================================================

import { getAccessToken, clearAuthTokens } from "@/lib/auth-token";

/**
 * Base URL of the real backend — e.g. "https://api.sportico.app" or "/api".
 *
 * Read from a PUBLIC env var so it is available in both Server and Client
 * Components. Trailing slashes are trimmed so endpoint paths can start with "/".
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/**
 * MOCK-FALLBACK STRATEGY (intentional — see STEP 3 of the migration brief).
 *
 * When NEXT_PUBLIC_API_BASE_URL is **not** set, every `api.*` method returns
 * the local mock fixtures instead of calling `fetch()`. This is the SAFER
 * choice for this codebase because:
 *
 *   1. There is no backend yet — failing hard would break every page, every
 *      `generateStaticParams`, and the production `next build`.
 *   2. SSG/ISR output stays renderable with deterministic demo data.
 *   3. It gives one obvious switch: set the env var and the whole app starts
 *      hitting the real API — no other code changes required.
 *
 * Missing env var  ⇒ mock mode (dev / demo).
 * Env var present  ⇒ live API mode.
 *
 * We never silently swallow a real-API error — see `apiFetch` below.
 */
export function isMockMode(): boolean {
  return API_BASE_URL === "";
}

/** Thrown for any non-2xx response, network failure, or unparseable payload. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code (0 for network/transport-level errors). */
    readonly status: number,
    /** Parsed error body or underlying cause, when available. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * `credentials` mode. Defaults to "same-origin": this backend authenticates
   * with Bearer tokens, NOT cookies, so we don't send credentials cross-origin.
   * Override per call only if a specific endpoint genuinely needs cookies.
   */
  credentials?: RequestCredentials;
}

/**
 * Typed `fetch` wrapper. Prefixes {@link API_BASE_URL}, negotiates JSON, and
 * converts every failure mode into a thrown {@link ApiError} — it never returns
 * a half-broken value and never swallows errors. Let the error propagate to the
 * nearest error boundary or `useApiResource`.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  if (isMockMode()) {
    // Guard rail: in mock mode, callers must go through `getResource` so the
    // fixture is served. Reaching `apiFetch` here is a programming error.
    throw new ApiError(
      `apiFetch("${path}") was called without NEXT_PUBLIC_API_BASE_URL set. ` +
        `Use getResource() so mock data is served in mock mode.`,
      0,
    );
  }

  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
  const { headers, credentials, body, ...rest } = options;

  // Bearer-token auth: replay the stored access token. A per-call `Authorization`
  // header (e.g. login passing a fresh token) still wins via the later spread.
  const token = getAccessToken();

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: credentials ?? "same-origin",
      headers: {
        Accept: "application/json",
        // Only declare a JSON body when we actually send one.
        ...(body !== undefined && typeof body === "string"
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body,
      ...rest,
    });
  } catch (cause) {
    throw new ApiError(`Network error requesting ${path}`, 0, cause);
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearAuthTokens();
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?session=expired&redirect=${redirect}`;
    }
    throw new ApiError(
      `Request to ${path} failed: ${res.status} ${res.statusText}`,
      res.status,
      await safeParse(res),
    );
  }

  if (res.status === 204) return undefined as T;
  return (await safeParse(res)) as T;
}

/** Parse a response as JSON, falling back to text — never throws. */
async function safeParse(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The resolver every `api.*` method delegates to. In mock mode it returns the
 * provided fixture; otherwise it performs the real request. This is what keeps
 * `@/lib/mock/*` imported in exactly ONE place (`src/lib/api.ts`).
 */
export async function getResource<T>(
  path: string,
  mockFallback: () => T | Promise<T>,
  options?: ApiFetchOptions,
): Promise<T> {
  if (isMockMode()) return mockFallback();
  return apiFetch<T>(path, options);
}
