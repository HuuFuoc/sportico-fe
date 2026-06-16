"use client";

import { useAdvisoryVisible } from "@/lib/hooks/useAdvisoryVisible";
import { AdvisoryWidget } from "@/components/advisory/AdvisoryWidget";

/**
 * Auth gate for the advisory FAB. Mounted ONCE in the root layout so the
 * assistant appears on every page (home, public marketing, learner area) and
 * its conversation persists across all navigation.
 *
 * Visibility (authenticated learner, live mode, post-mount) is decided by
 * `useAdvisoryVisible`, which is also read by the scroll-to-top button so the
 * two fixed bottom-right controls stack instead of overlapping.
 */
export function AdvisoryWidgetGate() {
  return useAdvisoryVisible() ? <AdvisoryWidget /> : null;
}
