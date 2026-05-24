"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Forces window scroll to top on every route change and on hard reload.
 *
 * Next.js App Router does this by default for forward navigations, but
 * a) some browsers restore scroll on reload (we want top instead), and
 * b) client-side navigations sometimes preserve scroll if the new route's
 *    layout reuses the same scroll container.
 *
 * Skips when the URL has a `#hash` — that's an intentional anchor jump.
 */
export function ScrollRestoration() {
  const pathname = usePathname();

  // Disable the browser's built-in scroll restoration once on mount,
  // so refresh / back-forward always lands at the top.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Scroll to top whenever the pathname changes — unless a hash anchor
  // is present in the URL (intentional anchor jump).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
