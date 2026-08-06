// ============================================================================
// Strip credentials out of URLs before they reach an analytics beacon.
//
// Several routes carry a single-use secret in the query string:
//
//   /auth/google/callback?code=…   one-time Google exchange code (~90s)
//   /verify-email?token=…          email verification token
//   /reset-password?token=…        password reset token
//
// Page-view beacons send the URL they observed, so without this the secret
// lands in an analytics store — a place it can be read long after it should
// have died. The callback page strips `?code=` from the address bar itself,
// but the beacon fires from the root layout, ABOVE the page in the tree, so it
// can observe the URL first. Scrubbing has to happen at the beacon.
//
// Denylist rather than allowlist: an unknown-but-harmless param showing up in
// analytics is a nuisance, an unknown-but-secret one is an incident, and the
// names below are the only shapes this app puts secrets in.
// ============================================================================

const SENSITIVE_PARAMS = new Set([
  "code",
  "credential",
  "id_token",
  "idtoken",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "token",
  "state",
]);

const REDACTED = "redacted";

/** Replace every sensitive value with a marker, keeping the key for analysis. */
export function scrubSearchParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of params) {
    out.append(key, SENSITIVE_PARAMS.has(key.toLowerCase()) ? REDACTED : value);
  }
  return out;
}

/** `/path?safe=1&code=redacted` — the form a page-view beacon should report. */
export function scrubPathWithQuery(
  pathname: string,
  params: URLSearchParams,
): string {
  const query = scrubSearchParams(params).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Same treatment for an absolute URL (referrers, Vercel Analytics `url`). */
export function scrubUrl(href: string): string {
  try {
    const url = new URL(href);
    url.search = scrubSearchParams(url.searchParams).toString();
    return url.toString();
  } catch {
    // Not parseable as a URL (e.g. an empty referrer) — nothing to leak.
    return href;
  }
}
