"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, Calendar, Sparkles } from "lucide-react";
import { avatarFor } from "@/lib/utils";
import { ClientOnly } from "@/components/common/ClientOnly";

type Variant = "login" | "register";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Image-led badminton athlete hero for the auth split layout.
 *
 * Visual language is intentionally aligned with the public landing hero
 * (HeroSection.tsx): deep `#0a0a0e` base, real athlete photography, indigo
 * /violet glow blobs, deterministic sparkle particles, bold uppercase
 * typography, "SPORTICO" brand watermark. Photos are loaded remotely as
 * prototype/reference imagery — see `HERO_IMAGES` for sources. Hidden on
 * mobile by the parent layout.
 */

// ─── Local athlete imagery (public/) ─────────────────────────────────────────
// Loaded as native <img> backgrounds (no Next/Image), served from /public so
// no next.config.ts remote-pattern change is needed and no external hotlinking.
const HERO_IMAGES = {
  login: {
    src: "/login.png",
    objectPosition: "center 18%",
  },
  register: {
    src: "/register.png",
    objectPosition: "center 28%",
  },
} as const;

// Deterministic sparkle positions (SSR-safe, same recipe as HeroSection)
const SPARKLES = Array.from({ length: 12 }, (_, i) => {
  const seed = Math.sin(i * 11.13) * 10000;
  const x = Math.abs(seed) % 100;
  const y = Math.abs(seed * 1.7) % 100;
  const size = 2 + (Math.abs(seed * 0.31) % 3);
  const delay = (Math.abs(seed * 0.19) % 6).toFixed(2);
  const duration = (5 + (Math.abs(seed * 0.07) % 5)).toFixed(2);
  return { x, y, size, delay, duration };
});

export function AuthVisualPanel({ variant }: { variant?: Variant }) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const resolved: Variant =
    variant ?? (pathname?.startsWith("/register") ? "register" : "login");
  const isRegister = resolved === "register";
  const hero = HERO_IMAGES[resolved];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#0a0a0e] text-white">
      {/* ============ BACKGROUND IMAGE ============ */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1.04, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 1.4, ease: EASE }}
        className="absolute inset-0"
      >
        <img
          src={hero.src}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          style={{ objectPosition: hero.objectPosition }}
        />
      </motion.div>

      {/* ============ OVERLAYS / GRADIENTS ============ */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Left-heavy dark fade for headline legibility — matches landing hero */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/65 to-black/25" />
        {/* Top fade so brand/logo reads cleanly */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
        {/* Bottom fade for watermark + microbadge strip */}
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#0a0a0e] via-black/75 to-transparent" />

        {/* Sparkle particles — client-only to avoid SSR/client style mismatch.
            motion/react serializes px and % values differently on the server
            (rounded strings) vs the client (raw numbers), causing a hydration
            warning even though the SPARKLES array is deterministic. */}
        <ClientOnly>
          {SPARKLES.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={
                reduce
                  ? { opacity: 0.4, scale: 1 }
                  : { opacity: [0, 0.6, 0], scale: [0, 1, 0], y: [0, -28] }
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
        </ClientOnly>

        {/* Indigo glow blob — bottom-left, breathing */}
        <motion.div
          animate={
            reduce
              ? {}
              : { opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-24 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-600/30 blur-[140px]"
        />
        {/* Violet glow blob — mid-right, softer */}
        <motion.div
          animate={
            reduce
              ? {}
              : { opacity: [0.18, 0.4, 0.18], scale: [1, 1.05, 1] }
          }
          transition={{
            duration: 11,
            repeat: Infinity,
            delay: 1.2,
            ease: "easeInOut",
          }}
          className="absolute -right-24 top-1/3 h-[340px] w-[340px] rounded-full bg-violet-600/25 blur-[130px]"
        />
      </div>

      {/* ============ BRAND WATERMARK ============ */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: 0.3 }}
        className="pointer-events-none absolute inset-x-0 bottom-[-2vw] flex justify-center"
      >
        <span
          className="select-none whitespace-nowrap text-[14vw] font-black leading-none tracking-[-0.04em] text-white/[0.05]"
          style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.10)",
            fontFamily: "var(--font-sans)",
          }}
        >
          SPORTICO™
        </span>
      </motion.div>

      {/* ============ TOP — brand + back ============ */}
      <div className="relative z-20 flex items-center justify-between p-10 lg:p-12 xl:p-14">
        <Link
          href="/"
          aria-label="Sportico — trang chủ"
          className="inline-flex items-center gap-2.5"
        >
          <img
            src="/logo.png"
            alt="Sportico"
            className="h-9 w-auto rounded-[6px] shadow-[0_4px_14px_-2px_rgba(53,37,205,0.55)] ring-1 ring-white/15"
          />
          <span className="hidden text-[15px] font-semibold tracking-tight text-white sm:inline">
            Sportico
          </span>
        </Link>
        <Link
          href="/"
          className="group hidden items-center gap-1 text-[12.5px] font-medium text-white/55 transition-colors hover:text-white sm:inline-flex"
        >
          Về trang chủ
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* ============ HEADLINE BLOCK ============ */}
      <div className="relative z-20 max-w-[540px] px-10 lg:px-12 xl:px-14">
        {/* Live badge — matches HeroSection PulsingBadge */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm"
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Sportico · Cầu lông
          <span className="ml-1 text-white/40">|</span>
          <Sparkles size={11} className="text-violet-300" />
        </motion.span>

        {/* Bold headline. Sentence-case (not uppercase) so Vietnamese
            diacritics don't crash the line height. `leading-[1.05]` gives
            tone marks breathing room. Clamp prevents blowout on widescreens. */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.7, delay: 0.08, ease: EASE }}
          className="mt-6 font-black tracking-[-0.025em] text-white"
          style={{ fontSize: "clamp(34px, 3.4vw, 50px)", lineHeight: 1.05 }}
        >
          {isRegister ? (
            <>
              <span className="block">Gia nhập sân đấu.</span>
              <span className="block bg-[linear-gradient(110deg,#ffffff_0%,#c7c4ff_40%,#a78bfa_60%,#ffffff_100%)] bg-clip-text text-transparent">
                Xây dựng hành trình tập luyện.
              </span>
            </>
          ) : (
            <>
              <span className="block">Tập luyện cùng nhà vô địch.</span>
              <span className="block bg-[linear-gradient(110deg,#ffffff_0%,#c7c4ff_40%,#a78bfa_60%,#ffffff_100%)] bg-clip-text text-transparent">
                Bắt đầu rally tiếp theo.
              </span>
            </>
          )}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, delay: 0.16, ease: EASE }}
          className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/65"
        >
          {isRegister
            ? "Tạo tài khoản, xác minh email và bắt đầu tập luyện cùng các huấn luyện viên cầu lông tại Sportico."
            : "Kết nối với huấn luyện viên cầu lông đã xác thực, theo dõi buổi tập và duy trì nhịp tiến bộ mỗi ngày."}
        </motion.p>
      </div>

      {/* ============ BOTTOM — small inline microbadges + trust ============ */}
      <div className="relative z-20 p-10 pt-8 lg:p-12 lg:pt-8 xl:p-14 xl:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, delay: 0.28, ease: EASE }}
          className="flex flex-wrap gap-2"
        >
          {isRegister ? (
            <>
              <MicroPill
                icon={<BadgeCheck size={13} className="text-emerald-300" />}
                label="Hơn 320 HLV đã xác thực"
              />
              <MicroPill
                icon={<Sparkles size={12} className="text-violet-300" />}
                label="AI sẵn sàng ghép nối"
              />
              <MicroPill
                icon={<Calendar size={12} className="text-white/80" />}
                label="Buổi đầu miễn phí 30 phút"
              />
            </>
          ) : (
            <>
              <MicroPill
                icon={<BadgeCheck size={13} className="text-emerald-300" />}
                label="HLV cầu lông đã xác thực"
              />
              <MicroPill
                icon={<Sparkles size={12} className="text-violet-300" />}
                label="AI sẵn sàng ghép nối"
              />
              <MicroPill
                icon={<Calendar size={12} className="text-white/80" />}
                label="Buổi tập tiếp theo · 19:30"
              />
            </>
          )}
        </motion.div>

        {/* Members card — matches HeroSection bottom-right pill */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, delay: 0.38, ease: EASE }}
          className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-2 py-2 backdrop-blur-md"
        >
          <div className="flex -space-x-2">
            {["learner-11", "learner-2", "learner-6"].map((seed) => (
              <img
                key={seed}
                src={avatarFor(seed)}
                alt=""
                className="h-7 w-7 rounded-full border-2 border-black object-cover"
              />
            ))}
          </div>
          <div className="pr-1 text-[12px] leading-tight">
            <p className="font-bold text-white tabular-nums">2.000+</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">
              VĐV
            </p>
          </div>
          <span className="mx-1 inline-block h-6 w-px bg-white/15" />
          <img
            src={avatarFor("coach-1")}
            alt=""
            className="h-9 w-9 rounded-full border-2 border-violet-400 object-cover shadow-[0_0_0_4px_rgba(167,139,250,0.18)]"
          />
        </motion.div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Subtle inline pill — used at the bottom of the hero                       */
/* ────────────────────────────────────────────────────────────────────────── */

function MicroPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-white/85 backdrop-blur-sm">
      {icon}
      {label}
    </span>
  );
}
