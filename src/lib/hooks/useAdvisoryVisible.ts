"use client";

import { useEffect, useState } from "react";
import { useAuthStore, primaryRole } from "@/lib/store/useAuthStore";
import { isMockMode } from "@/lib/api-client";

/**
 * True when the advisory FAB is on screen: live mode, after client mount, and
 * the signed-in account is a learner. Single source of truth shared by the FAB
 * gate (`AdvisoryWidgetGate`) and any other fixed bottom-right control that must
 * stack above it (e.g. the scroll-to-top button) so they never overlap.
 */
export function useAdvisoryVisible(): boolean {
  const [mounted, setMounted] = useState(false);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => setMounted(true), []);

  if (!mounted) return false;
  if (isMockMode()) return false;
  if (status !== "authenticated") return false;
  return primaryRole(user) === "learner";
}
