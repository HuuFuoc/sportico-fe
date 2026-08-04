// ============================================================================
// Request helpers for the social surfaces (community / chat / voucher / admin).
//
// Thin layer over `api-result.ts`, which already enforces the two-part success
// check the contract demands (`res.ok` AND `body.isSuccess`) and normalises both
// failure shapes into `ApiResultError` (code, message, type, status, details).
//
// What this module adds:
//   • query-string building that omits null/undefined/"" instead of sending them
//   • `publicInit()` — drops a dead access token on public endpoints
//   • JSON body helpers for POST/PUT/DELETE
//
// Every endpoint in the doc returns HTTP 200 on success, including POST, PUT and
// DELETE. Nothing here may branch on 201/204.
// ============================================================================

import { getAccessToken, getTokenExpiry } from "@/lib/auth-token";
import type { ApiFetchOptions } from "@/lib/api-client";
import { callData, callPage as callPageNullable, callVoid, ApiResultError } from "@/lib/api-result";
import type { PagedResult } from "@/lib/social/types";

export { callData, callVoid, ApiResultError };

/**
 * `callPage` normalised to the social module's `PagedResult<T>` (items always
 * an array). The shared `callPage` in `api-result.ts` keeps `items: T[] | null`
 * for its original (coach/training-package) callers — this wrapper is the
 * social surfaces' own copy so every list hook here can map `.items` without a
 * null check at every call site.
 */
export async function callPage<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<PagedResult<T>> {
  const result = await callPageNullable<T>(path, init);
  return { ...result, items: result.items ?? [] };
}

/** Values a query param may take before serialisation. */
type QueryValue = string | number | boolean | null | undefined;

/**
 * Build a `?a=1&b=2` string. Null, undefined and empty-string values are
 * dropped: sending `Keyword=` makes the backend filter on an empty keyword
 * instead of not filtering at all.
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** True when a stored access token exists and has not expired. */
export function hasLiveAccessToken(): boolean {
  if (!getAccessToken()) return false;
  const expiry = getTokenExpiry();
  if (!expiry) return true; // no expiry recorded — let the server decide
  const at = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(expiry) ? expiry : `${expiry}Z`);
  if (Number.isNaN(at.getTime())) return true;
  return at.getTime() > Date.now();
}

/**
 * Init for a PUBLIC endpoint (community feed, post detail).
 *
 * A valid token is still sent — the backend enriches the response with
 * `currentUserReacted` / `canApply` / `currentUserApplicationStatus` for signed-in
 * viewers. An EXPIRED token is dropped instead of replayed, so a guest browsing
 * public content is never bounced to /login by a 401 they cannot act on.
 */
export function publicInit(extra: ApiFetchOptions = {}): ApiFetchOptions {
  return hasLiveAccessToken() ? extra : { ...extra, omitAuth: true };
}

/** POST with a JSON body. */
export function postJson(body: unknown): ApiFetchOptions {
  return { method: "POST", body: JSON.stringify(body) };
}

/**
 * PUT with a JSON body.
 *
 * A body is ALWAYS sent, even for parameterless transitions like
 * `PUT /voucher-campaigns/{id}/activate`: this backend's `[FromBody]` actions
 * reject a request with no `Content-Type` with a 415.
 */
export function putJson(body: unknown = {}): ApiFetchOptions {
  return { method: "PUT", body: JSON.stringify(body) };
}

/** DELETE without a body. */
export function del(): ApiFetchOptions {
  return { method: "DELETE" };
}
