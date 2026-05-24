"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { formatCurrency } from "@/lib/utils";
import type { Coach } from "@/types";

/** Authentic coaching action shot — a coach running a live tennis session. */
const HERO_ACTION_SHOT =
  "https://images.unsplash.com/photo-1634840542403-1a9b1067aaa0?w=1100&q=80&auto=format&fit=crop";

const PREVIEW_MATCH = 98;

/**
 * Glass product-preview for the hero — a single self-contained coach card
 * plus one floating analytics chip. Animated progress, sparkle, hover shine.
 */
export function HeroPreview({ coach }: { coach: Coach }) {
  const reduce = useReducedMotion();
  // Always start at 0 on SSR + first client render — `useReducedMotion()`
  // returns null on the server which would otherwise mismatch the client.
  const [match, setMatch] = useState(0);

  useEffect(() => {
    if (reduce) {
      setMatch(PREVIEW_MATCH);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setMatch(Math.round(eased * PREVIEW_MATCH));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const id = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [reduce]);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* soft brand glow — animated */}
      <motion.div
        aria-hidden
        animate={
          reduce
            ? {}
            : {
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.04, 1],
              }
        }
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-indigo-300/40 via-violet-300/30 to-fuchsia-300/15 blur-2xl"
      />

      {/* main glass card */}
      <div className="group relative overflow-hidden rounded-[22px] border border-white/70 bg-white/80 shadow-[0_30px_70px_-25px_rgba(53,37,205,0.45)] backdrop-blur-xl transition-shadow hover:shadow-[0_40px_85px_-25px_rgba(53,37,205,0.6)]">
        {/* shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.45)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-full"
        />

        {/* action shot */}
        <div className="relative aspect-[16/11] overflow-hidden">
          <motion.img
            src={HERO_ACTION_SHOT}
            alt="A coach running a training session with an athlete on a tennis court"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-on-surface backdrop-blur"
          >
            <MaterialIcon
              name="verified"
              filled
              size={13}
              className="text-primary"
            />
            Verified coach
          </motion.span>

          {/* Live availability pill */}
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.75, duration: 0.4 }}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
          >
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-white animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Available
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-white">
                {coach.name}
              </p>
              <p className="truncate text-[12px] text-white/85">
                {coach.headline}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[12px] font-semibold text-on-surface backdrop-blur">
              <MaterialIcon
                name="star"
                filled
                size={13}
                className="text-amber-500"
              />
              {coach.rating.toFixed(1)}
            </span>
          </motion.div>
        </div>

        {/* body */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-[12px] border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-violet-500/[0.05] p-3">
            {/* sparkle */}
            <motion.span
              aria-hidden
              animate={
                reduce
                  ? {}
                  : {
                      opacity: [0, 1, 0],
                      x: [-20, 80],
                    }
              }
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5,
              }}
              className="pointer-events-none absolute right-3 top-2 inline-flex"
            >
              <MaterialIcon
                name="auto_awesome"
                filled
                size={12}
                className="text-violet-500/70"
              />
            </motion.span>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                <motion.span
                  animate={
                    reduce
                      ? {}
                      : {
                          rotate: [0, 12, -8, 0],
                          scale: [1, 1.15, 1],
                        }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex"
                >
                  <MaterialIcon name="auto_awesome" filled size={14} />
                </motion.span>
                AI Match
              </span>
              <span
                className="text-[18px] font-semibold leading-none text-primary tabular-nums"
                style={{ letterSpacing: "-0.02em" }}
              >
                {match}%
              </span>
            </div>

            <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${PREVIEW_MATCH}%` }}
                transition={{
                  duration: reduce ? 0 : 1.5,
                  delay: reduce ? 0 : 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500"
              >
                {/* shimmer inside bar */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.45)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer"
                />
              </motion.div>
            </div>
            <p className="mt-2 text-[12px] text-on-surface-variant">
              Matched to your goals, schedule &amp; training style
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant">
              <MaterialIcon name="sports_tennis" size={16} />
              {coach.sport}
            </span>
            <span className="text-[13px] text-on-surface-variant">
              from{" "}
              <span className="font-semibold text-on-surface">
                {formatCurrency(coach.hourlyRate, coach.currency)}
              </span>
              /hr
            </span>
          </div>
        </div>
      </div>

      {/* floating analytics chip */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="animate-float-y absolute -bottom-7 -left-7 hidden rounded-[16px] border border-white/70 bg-white/85 p-3 pr-4 shadow-[0_18px_44px_-14px_rgba(53,37,205,0.4)] backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary to-violet-500 text-white shadow-[0_6px_14px_-3px_rgba(53,37,205,0.5)]">
            <MaterialIcon name="trending_up" size={20} />
          </div>
          <div>
            <p className="text-[17px] font-semibold leading-none text-on-surface tabular-nums">
              +18%
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              faster progress
            </p>
          </div>
        </div>
      </motion.div>

      {/* second floating chip — bookings */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="animate-float-y-slow absolute -right-4 top-8 hidden rounded-[14px] border border-white/70 bg-white/85 px-3 py-2 shadow-[0_14px_36px_-12px_rgba(53,37,205,0.35)] backdrop-blur-xl md:flex md:items-center md:gap-2"
      >
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <div className="text-[11px] leading-tight">
          <p className="font-semibold text-on-surface tabular-nums">
            12 booked today
          </p>
          <p className="text-on-surface-variant">live activity</p>
        </div>
      </motion.div>
    </div>
  );
}
