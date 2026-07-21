"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

/**
 * Reports one page view per meaningful URL change to POST /api/analytics/pageview.
 *
 * This is the WRITE side of Sportico's own analytics: every
 * /api/admin/analytics/* read endpoint is fed by these beacons. Client-side
 * route changes never reach the server on their own, so without this component
 * the admin dashboard reports nothing.
 *
 * Runs alongside Vercel's <Analytics /> — the two feed different dashboards and
 * neither replaces the other.
 *
 * Renders nothing. Mounted once in the root layout, inside a <Suspense>
 * boundary because useSearchParams() requires one in the App Router.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Last URL reported — guards against duplicate sends from re-renders. */
  const lastSentRef = useRef<string | null>(null);
  /** URL of the previously reported page, used as the in-app referrer. */
  const previousPageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;

    // StrictMode double-invokes effects in dev and re-renders repeat the same
    // URL — only report when the URL actually changed. A reload remounts the
    // component, so it still counts as a fresh view.
    if (lastSentRef.current === currentPath) return;
    lastSentRef.current = currentPath;

    // First view of the visit attributes to the external referrer; later views
    // attribute to the previous in-app page.
    const referrer = previousPageRef.current ?? document.referrer;
    previousPageRef.current = window.location.href;

    // Fired without an AbortController on purpose: cancelling in cleanup would
    // drop the beacon whenever the user navigates again quickly. Failures are
    // swallowed inside api.trackPageView — analytics must never break UX.
    void api.trackPageView({
      path: currentPath,
      title: document.title || undefined,
      referrer: referrer || undefined,
    });
  }, [pathname, searchParams]);

  return null;
}
