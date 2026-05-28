// ============================================================================
// Session identity derived from the JWT access token.
//
// The backend login response carries NO user object and there is NO /me
// endpoint, so the current user's id / email / role can only come from the
// access-token JWT claims. This module decodes that token (client-side) and
// exposes a small, SSR-safe `getCurrentUser()` used for post-login routing and
// for "me"-scoped data calls.
//
// Claim names vary by issuer (ASP.NET Identity emits the long schema URIs;
// other setups use short names), so we probe a list of known aliases.
// ============================================================================

import type { Role } from "@/types";
import { getAccessToken, getAuthEmail } from "@/lib/auth-token";

export interface CurrentUser {
  userId: string | null;
  email: string | null;
  role: Role;
}

/** Decode a JWT payload (the middle segment). Returns null if it isn't a JWT. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    // base64url → base64, then decode. atob exists in the browser; on the
    // server we fall back to Buffer.
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join(""),
          )
        : Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const ROLE_CLAIMS = [
  "role",
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];
const ID_CLAIMS = [
  "userId",
  "uid",
  "sub",
  "nameid",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
];
const EMAIL_CLAIMS = [
  "email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];

function firstClaim(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = payload[k];
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Normalize whatever the backend emits ("Coach", "COACH", "admin") to a Role. */
export function normalizeRole(raw: string | null | undefined): Role {
  const r = (raw ?? "").trim().toLowerCase();
  if (r === "coach") return "coach";
  if (r === "admin" || r === "administrator") return "admin";
  return "learner"; // default + explicit "learner"
}

/** Identity of the logged-in user, read from the stored JWT. SSR-safe. */
export function getCurrentUser(): CurrentUser | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) {
    // Opaque (non-JWT) token: we still know the email we logged in with.
    return { userId: null, email: getAuthEmail(), role: "learner" };
  }
  return {
    userId: firstClaim(payload, ID_CLAIMS),
    email: firstClaim(payload, EMAIL_CLAIMS) ?? getAuthEmail(),
    role: normalizeRole(firstClaim(payload, ROLE_CLAIMS)),
  };
}

/** Role of the logged-in user (defaults to "learner"). */
export function getCurrentRole(): Role {
  return getCurrentUser()?.role ?? "learner";
}

/** Current user's id from the token, or null when unauthenticated. */
export function getCurrentUserId(): string | null {
  return getCurrentUser()?.userId ?? null;
}
