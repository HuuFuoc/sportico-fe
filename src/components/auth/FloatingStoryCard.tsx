"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A single absolutely-positioned card in the auth visual collage. The outer
 * element handles the staggered entrance; the inner element runs a gentle,
 * looping float. Both are disabled under `prefers-reduced-motion`.
 */
export function FloatingStoryCard({
  children,
  className,
  delay = 0,
  float = 8,
}: {
  children: ReactNode;
  /** Absolute positioning + sizing utilities. */
  className?: string;
  /** Entrance + float phase offset, in seconds. */
  delay?: number;
  /** Vertical float amplitude, in px. */
  float?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease: EASE }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -float, 0] }}
        transition={{
          duration: 5 + float / 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
