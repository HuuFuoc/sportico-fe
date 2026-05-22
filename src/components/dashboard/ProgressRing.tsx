"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated circular progress ring. The arc draws in once it scrolls into view.
 */
export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  from = "#a5b4fc",
  to = "#7c3aed",
  trackColor = "rgba(124,110,255,0.16)",
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  from?: string;
  to?: string;
  trackColor?: string;
  children?: ReactNode;
  className?: string;
}) {
  const gid = useId();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = size / 2;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: Math.max(0, Math.min(1, value / 100)) }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
