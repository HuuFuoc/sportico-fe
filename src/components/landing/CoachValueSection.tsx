"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  MessageCircle,
  PackageCheck,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as Easing;

const FEATURES = [
  {
    icon: BookOpen,
    title: "Tạo hồ sơ HLV",
    body: "Trình bày chứng chỉ, bộ môn và phong cách huấn luyện của bạn.",
  },
  {
    icon: PackageCheck,
    title: "Đăng gói tập",
    body: "Tạo các gói tập linh hoạt với mô tả, thời lượng và giá rõ ràng.",
  },
  {
    icon: MessageCircle,
    title: "Nhắn tin với học viên",
    body: "Trao đổi trực tiếp trong ứng dụng — trước và sau khi đặt lịch.",
  },
  {
    icon: CalendarDays,
    title: "Quản lý lịch tập",
    body: "Xem và quản lý các buổi tập đã đặt cùng tiến trình của học viên.",
  },
];

export function CoachValueSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      id="for-coaches"
      aria-label="Dành cho huấn luyện viên"
      className="relative overflow-hidden bg-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_85%_50%,rgba(124,58,237,0.06),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — content */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600"
            >
              Dành cho huấn luyện viên
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: reduce ? 0 : 0.6,
                delay: 0.07,
                ease: EASE,
              }}
              className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[42px]"
            >
              Tạo gói tập,{" "}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                quản lý học viên.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: reduce ? 0 : 0.6,
                delay: 0.13,
                ease: EASE,
              }}
              className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-500"
            >
              Sportico giúp huấn luyện viên tập trung vào điều quan trọng nhất
              — huấn luyện. Tạo hồ sơ, đăng gói tập và quản lý học viên trong
              một nơi.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: reduce ? 0 : 0.55,
                delay: 0.22,
                ease: EASE,
              }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href="/onboarding"
                className="group inline-flex items-center gap-2 rounded-[10px] bg-violet-600 px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.4)] transition-all hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-[0_8px_22px_-4px_rgba(124,58,237,0.5)]"
              >
                Tạo hồ sơ HLV
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/coaches"
                className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-5 py-3 text-[13.5px] font-semibold text-slate-700 transition-all hover:border-violet-200 hover:bg-violet-50/40 hover:text-violet-700"
              >
                Xem ví dụ hồ sơ
              </Link>
            </motion.div>
          </div>

          {/* RIGHT — feature grid */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduce ? 0 : 0.55,
                    delay: reduce ? 0 : 0.2 + i * 0.08,
                    ease: EASE,
                  }}
                  whileHover={reduce ? {} : { y: -3 }}
                  className="group rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05),0_12px_28px_-12px_rgba(124,58,237,0.14)]"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600 transition-colors duration-300 group-hover:bg-violet-100">
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                    {f.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
