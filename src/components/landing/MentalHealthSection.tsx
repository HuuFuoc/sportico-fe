"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef } from "react";
import { Battery, Heart, Moon, Repeat2 } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as Easing;

const PRINCIPLES = [
  {
    icon: Heart,
    title: "Tập vừa sức",
    body: "Không nhất thiết phải tập thật nhiều. Quan trọng là đúng cách và đều đặn theo hướng dẫn của HLV.",
  },
  {
    icon: Repeat2,
    title: "Duy trì thói quen",
    body: "Một buổi tập ngắn mỗi ngày hiệu quả hơn một buổi tập dài mỗi tuần. Sportico giúp bạn giữ nhịp.",
  },
  {
    icon: Battery,
    title: "Biết lúc nghỉ ngơi",
    body: "Nghỉ ngơi không phải thất bại — đó là một phần của lộ trình. HLV sẽ điều chỉnh lịch tập cho bạn.",
  },
  {
    icon: Moon,
    title: "Không áp lực so sánh",
    body: "Mỗi người có lộ trình khác nhau. Sportico tập trung vào tiến trình của riêng bạn.",
  },
];

export function MentalHealthSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      aria-label="Sức khỏe tinh thần trước tiên"
      className="relative overflow-hidden bg-slate-50/60 border-y border-slate-200/60"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(99,102,241,0.06),transparent_60%)]" />
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
            Triết lý Sportico
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.07, ease: EASE }}
            className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[44px]"
          >
            Sức khỏe tinh thần{" "}
            <span className="pt-[0.15em] bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              trước tiên.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.13, ease: EASE }}
            className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-slate-500"
          >
            Tập luyện đều đặn, vừa sức và có định hướng. Sportico không khuyến
            khích cường độ cao bằng mọi giá — mà hướng đến sự bền vững lâu
            dài.
          </motion.p>
        </div>

        {/* ===== PRINCIPLES GRID ===== */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: reduce ? 0 : 0.55,
                  delay: reduce ? 0 : 0.15 + i * 0.08,
                  ease: EASE,
                }}
                whileHover={reduce ? {} : { y: -4 }}
                className="group rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05),0_12px_28px_-12px_rgba(99,102,241,0.15)]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-100">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                  {p.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
