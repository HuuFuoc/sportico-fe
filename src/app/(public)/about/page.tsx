"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion, type Easing } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Gauge,
  HandHeart,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

const EASE: Easing = [0.16, 1, 0.3, 1];

// ─── tiny animation helpers ────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: reduce ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  label,
  children,
  className,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={cn("px-4 sm:px-6", className)}
    >
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </section>
  );
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-container-lowest">
      <PublicNavbar variant="solid" />

      <main>
        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <HeroSection />

        {/* ── 2. Why Sportico ─────────────────────────────────────────────── */}
        <WhySection />

        {/* ── 3. For learners / coaches ────────────────────────────────────── */}
        <AudienceSection />

        {/* ── 4. Core values ──────────────────────────────────────────────── */}
        <ValuesSection />

        {/* ── 5. How it works ─────────────────────────────────────────────── */}
        <HowItWorksSection />

        {/* ── 6. Principles ───────────────────────────────────────────────── */}
        <PrinciplesSection />

        {/* ── 7. Final CTA ────────────────────────────────────────────────── */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Hero
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <Section
      label="Giới thiệu Sportico"
      className="pb-16 pt-12 sm:pb-20 sm:pt-16"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left — copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          >
            <Eyebrow>
              <Sparkles size={11} />
              Về Sportico
            </Eyebrow>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE, delay: 0.08 }}
            className="mt-2 text-[38px] font-bold leading-[1.1] tracking-[-0.025em] text-on-surface sm:text-[48px]"
          >
            Sportico giúp việc{" "}
            <span className="bg-gradient-to-r from-primary to-[#7d6dff] bg-clip-text text-transparent">
              tìm huấn luyện viên
            </span>{" "}
            trở nên dễ dàng hơn
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: 0.18 }}
            className="mt-5 text-[16.5px] leading-relaxed text-on-surface-variant"
          >
            Chúng tôi xây dựng một nền tảng để học viên có thể tìm đúng người
            hướng dẫn, còn huấn luyện viên có thể phát triển công việc huấn
            luyện một cách chuyên nghiệp hơn.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: 0.28 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/coaches"
              className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-5 py-3 text-[14px] font-semibold text-on-primary transition-all hover:-translate-y-px hover:bg-[#2d20b8] hover:shadow-[0_4px_16px_-4px_rgba(53,37,205,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Search size={16} />
              Tìm huấn luyện viên
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-[10px] border border-primary/25 bg-primary/[0.06] px-5 py-3 text-[14px] font-semibold text-primary transition-all hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Trở thành HLV
              <ChevronRight size={15} />
            </Link>
          </motion.div>
        </div>

        {/* Right — visual ecosystem card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.65, ease: EASE, delay: 0.14 }}
          aria-hidden
          className="hidden lg:block"
        >
          <EcosystemCard />
        </motion.div>
      </div>
    </Section>
  );
}

function EcosystemCard() {
  const tiles = [
    { icon: Users, label: "Học viên", color: "from-primary/20 to-[#7d6dff]/20", icon_color: "text-primary" },
    { icon: BadgeCheck, label: "Huấn luyện viên", color: "from-emerald-500/15 to-teal-400/15", icon_color: "text-emerald-600" },
    { icon: CalendarDays, label: "Lịch tập", color: "from-amber-500/15 to-orange-400/15", icon_color: "text-amber-600" },
    { icon: Target, label: "Mục tiêu", color: "from-rose-500/15 to-pink-400/15", icon_color: "text-rose-500" },
    { icon: TrendingUp, label: "Tiến trình", color: "from-violet-500/15 to-purple-400/15", icon_color: "text-violet-600" },
    { icon: Dumbbell, label: "Gói tập", color: "from-sky-500/15 to-cyan-400/15", icon_color: "text-sky-600" },
  ];

  return (
    <div className="relative rounded-[24px] border border-[var(--color-border-soft)] bg-surface-container-low p-6 shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_48px_-16px_rgba(15,15,30,0.1)]">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-[#7d6dff]">
          <Sparkles size={16} className="text-on-primary" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-on-surface">Hệ sinh thái Sportico</p>
          <p className="text-[12px] text-on-surface-variant">Kết nối — Tập luyện — Phát triển</p>
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={cn(
              "flex flex-col items-center gap-2 rounded-[14px] bg-gradient-to-br p-4",
              t.color,
            )}
          >
            <t.icon size={22} className={t.icon_color} strokeWidth={1.8} />
            <span className="text-center text-[11.5px] font-medium leading-tight text-on-surface">
              {t.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer connector arrow */}
      <div className="mt-5 flex items-center justify-center gap-3 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-3">
        <Users size={14} className="text-primary" />
        <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-[#7d6dff]/30" />
        <Sparkles size={12} className="text-[#7d6dff]" />
        <div className="h-px flex-1 bg-gradient-to-r from-[#7d6dff]/30 to-emerald-400/30" />
        <BadgeCheck size={14} className="text-emerald-600" />
        <p className="ml-1 text-[11.5px] font-medium text-on-surface-variant">Sportico kết nối hai bên</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Why Sportico exists
// ─────────────────────────────────────────────────────────────────────────────

function WhySection() {
  const cards = [
    {
      icon: Search,
      color: "from-primary/15 to-[#7d6dff]/15",
      iconColor: "text-primary",
      title: "Tìm đúng HLV",
      body: "Người học thường khó biết HLV nào phù hợp với mục tiêu, lịch rảnh và phong cách tập luyện của mình. Sportico giúp thu hẹp khoảng cách đó.",
    },
    {
      icon: CalendarCheck,
      color: "from-emerald-500/15 to-teal-400/15",
      iconColor: "text-emerald-600",
      title: "Đặt lịch rõ ràng",
      body: "HLV cá nhân thường cần một nơi rõ ràng để giới thiệu chuyên môn và quản lý lịch tập. Sportico cung cấp không gian đó một cách có tổ chức.",
    },
    {
      icon: TrendingUp,
      color: "from-violet-500/15 to-purple-400/15",
      iconColor: "text-violet-600",
      title: "Theo dõi quá trình",
      body: "Sportico kết nối học viên và HLV trong một trải nghiệm đơn giản hơn, minh bạch hơn và dễ bắt đầu hơn — không cần qua nhiều kênh trung gian.",
    },
  ];

  return (
    <Section
      label="Vì sao Sportico ra đời"
      className="pb-16 pt-4 sm:pb-20"
    >
      <FadeUp className="mb-10 text-center">
        <Eyebrow>
          <Zap size={11} />
          Lý do ra đời
        </Eyebrow>
        <h2 className="mt-2 text-[30px] font-bold tracking-[-0.02em] text-on-surface sm:text-[36px]">
          Vì sao Sportico ra đời?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-on-surface-variant">
          Việc tìm đúng huấn luyện viên không nên phức tạp. Và việc xây dựng
          nghề huấn luyện cũng không nên thiếu công cụ hỗ trợ.
        </p>
      </FadeUp>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <FadeUp key={c.title} delay={i * 0.07}>
            <div className="group flex h-full flex-col rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_24px_-8px_rgba(15,15,30,0.12)]">
              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br",
                  c.color,
                )}
              >
                <c.icon size={20} className={c.iconColor} strokeWidth={1.9} />
              </div>
              <h3 className="mb-2 text-[15.5px] font-semibold text-on-surface">
                {c.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-on-surface-variant">
                {c.body}
              </p>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — For learners and coaches
// ─────────────────────────────────────────────────────────────────────────────

const LEARNER_ITEMS = [
  { icon: Search, text: "Khám phá HLV theo môn thể thao và mục tiêu cá nhân." },
  { icon: BookOpen, text: "Xem hồ sơ, chuyên môn và phong cách huấn luyện." },
  { icon: CalendarDays, text: "Gửi yêu cầu đặt lịch và thống nhất buổi tập." },
  { icon: TrendingUp, text: "Theo dõi lộ trình và cải thiện từng ngày." },
];

const COACH_ITEMS = [
  { icon: BadgeCheck, text: "Tạo hồ sơ huấn luyện viên chuyên nghiệp." },
  { icon: Target, text: "Giới thiệu chuyên môn và các môn thể thao huấn luyện." },
  { icon: CalendarCheck, text: "Quản lý học viên, xác nhận lịch và theo dõi buổi tập." },
  { icon: TrendingUp, text: "Xây dựng uy tín cá nhân và phát triển trên nền tảng." },
];

function AudienceSection() {
  return (
    <Section
      label="Dành cho học viên và huấn luyện viên"
      className="pb-16 pt-4 sm:pb-20"
    >
      <FadeUp className="mb-10 text-center">
        <Eyebrow>
          <Users size={11} />
          Dành cho ai
        </Eyebrow>
        <h2 className="mt-2 text-[30px] font-bold tracking-[-0.02em] text-on-surface sm:text-[36px]">
          Nền tảng dành cho cả hai bên
        </h2>
      </FadeUp>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Learners */}
        <FadeUp delay={0}>
          <AudienceCard
            icon={Users}
            title="Dành cho học viên"
            accent="primary"
            items={LEARNER_ITEMS}
            cta={{ label: "Tìm huấn luyện viên", href: "/coaches" }}
          />
        </FadeUp>
        {/* Coaches */}
        <FadeUp delay={0.08}>
          <AudienceCard
            icon={BadgeCheck}
            title="Dành cho huấn luyện viên"
            accent="emerald"
            items={COACH_ITEMS}
            cta={{ label: "Tạo hồ sơ HLV", href: "/onboarding" }}
          />
        </FadeUp>
      </div>
    </Section>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  accent,
  items,
  cta,
}: {
  icon: typeof Users;
  title: string;
  accent: "primary" | "emerald";
  items: { icon: typeof Users; text: string }[];
  cta: { label: string; href: string };
}) {
  const isPrimary = accent === "primary";
  const headerGrad = isPrimary
    ? "from-primary/[0.08] to-[#7d6dff]/[0.05]"
    : "from-emerald-500/[0.07] to-teal-400/[0.04]";
  const iconBg = isPrimary
    ? "bg-gradient-to-br from-primary to-[#7d6dff]"
    : "bg-gradient-to-br from-emerald-500 to-teal-400";
  const checkColor = isPrimary ? "text-primary" : "text-emerald-600";
  const ctaClass = isPrimary
    ? "border-primary/25 bg-primary/[0.07] text-primary hover:bg-primary/12"
    : "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 hover:bg-emerald-500/12";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.07)]">
      {/* Card header */}
      <div className={cn("flex items-center gap-3 bg-gradient-to-br p-5 pb-4", headerGrad)}>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]", iconBg)}>
          <Icon size={18} className="text-white" strokeWidth={1.9} />
        </div>
        <h3 className="text-[16px] font-semibold text-on-surface">{title}</h3>
      </div>

      {/* Items */}
      <ul className="flex flex-col gap-1 p-5 pt-4">
        {items.map((item) => (
          <li key={item.text} className="flex items-start gap-3 py-1.5">
            <item.icon size={15} className={cn("mt-0.5 shrink-0", checkColor)} strokeWidth={2} />
            <span className="text-[13.5px] leading-snug text-on-surface-variant">
              {item.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto p-5 pt-2">
        <Link
          href={cta.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[8px] border px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2",
            ctaClass,
          )}
        >
          {cta.label}
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Core values
// ─────────────────────────────────────────────────────────────────────────────

const VALUES = [
  {
    icon: Gauge,
    color: "from-primary/15 to-[#7d6dff]/15",
    iconColor: "text-primary",
    title: "Rõ ràng",
    body: "Thông tin HLV, lịch tập và quá trình đăng ký cần dễ hiểu — không rối, không mơ hồ.",
  },
  {
    icon: HandHeart,
    color: "from-rose-500/15 to-pink-400/15",
    iconColor: "text-rose-500",
    title: "Thực tế",
    body: "Tập trung vào nhu cầu thật của học viên và HLV, không xây dựng tính năng chỉ để trông hay.",
  },
  {
    icon: Layers,
    color: "from-amber-500/15 to-orange-400/15",
    iconColor: "text-amber-600",
    title: "Linh hoạt",
    body: "Phù hợp nhiều môn thể thao và nhiều phong cách huấn luyện — không ép người dùng vào một khuôn mẫu cứng.",
  },
  {
    icon: ShieldCheck,
    color: "from-emerald-500/15 to-teal-400/15",
    iconColor: "text-emerald-600",
    title: "Đáng tin cậy",
    body: "Xây dựng trải nghiệm minh bạch, có kiểm soát và dễ theo dõi — cho cả học viên lẫn HLV.",
  },
];

function ValuesSection() {
  return (
    <Section
      label="Giá trị cốt lõi"
      className="pb-16 pt-4 sm:pb-20"
    >
      {/* Full-bleed tinted background */}
      <div className="rounded-[28px] bg-gradient-to-br from-primary/[0.04] to-[#7d6dff]/[0.03] p-8 sm:p-12">
        <FadeUp className="mb-10 text-center">
          <Eyebrow>
            <Sparkles size={11} />
            Triết lý
          </Eyebrow>
          <h2 className="mt-2 text-[30px] font-bold tracking-[-0.02em] text-on-surface sm:text-[36px]">
            Những điều Sportico hướng tới
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <FadeUp key={v.title} delay={i * 0.06}>
              <div className="flex h-full flex-col rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]">
                <div
                  className={cn(
                    "mb-4 flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br",
                    v.color,
                  )}
                >
                  <v.icon size={18} className={v.iconColor} strokeWidth={1.9} />
                </div>
                <p className="mb-1.5 text-[14.5px] font-semibold text-on-surface">
                  {v.title}
                </p>
                <p className="text-[13px] leading-relaxed text-on-surface-variant">
                  {v.body}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — How it works
// ─────────────────────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Khám phá",
    body: "Học viên tìm HLV theo nhu cầu và môn thể thao. Xem hồ sơ và chuyên môn của từng người.",
    color: "from-primary/15 to-[#7d6dff]/15",
    iconColor: "text-primary",
  },
  {
    num: "02",
    icon: CalendarDays,
    title: "Kết nối",
    body: "Xem hồ sơ, gửi yêu cầu và thống nhất lịch tập với huấn luyện viên phù hợp.",
    color: "from-violet-500/15 to-purple-400/15",
    iconColor: "text-violet-600",
  },
  {
    num: "03",
    icon: Dumbbell,
    title: "Tập luyện",
    body: "Theo dõi buổi tập, tiến độ và tiếp tục cải thiện theo mục tiêu cá nhân.",
    color: "from-emerald-500/15 to-teal-400/15",
    iconColor: "text-emerald-600",
  },
];

function HowItWorksSection() {
  return (
    <Section
      label="Cách Sportico hoạt động"
      className="pb-16 pt-4 sm:pb-20"
    >
      <FadeUp className="mb-10 text-center">
        <Eyebrow>
          <Zap size={11} />
          Quy trình
        </Eyebrow>
        <h2 className="mt-2 text-[30px] font-bold tracking-[-0.02em] text-on-surface sm:text-[36px]">
          Cách Sportico hoạt động
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15.5px] leading-relaxed text-on-surface-variant">
          Ba bước để bắt đầu hành trình tập luyện có định hướng.
        </p>
      </FadeUp>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {HOW_STEPS.map((s, i) => (
          <FadeUp key={s.num} delay={i * 0.08}>
            <div className="relative flex h-full flex-col rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_4px_16px_-8px_rgba(15,15,30,0.07)]">
              <span className="mb-4 text-[11px] font-bold tracking-[0.14em] text-on-surface-variant opacity-50">
                BƯỚC {s.num}
              </span>
              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br",
                  s.color,
                )}
              >
                <s.icon size={20} className={s.iconColor} strokeWidth={1.8} />
              </div>
              <h3 className="mb-2 text-[15.5px] font-semibold text-on-surface">
                {s.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-on-surface-variant">
                {s.body}
              </p>
              {/* Connector dots — only between steps */}
              {i < HOW_STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:flex items-center gap-1"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-border-soft)]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-border-soft)]" />
                </div>
              )}
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Principles / Trust
// ─────────────────────────────────────────────────────────────────────────────

const PRINCIPLES = [
  "Không dùng số liệu giả hoặc phóng đại kết quả tập luyện.",
  "Thông tin hiển thị đến từ hồ sơ, lịch tập, gói tập và dữ liệu thật.",
  "Trải nghiệm được thiết kế rõ ràng cho cả học viên, HLV và quản trị nền tảng.",
  "Mọi thay đổi quan trọng đều thông báo rõ ràng — không thay đổi ngầm.",
];

function PrinciplesSection() {
  return (
    <Section
      label="Nguyên tắc minh bạch"
      className="pb-16 pt-4 sm:pb-20"
    >
      <div className="overflow-hidden rounded-[24px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.07)]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — text */}
          <div className="p-8 sm:p-10">
            <FadeUp>
              <Eyebrow>
                <ShieldCheck size={11} />
                Cam kết
              </Eyebrow>
              <h2 className="mt-3 text-[26px] font-bold leading-snug tracking-[-0.02em] text-on-surface sm:text-[32px]">
                Chúng tôi ưu tiên trải nghiệm minh bạch
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-on-surface-variant">
                Sportico được xây dựng với niềm tin rằng trải nghiệm tốt nhất
                đến từ sự trung thực — không phóng đại, không số liệu đẹp mà
                rỗng nghĩa.
              </p>
            </FadeUp>

            <ul className="mt-6 space-y-3">
              {PRINCIPLES.map((p, i) => (
                <FadeUp key={i} delay={0.05 + i * 0.05}>
                  <li className="flex items-start gap-3">
                    <ShieldCheck
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-500"
                      strokeWidth={2}
                    />
                    <span className="text-[13.5px] leading-snug text-on-surface-variant">
                      {p}
                    </span>
                  </li>
                </FadeUp>
              ))}
            </ul>
          </div>

          {/* Right — decorative tinted panel */}
          <div
            aria-hidden
            className="hidden items-center justify-center bg-gradient-to-br from-primary/[0.05] to-[#7d6dff]/[0.04] p-8 lg:flex"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-[#7d6dff]/20">
                <ShieldCheck size={36} className="text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-center text-[13px] font-medium text-on-surface-variant">
                Dữ liệu thật · Thông tin rõ ràng
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Final CTA
// ─────────────────────────────────────────────────────────────────────────────

function FinalCTA() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <Section
      label="Bắt đầu với Sportico"
      className="pb-20 pt-4 sm:pb-28"
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduce ? 0 : 0.65, ease: EASE }}
        className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1e1b4b] via-[#3b1d75] to-[#7c3aed] px-6 py-14 text-center shadow-[0_24px_64px_-20px_rgba(124,58,237,0.5)] sm:px-12 sm:py-20"
      >
        {/* Soft glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"
        >
          <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-400/20 blur-[80px]" />
        </div>

        <div className="relative">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
            <Sparkles size={11} />
            Sẵn sàng bắt đầu
          </p>

          <h2 className="mx-auto mt-2 max-w-2xl text-[30px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[42px]">
            Sẵn sàng bắt đầu với Sportico?
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/70">
            Dù bạn đang tìm người đồng hành trong quá trình tập luyện hay muốn
            phát triển công việc huấn luyện, Sportico giúp bạn bắt đầu dễ dàng
            hơn.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/coaches"
              className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-[14px] font-semibold text-slate-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Search size={15} className="text-violet-700" />
              Tìm HLV phù hợp
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-[10px] border border-white/25 bg-white/10 px-6 py-3 text-[14px] font-semibold text-white backdrop-blur transition-all hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Đăng ký làm HLV
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
