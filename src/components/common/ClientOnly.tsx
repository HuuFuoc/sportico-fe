"use client";

import { useEffect, useState } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  /** Placeholder shown during SSR / before hydration. */
  fallback?: React.ReactNode;
}

/**
 * Renders children only after client mount. Useful for libraries that need
 * the actual DOM dimensions (e.g. recharts ResponsiveContainer) — avoids the
 * "width(-1) and height(-1)" warning during static generation.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
