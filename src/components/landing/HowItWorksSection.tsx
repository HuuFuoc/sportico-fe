"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  animate,
  type Easing,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  Clock,
  Flame,
  LineChart,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { avatarFor, cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

// ============================================================================
// Section
// ============================================================================

export function HowItWorksSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      aria-label="Sportico hoạt động như thế nào"
      className="relative overflow-hidden bg-white"
    >
      {/* ============ SOFT BG ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(124,58,237,0.08),transparent_60%),radial-gradient(ellipse_45%_50%_at_85%_90%,rgba(6,182,212,0.05),transparent_60%),radial-gradient(ellipse_40%_50%_at_15%_90%,rgba(236,72,153,0.04),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ============ HEADER ============ */}
        <Header inView={inView} reduce={reduce ?? false} />

        {/* ============ STEPS GRID — asymmetric 1fr / 1.4fr / 1fr ============ */}
        <div className="relative mt-12 sm:mt-14">
          {/* Connection lines on desktop */}
          <ConnectionLines inView={inView} reduce={reduce ?? false} />

          <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_1.4fr_1fr] lg:gap-6">
            {/* STEP 1 */}
            <SideStep
              num="01"
              icon={Target}
              title="Xác định mục tiêu"
              body="60 giây, không form dài dòng. Cho chúng tôi biết bộ môn, mục tiêu và lịch tập của bạn — chỉ vậy thôi."
              accent="left"
              inView={inView}
              reduce={reduce ?? false}
              delay={0.1}
            />

            {/* STEP 2 — FEATURED */}
            <FeaturedStep
              inView={inView}
              reduce={reduce ?? false}
            />

            {/* STEP 3 */}
            <SideStep
              num="03"
              icon={TrendingUp}
              title="Tập. Đo lường. Chiến thắng."
              body="Theo dõi mọi chỉ số. AI sẽ nhắc bạn lúc nào nên đẩy mạnh, lúc nào nên nghỉ và cần điều chỉnh điều gì."
              accent="right"
              inView={inView}
              reduce={reduce ?? false}
              delay={0.5}
            />
          </div>
        </div>

        {/* ============ SOCIAL PROOF STRIP ============ */}
        <SocialProofStrip inView={inView} reduce={reduce ?? false} />
      </div>
    </section>
  );
}

// ============================================================================
// Header
// ============================================================================

function Header({ inView, reduce }: { inView: boolean; reduce: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700"
      >
        <Sparkles size={11} />
        Sportico hoạt động như thế nào
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduce ? 0 : 0.6, delay: 0.06, ease: EASE }}
        className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.025em] text-slate-900 sm:text-[48px]"
      >
        Ba bước để gặp huấn luyện viên{" "}
        <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
          dành riêng cho bạn.
        </span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduce ? 0 : 0.6, delay: 0.12, ease: EASE }}
        className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-slate-500"
      >
        Không cần inbox lạnh lùng. Không phải dò DM. Một lộ trình thông minh từ
        điểm bạn đang đứng đến nơi bạn muốn đến — chỉ trong chưa đầy một phút.
      </motion.p>
    </div>
  );
}

// ============================================================================
// Side step (1 + 3)
// ============================================================================

function SideStep({
  num,
  icon: Icon,
  title,
  body,
  accent,
  inView,
  reduce,
  delay,
}: {
  num: string;
  icon: LucideIcon;
  title: string;
  body: string;
  accent: "left" | "right";
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.65,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_14px_36px_-18px_rgba(15,23,42,0.12)] transition-all duration-500 hover:border-violet-200 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_22px_48px_-18px_rgba(124,58,237,0.18)]",
      )}
    >
      {/* Ghosted big number */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-5 top-3 select-none text-[88px] font-black leading-none tracking-[-0.04em] text-slate-100 transition-colors duration-500 group-hover:text-violet-50"
      >
        {num}
      </span>

      {/* Corner accent blob */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-12 h-32 w-32 rounded-full bg-gradient-to-br from-violet-300/30 to-fuchsia-300/10 blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-100",
          accent === "left" ? "-left-12" : "-right-12",
        )}
      />

      <div className="relative">
        {/* Step label */}
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-violet-600">
          Bước {num}
        </span>

        {/* Icon tile */}
        <div className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-900 text-white shadow-[0_6px_18px_-6px_rgba(15,23,42,0.4)] transition-transform duration-500 group-hover:scale-105 group-hover:bg-violet-600 group-hover:shadow-[0_8px_22px_-6px_rgba(124,58,237,0.45)]">
          <Icon size={18} strokeWidth={2} />
        </div>

        <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// FEATURED — Step 2: AI Matching
// ============================================================================

const COACH_RECS = [
  {
    name: "Sarah Jenkins",
    sport: "Tennis · Tactical",
    score: 96,
    avatar: avatarFor("coach-1"),
    delay: 0.55,
  },
  {
    name: "Marcus Reed",
    sport: "Strength · Hypertrophy",
    score: 91,
    avatar: avatarFor("coach-5"),
    delay: 0.7,
  },
  {
    name: "Elena Voss",
    sport: "Recovery · Mobility",
    score: 87,
    avatar: avatarFor("coach-3"),
    delay: 0.85,
  },
];

function FeaturedStep({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: reduce ? 0 : 0.75,
        delay: reduce ? 0 : 0.25,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -6 }}
      className="group relative"
    >
      {/* Animated outer glow ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-400/30 blur-[2px] transition-opacity duration-500"
      />

      <div className="relative overflow-hidden rounded-[28px] border border-violet-200/60 bg-gradient-to-b from-white via-white to-violet-50/40 p-7 shadow-[0_4px_12px_rgba(124,58,237,0.08),0_28px_60px_-20px_rgba(124,58,237,0.28)] transition-shadow duration-500 group-hover:shadow-[0_6px_16px_rgba(124,58,237,0.12),0_36px_72px_-20px_rgba(124,58,237,0.35)] sm:p-9">
        {/* Top-right glow blob */}
        <motion.div
          aria-hidden
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.08, 1],
                }
          }
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/15 blur-3xl"
        />
        {/* Bottom-left glow */}
        <motion.div
          aria-hidden
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.3, 0.55, 0.3],
                }
          }
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-300/25 to-violet-300/10 blur-3xl"
        />

        {/* Ghost number */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-7 top-5 select-none text-[120px] font-black leading-none tracking-[-0.045em] text-violet-100/80"
        >
          02
        </span>

        <div className="relative">
          {/* Label + LIVE chip */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
              Bước 02 · Nổi bật
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Trực tiếp
            </span>
          </div>

          {/* AI badge with sparkle */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_18px_-4px_rgba(124,58,237,0.5)]">
            <Sparkles size={13} />
            Sportico Engine
          </div>

          {/* Headline */}
          <h3 className="mt-4 max-w-md text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-[28px]">
            Chúng tôi chấm điểm mọi huấn luyện viên theo{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              mục tiêu cụ thể của bạn.
            </span>
          </h3>
          <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-slate-500">
            Và cho bạn thấy <span className="font-semibold text-slate-700">lý do</span>{" "}
            đằng sau mỗi gợi ý — phù hợp lịch tập, phong cách, lịch sử huấn luyện.
          </p>

          {/* AI Match visualization */}
          <div className="relative mt-7 grid gap-5 sm:grid-cols-[1.05fr_0.95fr] sm:gap-7">
            {/* Left — top match big card */}
            <TopMatchCard inView={inView} reduce={reduce} />

            {/* Right — recommendation list + signals */}
            <div className="flex flex-col gap-3">
              {/* Live matching indicator */}
              <MatchingIndicator inView={inView} reduce={reduce} />

              {/* Other recommendations */}
              <div className="flex flex-col gap-2">
                {COACH_RECS.slice(1).map((c) => (
                  <CoachRow
                    key={c.name}
                    coach={c}
                    inView={inView}
                    reduce={reduce}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Signals pill row */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <SignalChip icon={Clock} label="Ghép nối trung bình 0,8 giây" />
            <SignalChip icon={Brain} label="Độ chính xác 94%" />
            <SignalChip icon={Flame} label="Vòng lặp học hỏi liên tục" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Top match card (left side of featured)
// ============================================================================

function TopMatchCard({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  const top = COACH_RECS[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : 0.45,
        ease: EASE,
      }}
      className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.1)]"
    >
      {/* Soft glow corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-violet-400/25 to-fuchsia-400/10 blur-2xl"
      />

      <div className="relative flex items-start gap-3">
        <div className="relative">
          <img
            src={top.avatar}
            alt={top.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-[0_2px_8px_rgba(15,23,42,0.12)]"
          />
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 ring-2 ring-white">
            <Sparkles size={8} className="text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-semibold truncate text-slate-900">
              {top.name}
            </p>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              <Star size={9} fill="currentColor" strokeWidth={0} />
              4.9
            </span>
          </div>
          <p className="text-[11.5px] truncate text-slate-500">{top.sport}</p>
        </div>
      </div>

      {/* Compatibility score animated */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Độ tương thích
          </span>
          <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">
            <CountUp value={top.score} start={inView} reduce={reduce} />%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: "0%" }}
            animate={inView ? { width: `${top.score}%` } : {}}
            transition={{
              duration: reduce ? 0 : 1.4,
              delay: reduce ? 0 : 0.7,
              ease: EASE,
            }}
            className="relative h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500"
          >
            {/* Shimmer inside bar */}
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.5)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer"
            />
          </motion.div>
        </div>
      </div>

      {/* Reasoning bullets */}
      <ul className="mt-4 space-y-1.5">
        {[
          "Hợp bộ môn + phong cách tập",
          "Lịch trống khớp với tuần của bạn",
          "Lịch sử huấn luyện cùng mục tiêu",
        ].map((reason, i) => (
          <motion.li
            key={reason}
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.4,
              delay: reduce ? 0 : 0.85 + i * 0.1,
              ease: EASE,
            }}
            className="flex items-center gap-1.5 text-[11.5px] text-slate-600"
          >
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={9} strokeWidth={3} />
            </span>
            {reason}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

// ============================================================================
// Live matching indicator (3 pulsing dots + scanning text)
// ============================================================================

function MatchingIndicator({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : 0.55,
        ease: EASE,
      }}
      className="flex items-center gap-2.5 rounded-[14px] border border-violet-200/60 bg-white px-3.5 py-2.5"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_3px_10px_-2px_rgba(124,58,237,0.45)]">
        <Brain size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] font-semibold text-slate-900">
          Đang quét <span className="tabular-nums">1.247</span> huấn luyện viên…
        </p>
        <div className="mt-1 flex items-center gap-0.5">
          <PulseDot delay={0} reduce={reduce} />
          <PulseDot delay={0.18} reduce={reduce} />
          <PulseDot delay={0.36} reduce={reduce} />
          <span className="ml-1.5 text-[10px] text-slate-500">
            Tìm thấy 3 lựa chọn phù hợp
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PulseDot({ delay, reduce }: { delay: number; reduce: boolean }) {
  return (
    <motion.span
      animate={
        reduce
          ? { opacity: 0.6 }
          : {
              opacity: [0.25, 1, 0.25],
              scale: [0.9, 1.1, 0.9],
            }
      }
      transition={{
        duration: 1.3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"
    />
  );
}

// ============================================================================
// Smaller coach row (rec #2 + #3)
// ============================================================================

function CoachRow({
  coach,
  inView,
  reduce,
}: {
  coach: (typeof COACH_RECS)[number];
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : coach.delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -1 }}
      className="group/row flex items-center gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-violet-200"
    >
      <img
        src={coach.avatar}
        alt={coach.name}
        className="h-8 w-8 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate text-slate-900">
          {coach.name}
        </p>
        <p className="text-[10.5px] truncate text-slate-500">{coach.sport}</p>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold leading-none text-slate-900 tabular-nums">
          <CountUp value={coach.score} start={inView} reduce={reduce} />%
        </div>
        <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: `${coach.score}%` } : {}}
            transition={{
              duration: reduce ? 0 : 1.1,
              delay: reduce ? 0 : coach.delay + 0.1,
              ease: EASE,
            }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Signal chip
// ============================================================================

function SignalChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <Icon size={11} className="text-violet-600" />
      {label}
    </span>
  );
}

// ============================================================================
// Connection lines between steps (desktop only)
// ============================================================================

function ConnectionLines({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden lg:block"
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      style={{ top: 60, height: 60 }}
    >
      <defs>
        <linearGradient id="hwLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0" />
          <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Line 1 → 2 */}
      <motion.path
        d="M 240 50 Q 360 20, 480 50"
        fill="none"
        stroke="url(#hwLine)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{
          duration: reduce ? 0 : 1.2,
          delay: reduce ? 0 : 0.35,
          ease: EASE,
        }}
      />
      {/* Line 2 → 3 */}
      <motion.path
        d="M 600 50 Q 720 80, 840 50"
        fill="none"
        stroke="url(#hwLine)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{
          duration: reduce ? 0 : 1.2,
          delay: reduce ? 0 : 0.6,
          ease: EASE,
        }}
      />
    </svg>
  );
}

// ============================================================================
// Bottom social proof strip
// ============================================================================

function SocialProofStrip({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  const items = [
    { icon: Clock, value: "0,8s", label: "Thời gian ghép nối trung bình" },
    { icon: LineChart, value: "94%", label: "Độ chính xác ghép nối AI" },
    { icon: Zap, value: "1.200+", label: "HLV ưu tú đã xác thực" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : 0.9,
        ease: EASE,
      }}
      className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 border-t border-slate-200/70 pt-8 sm:mt-16"
    >
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-50 text-violet-600">
            <it.icon size={15} />
          </span>
          <div className="text-left">
            <p className="text-[18px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">
              {it.value}
            </p>
            <p className="mt-1 text-[11.5px] text-slate-500">{it.label}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// CountUp
// ============================================================================

function CountUp({
  value,
  start,
  reduce,
}: {
  value: number;
  start: boolean;
  reduce: boolean;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [start, value, reduce]);
  return <span className="tabular-nums">{display}</span>;
}

// Reserved icon import to keep tree-shake stable when CTA added later
void ArrowRight;
