"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef } from "react";
import { Quote, Sparkles, Star } from "lucide-react";
import { avatarFor, cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  metric: string;
  metricLabel: string;
  quote: string;
  highlight: string; // a phrase from the quote to bold visually
  sport: string;
}

const FEATURED: Testimonial = {
  name: "Mia Carter",
  role: "Vận động viên 5K",
  avatar: avatarFor("learner-11"),
  metric: "−90 giây",
  metricLabel: "thành tích 5K trong 2 tháng",
  quote:
    "Lần ghép đầu tiên đã đúng người luôn. Tôi cải thiện 90 giây cho 5K chỉ trong hai tháng — và giờ tôi mong chờ mỗi buổi tập.",
  highlight: "cải thiện 90 giây cho 5K chỉ trong hai tháng",
  sport: "Chạy bộ",
};

const SUPPORTING: Testimonial[] = [
  {
    name: "Alex Rivera",
    role: "Vận động viên marathon",
    avatar: avatarFor("learner-1"),
    metric: "+24 giờ",
    metricLabel: "đã tập · 12 tuần",
    quote:
      "HLV của tôi hiểu mục tiêu vận động ngay từ trước cuộc gọi đầu tiên. Đặt lịch, kế hoạch và tiến độ cuối cùng cũng nằm gọn ở một nơi.",
    highlight: "một nơi gọn gàng",
    sport: "Marathon",
  },
  {
    name: "Daniel Wong",
    role: "Boxer nghiệp dư",
    avatar: avatarFor("learner-6"),
    metric: "4,9★",
    metricLabel: "đánh giá HLV",
    quote:
      "Tôi đã thử ba nền tảng trước khi đến đây. Chất lượng HLV và độ chính xác của AI ghép nối ở Sportico thực sự thuộc một đẳng cấp khác.",
    highlight: "một đẳng cấp khác",
    sport: "Boxing",
  },
];

const MARQUEE_QUOTES = [
  { name: "Sara", role: "HIIT", quote: "Hai tháng tập tốt nhất từ trước đến nay." },
  { name: "Jordan", role: "Yoga", quote: "Cuối cùng cũng có HLV thực sự hiểu mình." },
  { name: "Priya", role: "Đạp xe", quote: "FTP tăng 14% chỉ trong 6 tuần." },
  { name: "Mateo", role: "Sức mạnh", quote: "Cuối cùng kỹ thuật cũng đúng chuẩn." },
  { name: "Aiko", role: "Bơi", quote: "Cảm thấy được lắng nghe ngay từ ngày đầu." },
];

export function TestimonialsSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      aria-label="Vận động viên tập luyện có mục tiêu"
      className="relative overflow-hidden bg-slate-50/60"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(124,58,237,0.06),transparent_60%),radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(6,182,212,0.04),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ============ HEADER ============ */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700"
          >
            <Sparkles size={11} />
            Bằng chứng, không phải lời hứa
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.6,
              delay: 0.06,
              ease: EASE,
            }}
            className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.025em] text-slate-900 sm:text-[44px]"
          >
            Những vận động viên tập luyện{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              có chủ đích.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.6,
              delay: 0.12,
              ease: EASE,
            }}
            className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-slate-500"
          >
            Kết quả thật từ học viên trên nền tảng — được đo lường, không phải
            tưởng tượng.
          </motion.p>
        </div>

        {/* ============ ASYMMETRIC GRID: featured + 2 supporting ============ */}
        <div className="mt-14 grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
          {/* FEATURED */}
          <FeaturedQuote
            t={FEATURED}
            inView={inView}
            reduce={reduce ?? false}
          />

          {/* 2 supporting stacked */}
          <div className="flex flex-col gap-5">
            {SUPPORTING.map((t, i) => (
              <SupportingQuote
                key={t.name}
                t={t}
                inView={inView}
                reduce={reduce ?? false}
                delay={0.35 + i * 0.1}
              />
            ))}
          </div>
        </div>

        {/* ============ MARQUEE STRIP ============ */}
        <MarqueeStrip
          quotes={MARQUEE_QUOTES}
          reduce={reduce ?? false}
          inView={inView}
        />
      </div>
    </section>
  );
}

// ============================================================================
// Featured quote
// ============================================================================

function FeaturedQuote({
  t,
  inView,
  reduce,
}: {
  t: Testimonial;
  inView: boolean;
  reduce: boolean;
}) {
  const beforeHighlight = t.quote.split(t.highlight)[0];
  const afterHighlight = t.quote.split(t.highlight)[1] ?? "";

  return (
    <motion.figure
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.7,
        delay: 0.2,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -4 }}
      className="group relative overflow-hidden rounded-[24px] border border-violet-200/60 bg-white p-8 shadow-[0_4px_16px_rgba(124,58,237,0.08),0_24px_56px_-20px_rgba(124,58,237,0.22)] transition-shadow duration-500 hover:shadow-[0_6px_22px_rgba(124,58,237,0.12),0_32px_72px_-20px_rgba(124,58,237,0.3)] sm:p-10"
    >
      {/* Glow corners */}
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
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/15 blur-3xl"
      />

      {/* Quote icon ghost */}
      <Quote
        aria-hidden
        size={56}
        className="absolute -left-2 -top-3 text-violet-100"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.3,
                  delay: reduce ? 0 : 0.45 + i * 0.06,
                  ease: EASE,
                }}
                className="inline-flex"
              >
                <Star size={14} fill="currentColor" strokeWidth={0} />
              </motion.span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/60 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
            <Sparkles size={9} />
            Câu chuyện nổi bật
          </span>
        </div>

        {/* Big metric */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: reduce ? 0 : 0.6,
            delay: reduce ? 0 : 0.4,
            ease: EASE,
          }}
          className="mt-6 flex items-baseline gap-3"
        >
          <span
            className="bg-gradient-to-br from-violet-600 to-fuchsia-500 bg-clip-text text-[64px] font-semibold leading-none tracking-[-0.04em] text-transparent tabular-nums sm:text-[80px]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            {t.metric}
          </span>
          <span className="text-[13px] text-slate-500">{t.metricLabel}</span>
        </motion.div>

        {/* Quote */}
        <blockquote className="mt-6 text-[17px] leading-relaxed text-slate-700 sm:text-[18px]">
          <span className="text-slate-400">&ldquo;</span>
          {beforeHighlight}
          <span className="font-semibold text-slate-900">{t.highlight}</span>
          {afterHighlight}
          <span className="text-slate-400">&rdquo;</span>
        </blockquote>

        {/* Footer */}
        <figcaption className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5">
          <div className="relative">
            <img
              src={t.avatar}
              alt={t.name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_-2px_rgba(15,23,42,0.15)]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 ring-2 ring-white">
              <Sparkles size={8} className="text-white" />
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-slate-900">
              {t.name}
            </p>
            <p className="text-[12px] text-slate-500">
              {t.role} ·{" "}
              <span className="font-medium text-violet-700">{t.sport}</span>
            </p>
          </div>
        </figcaption>
      </div>
    </motion.figure>
  );
}

// ============================================================================
// Supporting quote (smaller)
// ============================================================================

function SupportingQuote({
  t,
  inView,
  reduce,
  delay,
}: {
  t: Testimonial;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.6,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative flex flex-1 flex-col rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.1)] transition-all duration-500 hover:border-violet-200 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_18px_40px_-16px_rgba(124,58,237,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
        <span className="inline-flex items-baseline gap-1 rounded-[8px] bg-gradient-to-br from-violet-50 to-fuchsia-50 px-2.5 py-1 ring-1 ring-violet-200/50">
          <span className="text-[15px] font-semibold leading-none text-violet-700 tabular-nums">
            {t.metric}
          </span>
          <span className="text-[10px] text-slate-500">{t.metricLabel}</span>
        </span>
      </div>

      <blockquote className="mt-4 flex-1 text-[14px] leading-relaxed text-slate-700">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-2.5 border-t border-slate-100 pt-3.5">
        <img
          src={t.avatar}
          alt={t.name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-slate-900">{t.name}</p>
          <p className="text-[11.5px] text-slate-500">
            {t.role} ·{" "}
            <span className="font-medium text-violet-700">{t.sport}</span>
          </p>
        </div>
      </figcaption>
    </motion.figure>
  );
}

// ============================================================================
// Marquee strip — small quotes scrolling
// ============================================================================

function MarqueeStrip({
  quotes,
  reduce,
  inView,
}: {
  quotes: typeof MARQUEE_QUOTES;
  reduce: boolean;
  inView: boolean;
}) {
  // Duplicate for seamless loop
  const items = [...quotes, ...quotes];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: reduce ? 0 : 0.6, delay: 0.7 }}
      className="relative mt-16 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
      }}
    >
      <motion.div
        animate={
          reduce
            ? {}
            : {
                x: ["0%", "-50%"],
              }
        }
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="flex w-max items-center gap-3"
      >
        {items.map((q, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <Quote size={10} className="text-violet-500" />
            <span className="text-slate-700">&ldquo;{q.quote}&rdquo;</span>
            <span className="text-slate-400">—</span>
            <span className="font-semibold text-slate-900">{q.name}</span>
            <span
              className={cn(
                "rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-500",
              )}
            >
              {q.role}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
