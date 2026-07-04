"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SporticoVideoBackground } from "@/components/landing/SporticoVideoBackground";
import type { Coach } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const CYCLE_WORDS = [
  "THỂ CHẤT & TINH THẦN",
  "TẬP TRUNG & KỶ LUẬT",
  "SỨC MẠNH & BỀN BỈ",
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
      className="relative -mt-20 h-[min(100vh,860px)] min-h-[640px] overflow-hidden bg-[#0a0a0e] text-white"
    >
      {/* ============ BACKGROUND (parallax — video on desktop, image on mobile) ============ */}
      <motion.div
        style={{ x: imgX, y: imgY, scale: 1.05 }}
        className="absolute inset-0"
      >
        <SporticoVideoBackground />
      </motion.div>

      {/* ============ OVERLAYS / GRADIENTS ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Left-to-right dark fade for headline legibility — darker on the
            left so the headline never competes with the athlete or watermark. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/55 to-black/15" />
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
          animate={{
            opacity: [0.35, 0.55, 0.35],
            scale: [1, 1.1, 1],
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 9, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full bg-indigo-600/30 blur-[140px]"
        />
        <motion.div
          animate={{
            opacity: [0.25, 0.5, 0.25],
            scale: [1, 1.05, 1],
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 11, repeat: Infinity, delay: 1.2, ease: "easeInOut" }
          }
          className="absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-violet-600/25 blur-[130px]"
        />
      </div>

      {/* ============ BRAND WATERMARK (decorative, pushed to bottom edge) ============
          Sized smaller (12vw) and pushed further off the bottom so it stays a
          purely decorative footer band, never competing vertically with the
          headline or members card. Opacity dropped to 4% as well. */}
      <motion.div
        aria-hidden
        style={{ x: watermarkX }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
        className="pointer-events-none absolute inset-x-0 bottom-[-3.5vw] flex justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[12vw] font-black leading-none tracking-[-0.04em] text-white/[0.04]"
          style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.08)",
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
          {/* Two-line heading: static concept line + animated cycling line.
              Font size uses clamp so the longer Vietnamese phrase wraps
              gracefully at any viewport. lineHeight 1.22 gives tone marks
              (Ứ/Ỏ/Ầ) enough vertical clearance; mt-2 anchors the cycling
              line without relying on em-relative gaps. */}
          <h1
            className="mt-6 max-w-[820px] font-black uppercase tracking-[-0.03em] text-white"
            style={{
              // Min lowered to 26px so the longest cycling phrase
              // ("THỂ CHẤT & TINH THẦN") stays on ONE line down to 360px — at
              // 30px it wrapped only on the longest word, causing a vertical
              // jump each cycle. vw factor + max unchanged → tablet/desktop
              // sizing is identical.
              fontSize: "clamp(26px, 5vw, 56px)",
              lineHeight: 1.22,
            }}
          >
            <span className="block leading-[1.22]">
              SỨC KHỎE TINH THẦN{" "}
              <span className="whitespace-nowrap">TRƯỚC TIÊN.</span>
            </span>
            <span className="relative mt-2 block sm:mt-3">
              <AnimatePresence mode="wait">
                <motion.span
                  key={CYCLE_WORDS[wordIdx]}
                  initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
                  transition={{ duration: 0.55, ease: EASE }}
                  // pt + matching -mt enlarges the background paint box upward
                  // (so `bg-clip-text` covers stacked Vietnamese tone marks like
                  // Ể/Ấ/Ầ) without shifting the text or the layout box.
                  className="inline-block pt-[0.25em] -mt-[0.25em] bg-[linear-gradient(110deg,#ffffff_0%,#c7c4ff_40%,#a78bfa_55%,#ffffff_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-x"
                >
                  {CYCLE_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.26}>
          <p className="mt-7 max-w-md text-[15px] leading-[1.7] text-white/70 sm:text-[16px]">
            Tìm huấn luyện viên phù hợp với mục tiêu của bạn, chọn gói tập rõ
            ràng, nhắn tin trước khi đặt lịch, và{" "}
            <span className="text-white">theo dõi lộ trình trong một nơi</span>.
          </p>
        </FadeUp>

        {/* ============ CTA BUTTONS ============ */}
        <FadeUp delay={0.34}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/coaches"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-bold text-slate-900 shadow-[0_4px_20px_-4px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_rgba(255,255,255,0.5)]"
            >
              Tìm HLV của bạn
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              Trở thành HLV
            </Link>
          </div>
        </FadeUp>

        {/* ============ BOTTOM ROW: tagline strip ============ */}
        <div className="mt-auto flex items-end justify-between pb-10 sm:pb-14">
          <FadeUp delay={0.45} y={24}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              Nền tảng coaching thể thao
            </p>
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
      Sportico · Smart Coach Hub
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
      <span>Cuộn</span>
      <motion.span
        animate={{ y: [0, 6, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="inline-flex"
      >
        <ChevronDown size={16} className="text-white/50" />
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
