"use client";

import { useEffect, useState } from "react";

/**
 * True once the window is scrolled past `threshold` px. Shared by the
 * scroll-to-top button and the advisory FAB so they agree on when the
 * scroll-to-top control appears (and the FAB stacks above it).
 */
export function useScrolledPast(threshold = 400): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return past;
}
