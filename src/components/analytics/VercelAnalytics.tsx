"use client";

// ============================================================================
// Vercel Web Analytics with a scrubbing hook.
//
// `<Analytics />` reports the URL it observes, which on /auth/google/callback,
// /verify-email and /reset-password contains a single-use credential. The
// `beforeSend` prop is the supported place to rewrite that — and it is a
// function, so it cannot be passed from the Server Component root layout.
// Hence this thin client wrapper.
// ============================================================================

import { Analytics } from "@vercel/analytics/next";
import { scrubUrl } from "@/lib/analytics-scrub";

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })}
    />
  );
}
