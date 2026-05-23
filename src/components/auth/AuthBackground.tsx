"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Minimal, bright background — Stripe / Linear style.
 *
 * - Base: very light slate-50 / white wash
 * - 2 soft orbs (violet + cyan), low opacity, slow drift
 * - No animated grid, no sparkles, no conic rings
 *
 * Pointer-events disabled so it never blocks the form.
 */
export function AuthBackground() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Base wash — very subtle pastel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_-10%,#EEF2FF_0%,transparent_60%),radial-gradient(ellipse_60%_50%_at_85%_100%,#E0F2FE_0%,transparent_55%)]" />

      {/* Soft violet orb — top-left, gentle float */}
      <motion.div
        animate={
          reduce
            ? {}
            : {
                x: [0, 24, -12, 0],
                y: [0, -12, 16, 0],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-40 top-[8%] h-[440px] w-[440px] rounded-full bg-violet-300/30 blur-[160px]"
      />

      {/* Soft cyan orb — bottom-right, drift */}
      <motion.div
        animate={
          reduce
            ? {}
            : {
                x: [0, -20, 10, 0],
                y: [0, 16, -10, 0],
              }
        }
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
        className="absolute -right-32 bottom-[5%] h-[420px] w-[420px] rounded-full bg-cyan-200/40 blur-[160px]"
      />
    </div>
  );
}
