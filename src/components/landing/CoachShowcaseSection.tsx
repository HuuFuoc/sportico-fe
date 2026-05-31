"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import type { Coach } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as Easing;

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "tennis", label: "Tennis" },
  { id: "strength", label: "Sức mạnh" },
  { id: "recovery", label: "Phục hồi" },
  { id: "ai", label: "AI hướng dẫn" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function CoachShowcaseSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const { data: coachesData } = useApiResource(() => api.fetchCoaches(), []);
  const coaches = useMemo(() => (coachesData ?? []).slice(0, 3), [coachesData]);

  return (
    <section
      ref={ref}
      aria-label="Sàn huấn luyện viên"
      className="relative overflow-hidden bg-white"
    >
      {/* Subtle gradients */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_15%,rgba(124,58,237,0.06),transparent_60%),radial-gradient(ellipse_50%_40%_at_90%_85%,rgba(236,72,153,0.04),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        {/* ============ HEADER ============ */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700"
            >
              <BadgeCheck size={11} />
              Sàn huấn luyện viên
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
              Những huấn luyện viên{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                đáng để gửi gắm.
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
              className="mt-4 text-[15.5px] leading-relaxed text-slate-500"
            >
              Mọi hồ sơ đều được xác minh danh tính và kiểm tra chứng chỉ trước
              khi xuất hiện — trên 13 bộ môn.
            </motion.p>
          </div>

          {/* Browse all CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.55,
              delay: 0.18,
              ease: EASE,
            }}
          >
            <Link
              href="/coaches"
              className="group inline-flex items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-violet-300 hover:bg-violet-50/40 hover:text-violet-700 hover:shadow-[0_2px_8px_-2px_rgba(124,58,237,0.2)]"
            >
              Xem tất cả HLV
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        </div>

        {/* ============ FILTER PILLS ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: reduce ? 0 : 0.55,
            delay: 0.22,
            ease: EASE,
          }}
          className="mt-10 flex flex-wrap items-center gap-2"
        >
          <div className="inline-flex items-center gap-1 rounded-[12px] border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-[8px] px-3 text-[12.5px] font-semibold transition-colors",
                  activeFilter === f.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                {activeFilter === f.id && (
                  <motion.span
                    layoutId="coachFilterPill"
                    className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-[0_4px_14px_-2px_rgba(124,58,237,0.45)]"
                    transition={{
                      type: "spring",
                      duration: reduce ? 0 : 0.4,
                      bounce: 0.2,
                    }}
                  />
                )}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>

          {/* Verified indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <BadgeCheck size={12} />
            Hồ sơ đã xác minh
          </span>
        </motion.div>

        {/* ============ COACH CARDS GRID ============
            Asymmetric column track gives the featured card visual weight via
            WIDTH instead of `row-span-2` — the previous row-span left phantom
            row-2 cells in cols 2 and 3, producing the "floating disconnected
            cards" + white-void feeling. */}
        <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          {coaches.map((coach, i) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              featured={i === 0}
              inView={inView}
              reduce={reduce ?? false}
              delay={0.32 + i * 0.1}
            />
          ))}
        </div>

        {/* ============ Bottom strip ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: reduce ? 0 : 0.55,
            delay: 0.7,
            ease: EASE,
          }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 text-center"
        >
          <Sparkles size={14} className="text-violet-600" />
          <p className="text-[13.5px] text-slate-600">
            Xem thêm huấn luyện viên trên nhiều bộ môn khác nhau ·{" "}
            <Link
              href="/coaches"
              className="font-semibold text-violet-700 underline-offset-4 hover:underline"
            >
              Khám phá toàn bộ sàn →
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Coach card with premium hover
// ============================================================================

function CoachCard({
  coach,
  featured,
  inView,
  reduce,
  delay,
}: {
  coach: Coach;
  featured?: boolean;
  inView: boolean;
  reduce: boolean;
  delay: number;
}) {
  // Deterministic open-slots count
  const slots = useMemo(() => {
    const hash = Array.from(coach.id).reduce(
      (a, c) => a + c.charCodeAt(0),
      0,
    );
    return 2 + (hash % 6);
  }, [coach.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduce ? 0 : 0.65,
        delay: reduce ? 0 : delay,
        ease: EASE,
      }}
      whileHover={reduce ? {} : { y: -6 }}
    >
    <SpotlightCard
      radius={280}
      color="rgba(124,58,237,0.09)"
      className={cn(
        "group flex flex-col overflow-hidden rounded-[22px] border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_14px_36px_-18px_rgba(15,23,42,0.1)] transition-all duration-500 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_24px_50px_-20px_rgba(124,58,237,0.2)]",
        featured
          ? "border-violet-200/60"
          : "border-slate-200 hover:border-violet-200",
      )}
    >
      {/* Featured ribbon */}
      {featured && (
        <div className="absolute right-3 top-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.5)]">
            <Sparkles size={9} />
            Lựa chọn hàng đầu
          </span>
        </div>
      )}

      {/* Cover image area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-100">
        <motion.img
          src={coach.avatarUrl}
          alt={coach.name}
          initial={{ scale: 1.08 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{
            duration: reduce ? 0 : 1.2,
            delay: reduce ? 0 : delay + 0.1,
            ease: "easeOut",
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {/* Bottom gradient for text */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

        {/* Verified pill */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-semibold text-slate-900 backdrop-blur">
          <BadgeCheck size={11} className="text-emerald-600" />
          Đã xác thực
        </div>

        {/* Rating top right */}
        {!featured && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 backdrop-blur">
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {coach.rating.toFixed(1)}
          </div>
        )}

        {/* Bottom: name + sport */}
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">
              {coach.name}
            </p>
            <p className="truncate text-[11.5px] text-white/85">
              {coach.headline}
            </p>
          </div>
          {featured && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">
              <Star size={10} fill="currentColor" strokeWidth={0} />
              {coach.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">

        {/* Specialty tags */}
        <div className="flex flex-wrap gap-1.5">
          {coach.specialties.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11.5px]">
          {coach.location?.trim() ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <MapPin size={11} />
              {coach.location.split(",")[0]}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Calendar size={11} />
            <span className="tabular-nums font-semibold">{slots}</span>
            <span className="text-slate-500">slot / tuần</span>
          </span>
        </div>

        {/* Action */}
        <div className="mt-3 flex items-center justify-end">
          <Link
            href={`/coaches/${coach.id}`}
            className="group/cta inline-flex items-center gap-1 rounded-[10px] bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(15,23,42,0.3)] transition-all hover:bg-violet-600 hover:shadow-[0_6px_18px_-2px_rgba(124,58,237,0.5)]"
          >
            Xem chi tiết
            <ArrowRight
              size={12}
              className="transition-transform group-hover/cta:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </SpotlightCard>
    </motion.div>
  );
}
