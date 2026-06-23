"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Right-panel ambient wash for the auth split.
 *
 * The left panel paints its own opaque athlete-hero scene, so this layer
 * only governs the slate backdrop the form sits on. Palette is brand-aligned
 * (indigo/violet) to match the landing hero glow blobs. Pointer-events
 * disabled so it never blocks the form.
 */
export function AuthBackground() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Base wash — slate with subtle brand-tint on the right half */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_95%_-5%,#EEF2FF_0%,transparent_55%),radial-gradient(ellipse_55%_45%_at_100%_100%,#F5F3FF_0%,transparent_55%)]" />

      {/* Soft indigo orb — top-right */}
      <motion.div
        animate={{
          x: [0, -18, 12, 0],
          y: [0, -14, 10, 0],
        }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 24, repeat: Infinity, ease: "easeInOut" }
        }
        className="absolute -right-40 top-[6%] h-[440px] w-[440px] rounded-full bg-indigo-200/45 blur-[160px]"
      />

      {/* Soft violet orb — bottom-right */}
      <motion.div
        animate={{
          x: [0, 18, -10, 0],
          y: [0, 14, -8, 0],
        }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 28, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
        }
        className="absolute -right-32 bottom-[6%] h-[420px] w-[420px] rounded-full bg-violet-200/40 blur-[160px]"
      />
    </div>
  );
}
