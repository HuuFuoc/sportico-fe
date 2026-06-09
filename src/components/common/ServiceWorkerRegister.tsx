"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once the page is idle. Production-only: a Service Worker
 * caching _next/static during `next dev` (Turbopack) causes stale-asset pain.
 * Use `pnpm build && pnpm start` to test the PWA locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("[SW] registration failed:", err));
    };

    // Defer until after load so it never competes with first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
