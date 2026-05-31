"use client";

// ============================================================================
// SpotlightCard — cursor-following radial gradient inside a card.
//
// Inspired by the ReactBits Spotlight Card pattern. Adds a premium "light
// source follows the cursor" effect to any container. Fully accessible:
// respects prefers-reduced-motion and falls back to a static glow.
//
// Usage:
//   <SpotlightCard className="rounded-[22px] border bg-white">
//     {children}
//   </SpotlightCard>
//
// The component does NOT add layout styles (padding, border-radius, etc.) —
// callers control those via className. Only the radial spotlight overlay is
// injected; it is absolutely-positioned and pointer-events-none so it never
// blocks clicks.
// ============================================================================

import { useRef, useState, useCallback } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Spotlight radius in px. Default 300. */
  radius?: number;
  /** Spotlight colour (CSS colour string). Default indigo/violet blend. */
  color?: string;
}

export function SpotlightCard({
  children,
  className,
  radius = 300,
  color = "rgba(124, 58, 237, 0.12)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999 });
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [reduce],
  );

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      onMouseMove={onMouseMove}
      onMouseEnter={() => !reduce && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {/* Spotlight overlay — rendered AFTER children so it sits on top
          visually, but pointer-events-none so it never blocks clicks.
          No z-index wrapper on children needed. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: visible ? 1 : 0,
          background: `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 70%)`,
        }}
      />
    </div>
  );
}
