"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  animate,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { avatarFor, cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const TRUST_AVATARS = [
  avatarFor("learner-1"),
  avatarFor("learner-2"),
  avatarFor("learner-6"),
  avatarFor("learner-11"),
];

// 94% accuracy sparkline data
const ACCURACY_TREND = [78, 81, 83, 85, 88, 90, 92, 94];

export function StatStrip() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      aria-label="Tin tưởng của khách hàng và chỉ số nền tảng"
      className="relative overflow-hidden border-t border-slate-200/70 bg-white"
    >
      {/* ============ SOFT MESH BACKGROUND ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Three soft radial glows — no grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_15%_10%,rgba(124,58,237,0.06),transparent_60%),radial-gradient(ellipse_45%_60%_at_85%_90%,rgba(6,182,212,0.05),transparent_60%),radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(236,72,153,0.03),transparent_70%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ============ EYEBROW: TRUST ROW ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="mb-12 flex flex-wrap items-center justify-center gap-3"
        >
          <div className="flex -space-x-1.5">
            {TRUST_AVATARS.map((src, i) => (
              <motion.img
                key={src}
                src={src}
                alt=""
                initial={{ opacity: 0, scale: 0, x: -8 }}
                animate={
                  inView
                    ? { opacity: 1, scale: 1, x: 0 }
                    : { opacity: 0, scale: 0 }
                }
                transition={{
                  delay: reduce ? 0 : 0.1 + i * 0.05,
                  duration: 0.4,
                  ease: EASE,
                }}
                className="h-7 w-7 rounded-full border-2 border-white object-cover shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
              />
            ))}
          </div>
          <p className="text-[13px] text-slate-500 sm:text-[13.5px]">
            Được tin dùng bởi{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              25.000+
            </span>{" "}
            vận động viên từ{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              60+
            </span>{" "}
            quốc gia
          </p>
        </motion.div>

        {/* ============ MAIN GRID: featured + 3 supporting ============ */}
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* FEATURED — 94% AI match accuracy */}
          <FeaturedStat inView={inView} reduce={reduce ?? false} />

          {/* SUPPORTING — 3 stacked */}
          <div className="flex flex-col gap-3">
            <SupportingStat
              icon={ShieldCheck}
              value={1200}
              decimals={0}
              suffix="+"
              label="Huấn luyện viên ưu tú đã xác thực"
              hint="Trên 13 bộ môn thể thao"
              inView={inView}
              reduce={reduce ?? false}
              delay={0.32}
            />
            <SupportingStat
              icon={Users}
              value={25}
              decimals={0}
              suffix="k+"
              label="Vận động viên đã được huấn luyện từ 2021"
              hint="Khắp 6 châu lục"
              inView={inView}
              reduce={reduce ?? false}
              delay={0.4}
            />
            <SupportingStat
              icon={Star}
              value={4.9}
              decimals={1}
              suffix="/5"
              label="Đánh giá trung bình của huấn luyện viên"
              hint="Từ 18.420+ đánh giá đã xác thực"
              showStars
              inView={inView}
              reduce={reduce ?? false}
              delay={0.48}
            />
          </div>
        </div>

        {/* ============ TESTIMONIAL FOOTER ============ */}
        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: reduce ? 0 : 0.6,
            delay: reduce ? 0 : 0.65,
            ease: EASE,
          }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center"
        >
          <img
            src={TRUST_AVATARS[0]}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-[0_2px_6px_rgba(15,23,42,0.1)]"
          />
          <blockquote className="text-[14px] text-slate-600 sm:text-[15px]">
            <span className="text-slate-900">
              &ldquo;Tôi cải thiện <span className="font-semibold">90 giây</span>{" "}
              cho thành tích 5K chỉ trong hai tháng.&rdquo;
            </span>{" "}
            <span className="text-slate-500">
              — Mia Carter, vận động viên 5K
            </span>
          </blockquote>
        </motion.figure>
      </div>
    </section>
  );
}

// ============================================================================
// Featured stat — 94% AI accuracy with sparkline + AI insight
// ============================================================================

function FeaturedStat({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduce ? 0 : 0.7, delay: 0.15, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(15,23,42,0.12)] transition-shadow duration-500 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_28px_56px_-20px_rgba(124,58,237,0.18)] sm:p-10"
    >
      {/* Soft accent corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-violet-400/25 to-fuchsia-400/10 blur-3xl opacity-70 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex h-full flex-col">
        {/* Label row */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            <Sparkles size={11} />
            Bộ máy AI
          </span>
          <span className="text-[11.5px] text-slate-400">
            Độ chính xác ghép nối · 8 tuần qua
          </span>
        </div>

        {/* Massive number */}
        <div className="mt-6 flex items-baseline gap-2">
          <span
            className="text-[64px] font-semibold leading-none tracking-[-0.04em] text-slate-900 sm:text-[80px]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            <CountUp value={94} decimals={0} start={inView} reduce={reduce} />
          </span>
          <span className="text-[28px] font-medium leading-none tracking-tight text-slate-400 sm:text-[34px]">
            %
          </span>
        </div>

        <p className="mt-3 text-[15px] leading-snug text-slate-600">
          Độ chính xác ghép nối của AI cải thiện{" "}
          <span className="font-semibold text-slate-900">mỗi tuần</span> — dựa
          trên kết quả đặt lịch thực tế.
        </p>

        {/* Sparkline + delta chip */}
        <div className="mt-6 flex items-end gap-4">
          <Sparkline
            data={ACCURACY_TREND}
            inView={inView}
            reduce={reduce}
            width={220}
            height={56}
          />
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums">
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 1.5L8 6H6.5V8.5h-3V6H2L5 1.5z"
                fill="currentColor"
              />
            </svg>
            +16 điểm
          </span>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
              <Sparkles size={13} />
            </div>
            <p className="text-[12.5px] text-slate-600">
              <span className="font-semibold text-slate-900">
                Mỗi lần ghép nối
              </span>{" "}
              giúp đề xuất kế tiếp chính xác hơn.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Supporting stat row
// ============================================================================

function SupportingStat({
  icon: Icon,
  value,
  decimals,
  suffix,
  label,
  hint,
  showStars,
  inView,
  reduce,
  delay,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  value: number;
  decimals: number;
  suffix: string;
  label: string;
  hint: string;
  showStars?: boolean;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.55,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -2 }}
      className="group relative flex flex-1 items-center gap-5 rounded-[20px] border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(15,23,42,0.04),0_12px_28px_-16px_rgba(15,23,42,0.14)]"
    >
      {/* Icon tile — unified soft slate, single accent */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-50 text-violet-600 transition-colors duration-300 group-hover:bg-violet-50 group-hover:text-violet-700">
        <Icon size={20} />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <p
            className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-slate-900 sm:text-[34px]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            <CountUp
              value={value}
              decimals={decimals}
              start={inView}
              reduce={reduce}
            />
            <span className="text-slate-400">{suffix}</span>
          </p>
          {showStars && <MiniStars inView={inView} reduce={reduce} />}
        </div>
        <p className="mt-1.5 text-[13.5px] font-medium text-slate-700">
          {label}
        </p>
        <p className="text-[12px] text-slate-500">{hint}</p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Count-up
// ============================================================================

function CountUp({
  value,
  decimals,
  start,
  reduce,
}: {
  value: number;
  decimals: number;
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
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [start, value, reduce]);
  return (
    <span className="tabular-nums">
      {display.toLocaleString("vi-VN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

// ============================================================================
// Sparkline — animated path + gradient fill
// ============================================================================

function Sparkline({
  data,
  inView,
  reduce,
  width,
  height,
}: {
  data: number[];
  inView: boolean;
  reduce: boolean;
  width: number;
  height: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const pts = data.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="ssFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="ssStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <motion.path
        d={area}
        fill="url(#ssFill)"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: reduce ? 0 : 0.8,
          delay: reduce ? 0 : 0.8,
          ease: EASE,
        }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="url(#ssStroke)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{
          duration: reduce ? 0 : 1.2,
          delay: reduce ? 0 : 0.55,
          ease: EASE,
        }}
      />
      {/* End point */}
      <motion.circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r={3.5}
        fill="#fff"
        stroke="#7c3aed"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={{
          duration: reduce ? 0 : 0.35,
          delay: reduce ? 0 : 1.7,
        }}
      />
    </svg>
  );
}

// ============================================================================
// Mini stars row (used in 4.9 supporting stat)
// ============================================================================

function MiniStars({
  inView,
  reduce,
}: {
  inView: boolean;
  reduce: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5")}>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
          }
          transition={{
            duration: 0.3,
            delay: reduce ? 0 : 0.7 + i * 0.06,
            ease: EASE,
          }}
          className="inline-flex text-amber-400"
        >
          <Star size={11} fill="currentColor" strokeWidth={0} />
        </motion.span>
      ))}
    </span>
  );
}
