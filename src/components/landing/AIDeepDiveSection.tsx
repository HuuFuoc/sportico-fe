"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Easing,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Activity,
  Brain,
  CalendarClock,
  Cpu,
  RefreshCcw,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { avatarFor, cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

interface Signal {
  icon: LucideIcon;
  title: string;
  body: string;
  weight: number;
  tone: "indigo" | "violet" | "cyan" | "fuchsia";
}

const SIGNALS: Signal[] = [
  {
    icon: Target,
    title: "Xếp hạng theo mục tiêu",
    body: "Chấm điểm theo kết quả cụ thể của bạn — không chỉ theo bộ môn.",
    weight: 92,
    tone: "indigo",
  },
  {
    icon: CalendarClock,
    title: "Ghép nối theo lịch trống",
    body: "Hiển thị huấn luyện viên có lịch trống thực sự phù hợp với tuần của bạn.",
    weight: 88,
    tone: "violet",
  },
  {
    icon: Cpu,
    title: "Hiệu chỉnh phong cách",
    body: "Học xem bạn cần huấn luyện cứng rắn hay hướng dẫn kiên nhẫn.",
    weight: 84,
    tone: "cyan",
  },
  {
    icon: RefreshCcw,
    title: "Vòng lặp học hỏi liên tục",
    body: "Kết quả từng buổi tập giúp lần ghép nối tiếp theo chính xác hơn.",
    weight: 96,
    tone: "fuchsia",
  },
];

const TONE_MAP = {
  indigo: { hex: "#818cf8", glow: "rgba(99,102,241,0.35)" },
  violet: { hex: "#a78bfa", glow: "rgba(167,139,250,0.35)" },
  cyan: { hex: "#67e8f9", glow: "rgba(34,211,238,0.3)" },
  fuchsia: { hex: "#f0abfc", glow: "rgba(232,121,249,0.32)" },
} as const;

// Match results shown in the engine panel
const ENGINE_MATCHES = [
  { name: "Sarah Jenkins", score: 96, avatar: avatarFor("coach-1") },
  { name: "Marcus Reed", score: 91, avatar: avatarFor("coach-5") },
  { name: "Elena Voss", score: 87, avatar: avatarFor("coach-3") },
];

// Deterministic sparkles
const SPARKLES = Array.from({ length: 18 }, (_, i) => {
  const seed = Math.sin(i * 13.37) * 10000;
  const x = Math.abs(seed) % 100;
  const y = Math.abs(seed * 1.7) % 100;
  const size = 1.5 + (Math.abs(seed * 0.31) % 2);
  const delay = (Math.abs(seed * 0.19) % 6).toFixed(2);
  const duration = (5 + (Math.abs(seed * 0.07) % 5)).toFixed(2);
  return { x, y, size, delay, duration };
});

export function AIDeepDiveSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  // Mouse parallax for background blobs
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const blobX = useSpring(useTransform(mx, (v) => v * 40), {
    stiffness: 50,
    damping: 20,
  });
  const blobY = useSpring(useTransform(my, (v) => v * 40), {
    stiffness: 50,
    damping: 20,
  });
  const blobX2 = useSpring(useTransform(mx, (v) => v * -30), {
    stiffness: 50,
    damping: 20,
  });
  const blobY2 = useSpring(useTransform(my, (v) => v * -30), {
    stiffness: 50,
    damping: 20,
  });

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      aria-label="Bộ máy AI ghép nối thông minh"
      className="relative overflow-hidden bg-[#070718] text-white"
    >
      {/* ============ BACKGROUND ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_30%,transparent_85%)]" />

        {/* Indigo blob — left */}
        <motion.div
          style={{ x: blobX, y: blobY }}
          animate={{
            scale: [1, 1.08, 0.95, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 14, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute -left-32 top-[20%] h-[480px] w-[480px] rounded-full bg-indigo-600/35 blur-[150px]"
        />

        {/* Violet blob — right */}
        <motion.div
          style={{ x: blobX2, y: blobY2 }}
          animate={{
            scale: [1, 0.92, 1.06, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.2 }
          }
          className="absolute -right-20 top-[10%] h-[420px] w-[420px] rounded-full bg-violet-600/30 blur-[140px]"
        />

        {/* Cyan accent */}
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 12, repeat: Infinity, ease: "easeInOut" }
          }
          className="absolute bottom-[10%] left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[140px]"
        />

        {/* Sparkles */}
        {SPARKLES.map((s, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              inView && !reduce
                ? {
                    opacity: [0, 0.65, 0],
                    scale: [0, 1, 0],
                    y: [0, -22],
                  }
                : { opacity: 0, scale: 0 }
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
            className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ============ HEADER ============ */}
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 backdrop-blur"
          >
            <motion.span
              animate={{
                scale: [1, 1.4, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
              className="inline-block h-1.5 w-1.5 rounded-full bg-violet-300"
            />
            Bộ máy ghép nối
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.08, ease: EASE }}
            className="mt-5 text-[36px] font-semibold leading-[1.06] tracking-[-0.025em] text-white sm:text-[48px]"
          >
            AI ghép nối thông minh,{" "}
            <span className="pt-[0.15em] bg-[linear-gradient(110deg,#a78bfa_0%,#f0abfc_50%,#67e8f9_100%)] bg-clip-text text-transparent">
              không phải bộ lọc thông thường.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.14, ease: EASE }}
            className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-white/55"
          >
            Hầu hết marketplace chỉ dừng ở thanh tìm kiếm. Chúng tôi chấm điểm
            mọi HLV trên{" "}
            <span className="text-white/85">bốn tín hiệu thời gian thực</span>{" "}
            — và cho bạn thấy lý do đằng sau mỗi gợi ý.
          </motion.p>
        </div>

        {/* ============ 2-COLUMN: signals + engine panel ============ */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          {/* LEFT — 4 signal cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {SIGNALS.map((s, i) => (
              <SignalCard
                key={s.title}
                signal={s}
                inView={inView}
                reduce={reduce ?? false}
                delay={0.18 + i * 0.08}
              />
            ))}
          </div>

          {/* RIGHT — engine panel */}
          <EnginePanel inView={inView} reduce={reduce ?? false} />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Signal card
// ============================================================================

function SignalCard({
  signal,
  inView,
  reduce,
  delay,
}: {
  signal: Signal;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  const Icon = signal.icon;
  const tone = TONE_MAP[signal.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Hover glow ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[18px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `0 0 0 1px ${tone.hex}40, 0 20px 50px -20px ${tone.glow}`,
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          {/* Icon tile */}
          <motion.div
            whileHover={
              reduce ? {} : { rotate: [0, -6, 6, 0], scale: 1.05 }
            }
            transition={{ duration: 0.6, ease: EASE }}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] transition-shadow duration-500"
            style={{
              background: `linear-gradient(135deg, ${tone.hex}30, ${tone.hex}08)`,
              border: `1px solid ${tone.hex}30`,
              boxShadow: `0 0 18px -2px ${tone.glow}`,
            }}
          >
            <Icon size={17} style={{ color: tone.hex }} />
          </motion.div>

          {/* Weight chip */}
          <span
            className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-white/70"
            style={{ color: tone.hex }}
          >
            ⚖ {signal.weight}
          </span>
        </div>

        <h3 className="mt-4 text-[14px] font-semibold text-white">
          {signal.title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">
          {signal.body}
        </p>

        {/* Weight bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.span
            initial={{ width: 0 }}
            animate={inView ? { width: `${signal.weight}%` } : {}}
            transition={{
              duration: reduce ? 0 : 1.2,
              delay: reduce ? 0 : delay + 0.2,
              ease: EASE,
            }}
            className="block h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${tone.hex}, ${tone.hex}aa)`,
              boxShadow: `0 0 8px ${tone.glow}`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Engine panel — input → 4 signals → matches output
// ============================================================================

function EnginePanel({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.75,
        delay: reduce ? 0 : 0.3,
        ease: EASE,
      }}
      className="relative"
    >
      {/* Outer ring glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[24px] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-400/30 opacity-60 blur-[2px]"
      />

      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(15,15,30,0.7)] p-6 shadow-[0_30px_80px_-30px_rgba(124,58,237,0.45)] backdrop-blur-2xl sm:p-7">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_4px_14px_-2px_rgba(124,58,237,0.55)]">
              <Brain size={13} className="text-white" />
            </span>
            <p className="text-[11.5px] font-semibold text-white">
              Bộ máy Sportico
            </p>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] text-white/50">
              v3.2.1
            </span>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Trực tiếp
          </span>
        </div>

        {/* Input row */}
        <div className="mt-5 flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3">
          <img
            src={avatarFor("learner-1")}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/15"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white">Alex Rivera</p>
            <p className="text-[10.5px] text-white/50">
              Mục tiêu: <span className="text-violet-200">Marathon · dưới 3:30</span>
            </p>
          </div>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] text-white/45">
            đầu vào
          </span>
        </div>

        {/* Signal weights scanning */}
        <div className="relative mt-4 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/45">
              Đánh giá tín hiệu
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-white/45">
              <Activity size={9} />
              đang chấm 1.247 HLV
            </span>
          </div>

          {SIGNALS.map((s, i) => (
            <SignalRow
              key={s.title}
              signal={s}
              inView={inView}
              reduce={reduce}
              delay={0.55 + i * 0.1}
            />
          ))}

          {/* Vertical connector to output */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{
              duration: reduce ? 0 : 0.6,
              delay: reduce ? 0 : 1.1,
              ease: EASE,
            }}
            style={{ transformOrigin: "top" }}
            aria-hidden
            className="absolute -bottom-3 left-1/2 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-violet-400/60 to-transparent"
          />
        </div>

        {/* Output — top matches */}
        <div className="mt-6 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/45">
              Kết quả · đầu ra
            </p>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-300">
              ✓ 3 phù hợp
            </span>
          </div>
          <ul className="space-y-1.5">
            {ENGINE_MATCHES.map((m, i) => (
              <MatchOutputRow
                key={m.name}
                match={m}
                rank={i + 1}
                inView={inView}
                reduce={reduce}
                delay={1.2 + i * 0.08}
              />
            ))}
          </ul>
        </div>

        {/* Footer stat row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{
            duration: reduce ? 0 : 0.5,
            delay: reduce ? 0 : 1.5,
          }}
          className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px]"
        >
          <span className="inline-flex items-center gap-1.5 text-white/55">
            <Sparkles size={11} className="text-violet-300" />
            <span className="font-semibold text-white tabular-nums">0,74s</span>
            <span>thời gian ghép</span>
          </span>
          <span className="text-white/45 tabular-nums">
            Độ chính xác 94% · 30 ngày qua
          </span>
        </motion.div>
      </div>

      {/* Floating chips around panel */}
      <FloatingChip
        text="Tín hiệu HRV"
        cls="-left-3 top-12 hidden lg:flex"
        reduce={reduce}
        delay={1.6}
      />
      <FloatingChip
        text="Mức tiếp nhận +12%"
        cls="-right-2 top-32 hidden lg:flex"
        reduce={reduce}
        delay={1.8}
        accent="cyan"
      />
    </motion.div>
  );
}

// ============================================================================
// Signal row inside engine
// ============================================================================

function SignalRow({
  signal,
  inView,
  reduce,
  delay,
}: {
  signal: Signal;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  const Icon = signal.icon;
  const tone = TONE_MAP[signal.tone];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      className="flex items-center gap-2.5 py-1.5"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{
          background: `${tone.hex}18`,
          border: `1px solid ${tone.hex}30`,
        }}
      >
        <Icon size={11} style={{ color: tone.hex }} />
      </span>
      <p className="w-40 shrink-0 truncate font-mono text-[10.5px] text-white/65">
        {signal.title.split(" ")[0].toLowerCase()}_score
      </p>
      <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.span
          initial={{ width: 0 }}
          animate={inView ? { width: `${signal.weight}%` } : {}}
          transition={{
            duration: reduce ? 0 : 1,
            delay: reduce ? 0 : delay + 0.1,
            ease: EASE,
          }}
          className="block h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${tone.hex}, ${tone.hex}cc)`,
            boxShadow: `0 0 6px ${tone.glow}`,
          }}
        />
      </div>
      <span
        className="w-9 text-right font-mono text-[10.5px] font-bold tabular-nums"
        style={{ color: tone.hex }}
      >
        {signal.weight}
      </span>
    </motion.div>
  );
}

// ============================================================================
// Match output row
// ============================================================================

function MatchOutputRow({
  match,
  rank,
  inView,
  reduce,
  delay,
}: {
  match: (typeof ENGINE_MATCHES)[number];
  rank: number;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.4,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { x: 2 }}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold tabular-nums",
          rank === 1
            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_2px_8px_-2px_rgba(245,158,11,0.5)]"
            : "bg-white/[0.06] text-white/55",
        )}
      >
        {rank}
      </span>
      <img
        src={match.avatar}
        alt=""
        className="h-7 w-7 rounded-full object-cover"
      />
      <p className="flex-1 truncate text-[11.5px] font-semibold text-white">
        {match.name}
      </p>
      <span className="text-[11px] font-bold tabular-nums text-white">
        {match.score}
      </span>
      <span className="font-mono text-[9px] text-white/40">%</span>
    </motion.li>
  );
}

// ============================================================================
// Floating chip
// ============================================================================

function FloatingChip({
  text,
  cls,
  reduce,
  delay,
  accent = "violet",
}: {
  text: string;
  cls: string;
  reduce: boolean;
  delay: number;
  accent?: "violet" | "cyan";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      className={cn("absolute z-10", cls)}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[rgba(15,15,30,0.85)] px-2.5 py-1 text-[10.5px] font-semibold text-white/85 backdrop-blur shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background:
              accent === "cyan"
                ? TONE_MAP.cyan.hex
                : TONE_MAP.violet.hex,
            boxShadow: `0 0 6px ${
              accent === "cyan" ? TONE_MAP.cyan.glow : TONE_MAP.violet.glow
            }`,
          }}
        />
        {text}
      </motion.div>
    </motion.div>
  );
}

// Reserved import (kept for future)
void useEffect;
void useState;
