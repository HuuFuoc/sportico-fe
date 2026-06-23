"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import {
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as Easing;

// Deterministic sparkle positions
const SPARKLES = Array.from({ length: 22 }, (_, i) => {
  const seed = Math.sin(i * 13.37) * 10000;
  const x = Math.abs(seed) % 100;
  const y = Math.abs(seed * 1.7) % 100;
  const size = 1.5 + (Math.abs(seed * 0.31) % 2.5);
  const delay = (Math.abs(seed * 0.19) % 6).toFixed(2);
  const duration = (5 + (Math.abs(seed * 0.07) % 5)).toFixed(2);
  return { x, y, size, delay, duration };
});

export function FinalCTASection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  // CTA magnetic hover
  const btnRef = useRef<HTMLAnchorElement>(null);
  const onBtnMove = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (reduce) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
    btnRef.current?.style.setProperty("--bx", `${x}px`);
    btnRef.current?.style.setProperty("--by", `${y}px`);
  };
  const onBtnLeave = () => {
    btnRef.current?.style.setProperty("--bx", "0px");
    btnRef.current?.style.setProperty("--by", "0px");
  };


  return (
    <section
      ref={ref}
      aria-label="Bắt đầu tập luyện cùng Sportico"
      className="relative bg-white px-4 pb-12 pt-6 sm:px-6 sm:pb-16 lg:pb-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1e1b4b_0%,#3b1d75_30%,#7c3aed_60%,#ec4899_100%)] px-6 py-16 text-center shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45)] sm:px-12 sm:py-24"
      >
        {/* ============ BACKGROUND LAYERS ============ */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Soft grid */}
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:60px_60px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000,transparent)]" />

          {/* Mesh blobs */}
          <motion.div
            animate={{
              x: [0, 32, -16, 0],
              y: [0, -16, 24, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 18, repeat: Infinity, ease: "easeInOut" }
            }
            className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -28, 12, 0],
              y: [0, 20, -12, 0],
              scale: [1, 0.95, 1.08, 1],
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
            }
            className="absolute -right-12 bottom-0 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.55, 0.3] }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 8, repeat: Infinity, ease: "easeInOut" }
            }
            className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/20 blur-[120px]"
          />

          {/* Sparkles */}
          {SPARKLES.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={
                inView && !reduce
                  ? {
                      opacity: [0, 0.75, 0],
                      scale: [0, 1, 0],
                      y: [0, -30],
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
              className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
            />
          ))}

          {/* Conic accent ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 60, repeat: Infinity, ease: "linear" }
            }
            className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 [background:conic-gradient(from_0deg,transparent_55%,rgba(255,255,255,0.4)_70%,transparent_85%,rgba(255,255,255,0.25)_95%,transparent)] [mask-image:radial-gradient(circle,transparent_55%,#000_58%,#000_60%,transparent_62%)]"
          />
        </div>

        <div className="relative">

          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.55,
              delay: 0.22,
              ease: EASE,
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur"
          >
            <Sparkles size={11} />
            Bắt đầu miễn phí
            <span className="ml-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-950">
              Không cần thẻ
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.7,
              delay: 0.3,
              ease: EASE,
            }}
            className="mx-auto mt-6 max-w-3xl text-[36px] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-[52px]"
          >
            Bắt đầu tập luyện{" "}
            <span className="bg-[linear-gradient(110deg,#fff_0%,#f0abfc_45%,#67e8f9_100%)] bg-clip-text text-transparent">
              có định hướng.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.65,
              delay: 0.4,
              ease: EASE,
            }}
            className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-white/75 sm:text-[17px]"
          >
            Tìm huấn luyện viên phù hợp, nhắn tin để hiểu nhau, chọn gói tập
            và theo dõi tiến trình — tất cả trong một nơi.
          </motion.p>

          {/* CTA cluster */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: reduce ? 0 : 0.65,
              delay: 0.5,
              ease: EASE,
            }}
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <Link
              ref={btnRef}
              onMouseMove={onBtnMove}
              onMouseLeave={onBtnLeave}
              href="/coaches"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-[12px] bg-white px-6 py-3.5 text-[14.5px] font-semibold text-slate-900 shadow-[0_18px_42px_-12px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.02]"
              style={
                {
                  transform: "translate(var(--bx, 0), var(--by, 0))",
                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                } as React.CSSProperties
              }
            >
              {/* Shimmer sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(124,58,237,0.18)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer"
              />
              <Rocket
                size={16}
                className="relative text-violet-700"
                strokeWidth={2.5}
              />
              <span className="relative">Tìm huấn luyện viên</span>
              <ArrowRight
                size={15}
                className="relative text-violet-700 transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[12px] border border-white/30 bg-white/5 px-6 py-3.5 text-[14.5px] font-semibold text-white backdrop-blur transition-all hover:border-white/50 hover:bg-white/10"
            >
              Đăng ký miễn phí
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>

          {/* Trust signals row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{
              duration: reduce ? 0 : 0.6,
              delay: 0.7,
            }}
            className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/15 pt-7 text-[11.5px] text-white/65"
          >
            <TrustItem icon={ShieldCheck} label="Hồ sơ HLV đã xác minh" />
            <TrustItem icon={Lock} label="Bảo mật thông tin người dùng" />
            <TrustItem icon={Users} label="Hủy bất cứ lúc nào" />
          </motion.div>

          {/* Are-you-a-coach link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: reduce ? 0 : 0.55, delay: 0.9 }}
            className="mx-auto mt-7 inline-flex items-center gap-2 text-[12.5px] text-white/65"
          >
            <span>Bạn là huấn luyện viên?</span>
            <Link
              href="/onboarding"
              className="group inline-flex items-center gap-1 font-semibold text-white underline-offset-4 hover:underline"
            >
              Tạo hồ sơ và quản lý học viên
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: typeof Lock;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={12} className="text-emerald-300" />
      {label}
    </span>
  );
}

