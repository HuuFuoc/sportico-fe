"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { avatarFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const TESTIMONIAL_AVATARS = [
  avatarFor("learner-1"),
  avatarFor("learner-2"),
  avatarFor("learner-6"),
];

/**
 * Minimal hero — Stripe / Linear style.
 *
 * Logo top-left, short pitch in center, single testimonial near bottom,
 * compliance line at the very bottom. No feature list, no stats grid.
 */
export function AuthHero() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col justify-between p-10 lg:p-14">
      {/* Top: logo + back home */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="Sportico — home"
          className="inline-flex items-center"
        >
          <img
            src="/logo.png"
            alt="Sportico"
            className="h-9 w-auto rounded-[6px]"
          />
        </Link>
        <Link
          href="/"
          className="group hidden items-center gap-1 text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-900 sm:inline-flex"
        >
          Back to site
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Middle: pitch */}
      <div className="my-auto max-w-[440px] py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-violet-700 backdrop-blur"
        >
          <Sparkles size={11} />
          AI-native coaching
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.08, ease: EASE }}
          className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[40px]"
        >
          Train smarter with coaches{" "}
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
            matched to you.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.14, ease: EASE }}
          className="mt-4 max-w-md text-[14.5px] leading-relaxed text-slate-500"
        >
          Sportico reads your goals, schedule and training style — then matches
          you with the right coach in under a minute.
        </motion.p>

        {/* Single testimonial — quiet social proof */}
        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.22, ease: EASE }}
          className="mt-9 rounded-[18px] border border-slate-200 bg-white/60 p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                fill="currentColor"
                strokeWidth={0}
              />
            ))}
          </div>
          <blockquote className="text-[14px] leading-relaxed text-slate-700">
            &ldquo;The match nailed it on the first try. I&apos;ve cut 90
            seconds off my 5K in two months — and I actually look forward to
            every session now.&rdquo;
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-2.5">
            <img
              src={TESTIMONIAL_AVATARS[0]}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
            <div>
              <p className="text-[12.5px] font-semibold text-slate-900">
                Mia Carter
              </p>
              <p className="text-[11.5px] text-slate-500">
                5K runner · Member since 2025
              </p>
            </div>
          </figcaption>
        </motion.figure>
      </div>

      {/* Bottom: trust signals (compliance + social proof) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-[11.5px] text-slate-500"
      >
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {TESTIMONIAL_AVATARS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-5 w-5 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          <span>
            <span className="font-semibold text-slate-900">2,000+</span> athletes
            joined this season
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>SOC 2 · GDPR ready</span>
        </div>
      </motion.div>
    </div>
  );
}
