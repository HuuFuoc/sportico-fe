"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Heart,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { avatarFor } from "@/lib/utils";
import { FloatingStoryCard } from "./FloatingStoryCard";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Left-hand storytelling panel for the auth split layout — Instagram-style
 * composition (brand, headline, floating social collage), Sportico-branded.
 * Hidden on mobile by the parent layout. No Meta/Instagram assets are used;
 * imagery is gradient placeholders + the app's existing pravatar avatars.
 */
export function AuthVisualPanel() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden p-10 lg:p-12 xl:p-14">
      {/* Brand + back home */}
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Sportico — home" className="inline-flex items-center">
          <img src="/logo.png" alt="Sportico" className="h-9 w-auto rounded-[8px]" />
        </Link>
        <Link
          href="/"
          className="group hidden items-center gap-1 text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-900 sm:inline-flex"
        >
          Back to home
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Headline */}
      <div className="relative z-10 max-w-[460px] py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-violet-700 backdrop-blur"
        >
          <Sparkles size={11} />
          The AI-native coaching hub
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.08, ease: EASE }}
          className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[40px] xl:text-[44px]"
        >
          See everyday progress from your{" "}
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
            training community
          </span>
          .
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.14, ease: EASE }}
          className="mt-4 max-w-md text-[14.5px] leading-relaxed text-slate-500"
        >
          Follow your coaches, share wins, and let Sportico match you with the
          right people to train alongside.
        </motion.p>
      </div>

      {/* Floating collage */}
      <div className="relative min-h-[300px] flex-1" aria-hidden>
        {/* Story / reel card */}
        <FloatingStoryCard className="right-[3%] top-[2%] w-[176px]" delay={0.22} float={10}>
          <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white p-2 shadow-[0_18px_44px_-18px_rgba(124,58,237,0.45)]">
            <div className="relative h-[150px] overflow-hidden rounded-[16px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400">
              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Live
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                  <Play size={16} className="ml-0.5 text-white" fill="currentColor" strokeWidth={0} />
                </span>
              </span>
            </div>
            <p className="px-1 pb-0.5 pt-2 text-[11.5px] font-semibold text-slate-800">
              Morning HIIT · Day 12
            </p>
          </div>
        </FloatingStoryCard>

        {/* Coach profile card */}
        <FloatingStoryCard className="left-[2%] top-[8%] w-[210px]" delay={0.34} float={7}>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center gap-2.5">
              <img
                src={avatarFor("coach-1")}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-100"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[12.5px] font-semibold text-slate-900">
                  Alex Rivera
                  <BadgeCheck size={13} className="text-violet-500" />
                </p>
                <p className="text-[11px] text-slate-500">Strength · Tennis</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                4.9 · 320 sessions
              </span>
            </div>
          </div>
        </FloatingStoryCard>

        {/* Streak pill */}
        <FloatingStoryCard className="left-[40%] top-0 w-max" delay={0.46} float={9}>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/95 py-1.5 pl-2 pr-3.5 shadow-[0_12px_30px_-14px_rgba(249,115,22,0.6)] backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
              <Flame size={14} className="text-white" fill="currentColor" strokeWidth={1.5} />
            </span>
            <span className="text-[12px] font-semibold text-slate-800">12-day streak</span>
          </div>
        </FloatingStoryCard>

        {/* Heart / like bubble */}
        <FloatingStoryCard className="right-[8%] top-[44%] w-max" delay={0.58} float={11}>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 py-1.5 pl-2 pr-3 shadow-[0_12px_30px_-14px_rgba(244,63,94,0.6)] backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500">
              <Heart size={13} className="text-white" fill="currentColor" strokeWidth={0} />
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-800">+248</span>
          </div>
        </FloatingStoryCard>

        {/* Progress card */}
        <FloatingStoryCard className="bottom-[6%] left-[7%] w-[196px]" delay={0.7} float={8}>
          <div className="rounded-[18px] border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.5)] backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-emerald-500 to-teal-400">
                <TrendingUp size={16} className="text-white" />
              </span>
              <div>
                <p className="text-[11px] text-slate-500">This month</p>
                <p className="text-[15px] font-semibold tabular-nums text-slate-900">
                  +18% strength
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-end gap-1">
              {[40, 55, 48, 70, 62, 88, 96].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h * 0.28}px` }}
                  className="flex-1 rounded-full bg-gradient-to-t from-emerald-200 to-emerald-500"
                />
              ))}
            </div>
          </div>
        </FloatingStoryCard>

        {/* Verified chip */}
        <FloatingStoryCard className="bottom-[22%] right-[12%] w-max" delay={0.82} float={7}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/95 py-1.5 pl-2 pr-3.5 shadow-[0_12px_30px_-14px_rgba(124,58,237,0.55)] backdrop-blur">
            <ShieldCheck size={15} className="text-violet-500" />
            <span className="text-[12px] font-semibold text-slate-800">Verified coach</span>
          </div>
        </FloatingStoryCard>
      </div>

      {/* Trust footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: 0.5 }}
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-[11.5px] text-slate-500"
      >
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {["learner-1", "learner-2", "learner-6"].map((seed) => (
              <img
                key={seed}
                src={avatarFor(seed)}
                alt=""
                className="h-5 w-5 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          <span>
            <span className="font-semibold text-slate-900">2,000+</span> athletes
            training this season
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
