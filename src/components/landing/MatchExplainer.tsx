"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Coach } from "@/types";

const OVERALL = 98;
const EASE = [0.16, 1, 0.3, 1] as const;

const SIGNALS = [
  { label: "Goal alignment", value: 96, note: "Built for plateau breakthroughs" },
  { label: "Schedule fit", value: 94, note: "3 open slots match your week" },
  { label: "Coaching style", value: 99, note: "Tactical · feedback-driven" },
  { label: "Track record", value: 97, note: "211 athletes hit their goal" },
];

/**
 * The AI recommendation explanation panel — a dark glass card that makes the
 * "why" behind a match visible: an animated score ring, weighted signal bars,
 * and a plain-language rationale.
 */
export function MatchExplainer({ coach }: { coach: Coach }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const firstName = coach.name.split(" ")[0];

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-7"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/25 blur-3xl" />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-indigo-200">
          <MaterialIcon name="auto_awesome" filled size={14} />
          AI Match Analysis
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/55">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live scoring
        </span>
      </div>

      {/* score ring + coach */}
      <div className="relative mt-6 flex items-center gap-5">
        <div className="relative h-[116px] w-[116px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="matchRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a5b4fc" />
                <stop offset="100%" stopColor="#d8b4fe" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#matchRing)"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: OVERALL / 100 } : { pathLength: 0 }}
              transition={{ duration: reduce ? 0 : 1.9, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] font-semibold leading-none text-white">
              <AnimatedNumber value={OVERALL} duration={1.9} />%
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Match
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <img
              src={coach.avatarUrl}
              alt={coach.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white/15"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">
                {coach.name}
              </p>
              <p className="truncate text-[12px] text-white/55">
                {coach.headline}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/60">
            <span className="inline-flex items-center gap-1">
              <MaterialIcon
                name="star"
                filled
                size={13}
                className="text-amber-300"
              />
              {coach.rating.toFixed(1)}
            </span>
            <span className="h-3 w-px bg-white/15" />
            <span>{coach.reviewCount} reviews</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <MaterialIcon name="verified" filled size={13} />
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* signal breakdown */}
      <div className="relative mt-6 space-y-3.5">
        {SIGNALS.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-white/85">
                {s.label}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-white">
                {s.value}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                initial={{ width: 0 }}
                animate={inView ? { width: `${s.value}%` } : { width: 0 }}
                transition={{
                  duration: reduce ? 0 : 1.1,
                  delay: reduce ? 0 : 0.35 + i * 0.12,
                  ease: EASE,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/40">{s.note}</p>
          </div>
        ))}
      </div>

      {/* rationale */}
      <div className="relative mt-6 rounded-[14px] border border-indigo-300/15 bg-indigo-400/[0.07] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-200">
          <MaterialIcon name="lightbulb" filled size={14} />
          Why ProCoach picked {firstName}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
          {firstName}&apos;s tactical, feedback-driven coaching maps directly to
          your goal of breaking a plateau — and her open slots line up with the
          way you actually train each week.
        </p>
      </div>
    </div>
  );
}
