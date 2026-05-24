"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { avatarFor } from "@/lib/utils";
import type { Coach } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const HERO_AVATARS = [
  avatarFor("learner-11"),
  avatarFor("learner-2"),
  avatarFor("learner-6"),
];

const FEATURED_AVATAR = avatarFor("coach-1");

const CYCLE_WORDS = [
  "MENTAAL & FYSIEK",
  "FOCUS & FORM",
  "STRENGTH & FLOW",
] as const;

// Deterministic sparkle positions (SSR-safe)
const SPARKLES = Array.from({ length: 14 }, (_, i) => {
  const seed = Math.sin(i * 13.37) * 10000;
  const x = Math.abs(seed) % 100;
  const y = Math.abs(seed * 1.7) % 100;
  const size = 2 + (Math.abs(seed * 0.31) % 3);
  const delay = (Math.abs(seed * 0.19) % 6).toFixed(2);
  const duration = (5 + (Math.abs(seed * 0.07) % 5)).toFixed(2);
  return { x, y, size, delay, duration };
});

export function HeroSection({ coach }: { coach: Coach }) {
  void coach;
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Mouse parallax for image + watermark
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const imgX = useSpring(useTransform(mx, (v) => v * -20), {
    stiffness: 50,
    damping: 20,
  });
  const imgY = useSpring(useTransform(my, (v) => v * -20), {
    stiffness: 50,
    damping: 20,
  });
  const watermarkX = useSpring(useTransform(mx, (v) => v * 30), {
    stiffness: 40,
    damping: 18,
  });

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  // Word cycle for subhead accent
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setWordIdx((i) => (i + 1) % CYCLE_WORDS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMove}
      className="relative -mt-16 h-[min(100vh,860px)] min-h-[640px] overflow-hidden bg-[#0a0a0e] text-white"
    >
      {/* ============ BACKGROUND IMAGE (parallax) ============ */}
      <motion.div
        style={{ x: imgX, y: imgY, scale: 1.05 }}
        className="absolute inset-0"
      >
        {/* Use native img for full control over object-position */}
        <img
          src="/hero.webp"
          alt="Elite coach training session"
          className="h-full w-full object-cover object-[center_20%]"
        />
      </motion.div>

      {/* ============ OVERLAYS / GRADIENTS ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Left-to-right dark fade for headline legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
        {/* Top fade so nav reads cleanly */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
        {/* Bottom fade for watermark + cards */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/70 to-transparent" />
        {/* Subtle grain via grid */}
        <div className="absolute inset-0 bg-grid-dark opacity-30" />

        {/* Sparkles */}
        {SPARKLES.map((s, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              reduce
                ? { opacity: 0.4, scale: 1 }
                : {
                    opacity: [0, 0.65, 0],
                    scale: [0, 1, 0],
                    y: [0, -30],
                  }
            }
            transition={{
              duration: Number(s.duration),
              repeat: Infinity,
              delay: Number(s.delay),
              ease: "easeInOut",
            }}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
            }}
            className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
          />
        ))}

        {/* Indigo / violet glow blobs */}
        <motion.div
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.35, 0.55, 0.35],
                  scale: [1, 1.1, 1],
                }
          }
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full bg-indigo-600/30 blur-[140px]"
        />
        <motion.div
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.25, 0.5, 0.25],
                  scale: [1, 1.05, 1],
                }
          }
          transition={{
            duration: 11,
            repeat: Infinity,
            delay: 1.2,
            ease: "easeInOut",
          }}
          className="absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-violet-600/25 blur-[130px]"
        />
      </div>

      {/* ============ BRAND WATERMARK (huge bg text) ============ */}
      <motion.div
        aria-hidden
        style={{ x: watermarkX }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
        className="pointer-events-none absolute inset-x-0 bottom-[-2vw] flex justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[18vw] font-black leading-none tracking-[-0.04em] text-white/[0.06]"
          style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.12)",
            fontFamily: "var(--font-sans)",
          }}
        >
          SPORTICO™
        </span>
      </motion.div>

      {/* ============ CONTENT ============ */}
      <div className="relative mx-auto flex h-full max-w-7xl flex-col px-6 pt-24 sm:pt-28">
        {/* HEADLINE */}
        <FadeUp delay={0.1}>
          <PulsingBadge />
        </FadeUp>

        <FadeUp delay={0.18}>
          <h1 className="mt-6 max-w-3xl text-[42px] font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-[62px] lg:text-[78px]">
            <span className="block">Community first.</span>
            <span className="relative block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={CYCLE_WORDS[wordIdx]}
                  initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="inline-block bg-[linear-gradient(110deg,#ffffff_0%,#c7c4ff_40%,#a78bfa_55%,#ffffff_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-x"
                >
                  {CYCLE_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.26}>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-[16px]">
            AI-matched elite coaches, a community that holds you accountable,
            and one calm place to grow{" "}
            <span className="text-white">mentally and physically</span>.
          </p>
        </FadeUp>

        {/* ============ BOTTOM ROW: Members ============ */}
        <div className="mt-auto flex justify-end pb-10 sm:pb-14">
          <FadeUp delay={0.45} y={32}>
            <MembersCard />
          </FadeUp>
        </div>
      </div>

      {/* ============ SCROLL CUE ============ */}
      <ScrollCue reduce={reduce ?? false} />
    </section>
  );
}

// ============================================================================
// Pulsing badge — top of headline
// ============================================================================

function PulsingBadge() {
  return (
    <span className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Live · AI-matched coaching
      <span className="ml-1 text-white/40">|</span>
      <MaterialIcon name="auto_awesome" filled size={12} className="text-violet-300" />
    </span>
  );
}

// ============================================================================
// Members card (bottom-right)
// ============================================================================

function MembersCard() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/35 px-2 py-2 backdrop-blur-md">
      <div className="flex -space-x-2">
        {HERO_AVATARS.map((src, i) => (
          <motion.img
            key={src}
            src={src}
            alt=""
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.7 + i * 0.08,
              duration: 0.4,
              ease: EASE,
            }}
            className="h-7 w-7 rounded-full border-2 border-black object-cover"
          />
        ))}
      </div>
      <div className="pr-1 text-[12px] leading-tight">
        <p className="font-bold text-white">
          <CountUp end={2000} suffix="+" />
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
          Members
        </p>
      </div>
      <span className="mx-1 inline-block h-6 w-px bg-white/15" />
      <motion.img
        src={FEATURED_AVATAR}
        alt="Featured coach"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.45, ease: EASE }}
        className="h-9 w-9 rounded-full border-2 border-violet-400 object-cover shadow-[0_0_0_4px_rgba(167,139,250,0.18)]"
      />
    </div>
  );
}

// ============================================================================
// Count-up
// ============================================================================

function CountUp({
  end,
  suffix = "",
}: {
  end: number;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  // Always start at 0 on both server + initial client render to avoid
  // hydration mismatch — `useReducedMotion()` returns null on the server
  // and a real boolean on the client.
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduce) {
      setValue(end);
      return;
    }
    const start = 0;
    const startTime = performance.now();
    const duration = 1400;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, reduce]);
  return (
    <span className="tabular-nums">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

// ============================================================================
// Scroll cue
// ============================================================================

function ScrollCue({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.6 }}
      className="absolute bottom-4 right-6 hidden flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 md:flex"
    >
      <span>Scroll</span>
      <motion.span
        animate={
          reduce
            ? {}
            : {
                y: [0, 6, 0],
              }
        }
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="inline-flex"
      >
        <MaterialIcon
          name="keyboard_arrow_down"
          size={16}
          className="text-white/50"
        />
      </motion.span>
    </motion.div>
  );
}

// ============================================================================
// FadeUp wrapper
// ============================================================================

function FadeUp({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      // `initial` must be deterministic across SSR + first client render —
      // do NOT make it depend on `useReducedMotion()` (returns null on SSR,
      // boolean on client → hydration mismatch). Reduced-motion is honoured
      // via the `transition` below, which doesn't affect SSR markup.
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.7,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
