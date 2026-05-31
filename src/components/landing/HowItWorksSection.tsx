"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef } from "react";
import {
  ArrowRight,
  CalendarDays,
  MessageCircle,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

interface Step {
  num: string;
  icon: LucideIcon;
  title: string;
  body: string;
  accent: "indigo" | "violet" | "emerald" | "amber";
}

const STEPS: Step[] = [
  {
    num: "01",
    icon: Search,
    title: "Khám phá huấn luyện viên",
    body: "Xem hồ sơ, chứng chỉ, bộ môn và gói tập của từng HLV. Lọc theo bộ môn, khu vực hoặc phong cách huấn luyện.",
    accent: "indigo",
  },
  {
    num: "02",
    icon: MessageCircle,
    title: "Nhắn tin trước khi đặt lịch",
    body: "Hỏi thăm HLV trước — không cần cam kết ngay. Hiểu rõ phong cách, kỳ vọng và lộ trình trước khi chọn gói.",
    accent: "violet",
  },
  {
    num: "03",
    icon: CalendarDays,
    title: "Chọn gói và đặt lịch",
    body: "Chọn gói tập phù hợp với ngân sách và thời gian. Thanh toán an toàn, lịch tập rõ ràng.",
    accent: "emerald",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Theo dõi lộ trình",
    body: "Xem kế hoạch tập luyện, nhật ký buổi tập và phản hồi từ HLV — tất cả trong một nơi.",
    accent: "amber",
  },
];

const ACCENT_MAP = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    num: "text-indigo-100 group-hover:text-indigo-50",
    dot: "bg-indigo-500",
    label: "text-indigo-600",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    num: "text-violet-100 group-hover:text-violet-50",
    dot: "bg-violet-500",
    label: "text-violet-600",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    num: "text-emerald-100 group-hover:text-emerald-50",
    dot: "bg-emerald-500",
    label: "text-emerald-600",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    num: "text-amber-100 group-hover:text-amber-50",
    dot: "bg-amber-500",
    label: "text-amber-600",
  },
} as const;

export function HowItWorksSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="how-it-works"
      aria-label="Sportico hoạt động như thế nào"
      className="relative overflow-hidden bg-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_0%,rgba(99,102,241,0.07),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ===== HEADER ===== */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600"
          >
            Cách hoạt động
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.07, ease: EASE }}
            className="mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[44px]"
          >
            Từ tìm kiếm đến{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              tập luyện có định hướng.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.13, ease: EASE }}
            className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-slate-500"
          >
            Sportico giúp bạn tìm HLV, nhắn tin, đặt gói và theo dõi tiến trình
            — tất cả trong một nơi.
          </motion.p>
        </div>

        {/* ===== STEPS GRID ===== */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <StepCard
              key={step.num}
              step={step}
              index={i}
              inView={inView}
              reduce={reduce ?? false}
              isLast={i === STEPS.length - 1}
            />
          ))}
        </div>

        {/* ===== CTA ===== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.85, ease: EASE }}
          className="mt-12 flex justify-center"
        >
          <Link
            href="/coaches"
            className="group inline-flex items-center gap-2 rounded-[10px] bg-slate-900 px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(15,23,42,0.25)] transition-all hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-[0_8px_22px_-4px_rgba(99,102,241,0.45)]"
          >
            Tìm huấn luyện viên
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Step card
// ============================================================================

function StepCard({
  step,
  index,
  inView,
  reduce,
  isLast,
}: {
  step: Step;
  index: number;
  inView: boolean;
  reduce: boolean;
  isLast: boolean;
}) {
  const Icon = step.icon;
  const ac = ACCENT_MAP[step.accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : 0.15 + index * 0.1,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.1)] transition-all duration-400 hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_18px_40px_-14px_rgba(15,23,42,0.14)]",
        // Connector line after each step except last — on lg only
        !isLast && "lg:after:absolute lg:after:-right-3 lg:after:top-8 lg:after:h-px lg:after:w-6 lg:after:bg-slate-200 lg:after:content-['']",
      )}
    >
      {/* Ghost big number */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-4 top-2 select-none text-[80px] font-black leading-none tracking-[-0.04em] transition-colors duration-400",
          ac.num,
        )}
      >
        {step.num}
      </span>

      <div className="relative">
        {/* Step label */}
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", ac.label)}>
          Bước {step.num}
        </span>

        {/* Icon tile */}
        <div
          className={cn(
            "mt-3 inline-flex h-11 w-11 items-center justify-center rounded-[13px] transition-colors duration-300",
            ac.icon,
          )}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-slate-900">
          {step.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
          {step.body}
        </p>
      </div>
    </motion.div>
  );
}
