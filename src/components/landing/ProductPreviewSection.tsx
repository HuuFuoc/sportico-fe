"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  Flame,
  Heart,
  LineChart as LineChartIcon,
  MessageCircle,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

type TabId = "progress" | "schedule" | "messages";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
  bullets: string[];
}

const TABS: TabDef[] = [
  {
    id: "progress",
    label: "Progress",
    icon: LineChartIcon,
    bullets: [
      "Composite fitness score — mobility, strength, conditioning",
      "AI recovery alerts from HRV trends",
      "Streaks + achievements with tiered rewards",
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    bullets: [
      "One calm calendar for booked, suggested and AI-guided",
      "Smart reschedule on conflicts — no chat ping-pong",
      "Live availability across every coach you follow",
    ],
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircle,
    bullets: [
      "Threaded chats with built-in coach + Ask AI",
      "Inline workout cards, voice notes, video review",
      "Auto-summary so you never miss what's next",
    ],
  },
];

export function ProductPreviewSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [tab, setTab] = useState<TabId>("progress");

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <section
      ref={ref}
      aria-label="Inside the product"
      className="relative overflow-hidden border-y border-slate-200/70 bg-slate-50/60"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_85%_10%,rgba(124,58,237,0.07),transparent_60%),radial-gradient(ellipse_50%_50%_at_10%_90%,rgba(6,182,212,0.05),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        {/* ============ HEADER ============ */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700"
          >
            <Sparkles size={11} />
            Inside the product
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.06, ease: EASE }}
            className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.025em] text-slate-900 sm:text-[44px]"
          >
            Every session,{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              measured and understood.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.12, ease: EASE }}
            className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-slate-500"
          >
            Your dashboard turns training into signal. AI flags what to adjust
            before it costs you progress.
          </motion.p>
        </div>

        {/* ============ TAB SWITCHER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.18, ease: EASE }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-1 rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-colors",
                    active ? "text-white" : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="ppTabPill"
                      className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-[0_4px_14px_-2px_rgba(124,58,237,0.45)]"
                      transition={{
                        type: "spring",
                        duration: reduce ? 0 : 0.4,
                        bounce: 0.2,
                      }}
                    />
                  )}
                  <Icon size={13} className="relative" />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.95fr_1.1fr] lg:gap-16">
          {/* LEFT — bullets per tab */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
              >
                <h3 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  {current.label === "Progress"
                    ? "Turn training into signal."
                    : current.label === "Schedule"
                      ? "One calm calendar."
                      : "Coach + AI in one thread."}
                </h3>
                <ul className="mt-5 space-y-3">
                  {current.bullets.map((b, i) => (
                    <motion.li
                      key={b}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.4,
                        delay: reduce ? 0 : i * 0.06,
                        ease: EASE,
                      }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="text-[14.5px] leading-relaxed text-slate-700">
                        {b}
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <Link
                  href="/learner/dashboard"
                  className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-700"
                >
                  Explore the dashboard
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT — animated dashboard mockup */}
          <DashboardMockup tab={tab} reduce={reduce ?? false} inView={inView} />
        </div>

        {/* ============ TRUST STRIP ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: reduce ? 0 : 0.6, delay: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-slate-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            Apple Health + Strava sync
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            HRV-aware recovery flags
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            Privacy-first by default
          </span>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Dashboard mockup — switches content with AnimatePresence
// ============================================================================

function DashboardMockup({
  tab,
  reduce,
  inView,
}: {
  tab: TabId;
  reduce: boolean;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduce ? 0 : 0.7, delay: 0.25, ease: EASE }}
      className="relative"
    >
      {/* Glow halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br from-violet-300/30 via-fuchsia-300/20 to-cyan-300/20 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_70px_-25px_rgba(15,23,42,0.2)]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 font-mono text-[10.5px] text-slate-400">
            sportico.app/learner/{tab}
          </span>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {tab === "progress" && (
              <ProgressMock key="progress" reduce={reduce} />
            )}
            {tab === "schedule" && (
              <ScheduleMock key="schedule" reduce={reduce} />
            )}
            {tab === "messages" && (
              <MessagesMock key="messages" reduce={reduce} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating chips */}
      <FloatingTag
        icon={Brain}
        text="AI flagged"
        cls="-left-6 top-12 hidden lg:flex"
        delay={1.1}
        reduce={reduce}
      />
      <FloatingTag
        icon={Flame}
        text="Streak +1"
        cls="-right-3 bottom-16 hidden lg:flex"
        delay={1.3}
        reduce={reduce}
        accent="amber"
      />
    </motion.div>
  );
}

// ============================================================================
// Mock — Progress
// ============================================================================

function ProgressMock({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
            Fitness Score
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
            78<span className="text-[14px] text-slate-400">/100</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
          <TrendingUp size={11} />
          +14% MoM
        </span>
      </div>

      {/* Mini chart */}
      <div className="rounded-[12px] border border-slate-100 bg-slate-50/40 p-3">
        <svg viewBox="0 0 200 60" className="h-16 w-full" aria-hidden>
          <defs>
            <linearGradient id="ppFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ppStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 0 45 L 20 40 L 40 42 L 60 32 L 80 28 L 100 25 L 120 18 L 140 22 L 160 16 L 180 10 L 200 8 L 200 60 L 0 60 Z"
            fill="url(#ppFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <motion.path
            d="M 0 45 L 20 40 L 40 42 L 60 32 L 80 28 L 100 25 L 120 18 L 140 22 L 160 16 L 180 10 L 200 8"
            fill="none"
            stroke="url(#ppStroke)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          <motion.circle
            cx={200}
            cy={8}
            r={3.5}
            fill="#fff"
            stroke="#7c3aed"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 1.5 }}
          />
        </svg>
      </div>

      {/* 3 mini metric rows */}
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric icon={Heart} label="HRV" value="52" tone="violet" />
        <MiniMetric icon={Activity} label="Load" value="71" tone="cyan" />
        <MiniMetric icon={Flame} label="Streak" value="8d" tone="amber" />
      </div>

      {/* AI insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-start gap-2.5 rounded-[12px] border border-violet-200/60 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 px-3 py-2.5"
      >
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
          <Sparkles size={11} />
        </span>
        <p className="text-[11.5px] leading-relaxed text-slate-700">
          HRV dipped 6% — swap today's strength block for a{" "}
          <span className="font-semibold text-violet-700">
            15-min mobility flow
          </span>
          .
        </p>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Mock — Schedule
// ============================================================================

function ScheduleMock({ reduce }: { reduce: boolean }) {
  const sessions = [
    { time: "07:00", title: "Tempo + Strides", coach: "Sarah Jenkins", tone: "violet" as const },
    { time: "13:30", title: "Mobility Flow", coach: "Elena Voss", tone: "cyan" as const },
    { time: "18:00", title: "AI-Guided Recovery", coach: "Engine", tone: "fuchsia" as const, ai: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
            Today · Friday
          </p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-slate-900">
            3 sessions scheduled
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">
          <Calendar size={11} />
          On track
        </span>
      </div>

      <div className="space-y-2">
        {sessions.map((s, i) => {
          const toneClasses =
            s.tone === "violet"
              ? "border-violet-100 bg-violet-50/40"
              : s.tone === "cyan"
                ? "border-cyan-100 bg-cyan-50/40"
                : "border-fuchsia-100 bg-fuchsia-50/40";
          const barColor =
            s.tone === "violet"
              ? "bg-violet-500"
              : s.tone === "cyan"
                ? "bg-cyan-500"
                : "bg-fuchsia-500";
          return (
            <motion.div
              key={s.time}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.15 + i * 0.08,
                ease: EASE,
              }}
              className={cn(
                "relative flex items-center gap-3 rounded-[12px] border px-3 py-2.5",
                toneClasses,
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
                  barColor,
                )}
              />
              <div className="pl-1 text-center">
                <p className="text-[12px] font-bold tabular-nums text-slate-900">
                  {s.time}
                </p>
                <p className="text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
                  60m
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate text-slate-900">
                  {s.title}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  with {s.coach}
                </p>
              </div>
              {s.ai && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-500 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white">
                  <Sparkles size={9} />
                  AI
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Mock — Messages
// ============================================================================

function MessagesMock({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-3"
    >
      {/* Thread header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_4px_12px_-2px_rgba(124,58,237,0.4)]">
          <Sparkles size={15} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">
            Sportico AI
          </p>
          <p className="text-[10.5px] text-emerald-600 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Coach assistant · Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
          className="max-w-[80%] rounded-[14px] rounded-bl-[4px] bg-violet-50 px-3 py-2 text-[12px] text-slate-700"
        >
          Hi Alex! HRV dipped 6% overnight. I&apos;d suggest a mobility-focused
          plan today — keeps the streak alive without overloading.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
          className="ml-auto max-w-[70%] rounded-[14px] rounded-br-[4px] bg-gradient-to-br from-violet-600 to-fuchsia-500 px-3 py-2 text-[12px] text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.45)]"
        >
          Yes please — schedule it.
        </motion.div>

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="inline-flex items-center gap-1 rounded-[14px] rounded-bl-[4px] bg-violet-50 px-3 py-2"
        >
          <Dot delay={0} reduce={reduce} />
          <Dot delay={0.15} reduce={reduce} />
          <Dot delay={0.3} reduce={reduce} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Dot({ delay, reduce }: { delay: number; reduce: boolean }) {
  return (
    <motion.span
      animate={
        reduce
          ? { opacity: 0.5 }
          : {
              opacity: [0.3, 1, 0.3],
              y: [0, -2, 0],
            }
      }
      transition={{
        duration: 1.1,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500"
    />
  );
}

// ============================================================================
// Mini metric tile
// ============================================================================

function MiniMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "violet" | "cyan" | "amber";
}) {
  const toneClass =
    tone === "violet"
      ? "text-violet-600 bg-violet-50"
      : tone === "cyan"
        ? "text-cyan-600 bg-cyan-50"
        : "text-amber-600 bg-amber-50";
  return (
    <div className="rounded-[10px] border border-slate-100 bg-white px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded",
            toneClass,
          )}
        >
          <Icon size={10} />
        </span>
        <span className="text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-1 text-[15px] font-semibold leading-none tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Floating tag
// ============================================================================

function FloatingTag({
  icon: Icon,
  text,
  cls,
  delay,
  reduce,
  accent = "violet",
}: {
  icon: LucideIcon;
  text: ReactNode;
  cls: string;
  delay: number;
  reduce: boolean;
  accent?: "violet" | "amber";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      className={cn("absolute z-10", cls)}
    >
      <motion.div
        animate={
          reduce
            ? {}
            : {
                y: [0, -5, 0],
              }
        }
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay * 0.5,
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_10px_28px_-10px_rgba(15,23,42,0.18)]"
      >
        <Icon
          size={12}
          className={accent === "amber" ? "text-amber-600" : "text-violet-600"}
        />
        {text}
      </motion.div>
    </motion.div>
  );
}
