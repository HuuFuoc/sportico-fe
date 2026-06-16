"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type Easing,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  Flame,
  Heart,
  LineChart as LineChartIcon,
  MessageCircle,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as Easing;

type TabId = "progress" | "schedule" | "messages";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
  bullets: string[];
}

const TABS: TabDef[] = [
  {
    id: "progress",
    label: "Tiến độ",
    icon: LineChartIcon,
    bullets: [
      "Theo dõi kế hoạch tập luyện do HLV tạo và cập nhật",
      "Lịch sử buổi tập và nhận xét từ huấn luyện viên",
      "Xem tiến độ so với mục tiêu ban đầu của bạn",
    ],
  },
  {
    id: "schedule",
    label: "Lịch tập",
    icon: Calendar,
    bullets: [
      "Lịch tập từ HLV hiển thị rõ ràng theo từng ngày",
      "Xem các buổi sắp tới và lịch sử đã hoàn thành",
      "Quản lý booking và trạng thái buổi tập trong ứng dụng",
    ],
  },
  {
    id: "messages",
    label: "Tin nhắn",
    icon: MessageCircle,
    bullets: [
      "Nhắn tin trực tiếp với huấn luyện viên của bạn",
      "Gửi câu hỏi, hình ảnh và cập nhật tiến độ",
      "Lịch sử hội thoại lưu trữ đầy đủ",
    ],
  },
];

export function ProductPreviewSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [tab, setTab] = useState<TabId>("progress");

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <section
      ref={ref}
      aria-label="Bên trong sản phẩm"
      className="relative overflow-hidden border-y border-slate-200/70 bg-slate-50/60"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_85%_10%,rgba(124,58,237,0.07),transparent_60%),radial-gradient(ellipse_50%_50%_at_10%_90%,rgba(6,182,212,0.05),transparent_60%)]" />
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
            Bên trong sản phẩm
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.06, ease: EASE }}
            className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.025em] text-slate-900 sm:text-[44px]"
          >
            Mọi buổi tập đều được{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              đo lường và thấu hiểu.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduce ? 0 : 0.6, delay: 0.12, ease: EASE }}
            className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-slate-500"
          >
            Bảng điều khiển biến quá trình tập luyện thành dữ liệu. AI báo cho
            bạn biết cần điều chỉnh gì trước khi nó cản trở tiến bộ.
          </motion.p>
        </div>

        {/* ============ TAB SWITCHER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduce ? 0 : 0.55, delay: 0.18, ease: EASE }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-1 rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-colors",
                    active ? "text-white" : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="ppTabPill"
                      className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-[0_4px_14px_-2px_rgba(124,58,237,0.45)]"
                      transition={{
                        type: "spring",
                        duration: reduce ? 0 : 0.4,
                        bounce: 0.2,
                      }}
                    />
                  )}
                  <Icon size={13} className="relative" />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.95fr_1.1fr] lg:gap-16">
          {/* LEFT — bullets per tab */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
              >
                <h3 className="text-[22px] font-semibold tracking-tight text-slate-900">
                  {current.id === "progress"
                    ? "Biến tập luyện thành dữ liệu."
                    : current.id === "schedule"
                      ? "Một lịch duy nhất, gọn gàng."
                      : "HLV + AI cùng một hộp thoại."}
                </h3>
                <ul className="mt-5 space-y-3">
                  {current.bullets.map((b, i) => (
                    <motion.li
                      key={b}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.4,
                        delay: reduce ? 0 : i * 0.06,
                        ease: EASE,
                      }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="text-[14.5px] leading-relaxed text-slate-700">
                        {b}
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <Link
                  href="/learner/schedule"
                  className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-700"
                >
                  Khám phá ứng dụng
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT — animated dashboard mockup */}
          <DashboardMockup tab={tab} reduce={reduce ?? false} inView={inView} />
        </div>

        {/* ============ TRUST STRIP ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: reduce ? 0 : 0.6, delay: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-slate-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            Kế hoạch tập luyện cá nhân hóa
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            Nhắn tin với HLV trong ứng dụng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
              <Check size={11} strokeWidth={3} />
            </span>
            Theo dõi tiến trình buổi tập
          </span>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Dashboard mockup — switches content with AnimatePresence
// ============================================================================

function DashboardMockup({
  tab,
  reduce,
  inView,
}: {
  tab: TabId;
  reduce: boolean;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: reduce ? 0 : 0.7, delay: 0.25, ease: EASE }}
      className="relative"
    >
      {/* Glow halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br from-violet-300/30 via-fuchsia-300/20 to-cyan-300/20 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_70px_-25px_rgba(15,23,42,0.2)]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 font-mono text-[10.5px] text-slate-400">
            sportico.app/learner/{tab}
          </span>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {tab === "progress" && (
              <ProgressMock key="progress" reduce={reduce} />
            )}
            {tab === "schedule" && (
              <ScheduleMock key="schedule" reduce={reduce} />
            )}
            {tab === "messages" && (
              <MessagesMock key="messages" reduce={reduce} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating chips */}
      <FloatingTag
        icon={Brain}
        text="Kế hoạch tập"
        cls="-left-6 top-12 hidden lg:flex"
        delay={1.1}
        reduce={reduce}
      />
      <FloatingTag
        icon={Flame}
        text="Đang hoạt động"
        cls="-right-3 bottom-16 hidden lg:flex"
        delay={1.3}
        reduce={reduce}
        accent="amber"
      />
    </motion.div>
  );
}

// ============================================================================
// Mock — Progress
// ============================================================================

function ProgressMock({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
            Điểm thể lực
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
            78<span className="text-[14px] text-slate-400">/100</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
          <TrendingUp size={11} />
          +14% so với tháng trước
        </span>
      </div>

      {/* Mini chart */}
      <div className="rounded-[12px] border border-slate-100 bg-slate-50/40 p-3">
        <svg viewBox="0 0 200 60" className="h-16 w-full" aria-hidden>
          <defs>
            <linearGradient id="ppFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ppStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 0 45 L 20 40 L 40 42 L 60 32 L 80 28 L 100 25 L 120 18 L 140 22 L 160 16 L 180 10 L 200 8 L 200 60 L 0 60 Z"
            fill="url(#ppFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
          <motion.path
            d="M 0 45 L 20 40 L 40 42 L 60 32 L 80 28 L 100 25 L 120 18 L 140 22 L 160 16 L 180 10 L 200 8"
            fill="none"
            stroke="url(#ppStroke)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          <motion.circle
            cx={200}
            cy={8}
            r={3.5}
            fill="#fff"
            stroke="#7c3aed"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 1.5 }}
          />
        </svg>
      </div>

      {/* 3 mini metric rows */}
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric icon={Heart} label="Buổi tập" value="12" tone="violet" />
        <MiniMetric icon={Activity} label="Tuần này" value="3/4" tone="cyan" />
        <MiniMetric icon={Flame} label="Chuỗi" value="8 ngày" tone="amber" />
      </div>

      {/* Coach note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-start gap-2.5 rounded-[12px] border border-violet-200/60 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 px-3 py-2.5"
      >
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
          <Sparkles size={11} />
        </span>
        <p className="text-[11.5px] leading-relaxed text-slate-700">
          HLV ghi chú:{" "}
          <span className="font-semibold text-violet-700">
            Tốt — giữ nhịp độ hiện tại tuần này.
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Mock — Schedule
// ============================================================================

function ScheduleMock({ reduce }: { reduce: boolean }) {
  const sessions = [
    { time: "07:00", title: "Buổi tập buổi sáng", coach: "HLV của bạn", tone: "violet" as const },
    { time: "12:00", title: "Bài tập linh hoạt", coach: "HLV của bạn", tone: "cyan" as const },
    { time: "18:30", title: "Tổng kết tuần", coach: "HLV của bạn", tone: "fuchsia" as const, ai: false },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
            Hôm nay · Thứ Sáu
          </p>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-slate-900">
            3 buổi đã lên lịch
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">
          <Calendar size={11} />
          Đúng tiến độ
        </span>
      </div>

      <div className="space-y-2">
        {sessions.map((s, i) => {
          const toneClasses =
            s.tone === "violet"
              ? "border-violet-100 bg-violet-50/40"
              : s.tone === "cyan"
                ? "border-cyan-100 bg-cyan-50/40"
                : "border-fuchsia-100 bg-fuchsia-50/40";
          const barColor =
            s.tone === "violet"
              ? "bg-violet-500"
              : s.tone === "cyan"
                ? "bg-cyan-500"
                : "bg-fuchsia-500";
          return (
            <motion.div
              key={s.time}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.15 + i * 0.08,
                ease: EASE,
              }}
              className={cn(
                "relative flex items-center gap-3 rounded-[12px] border px-3 py-2.5",
                toneClasses,
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
                  barColor,
                )}
              />
              <div className="pl-1 text-center">
                <p className="text-[12px] font-bold tabular-nums text-slate-900">
                  {s.time}
                </p>
                <p className="text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
                  60p
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate text-slate-900">
                  {s.title}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  cùng {s.coach}
                </p>
              </div>
              {s.ai && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-500 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white">
                  <Sparkles size={9} />
                  AI
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Mock — Messages
// ============================================================================

function MessagesMock({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="space-y-3"
    >
      {/* Thread header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_4px_12px_-2px_rgba(124,58,237,0.4)]">
          <Sparkles size={15} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">
            HLV của bạn
          </p>
          <p className="text-[10.5px] text-emerald-600 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hoạt động
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
          className="max-w-[80%] rounded-[14px] rounded-bl-[4px] bg-violet-50 px-3 py-2 text-[12px] text-slate-700"
        >
          Chào! Buổi tập hôm nay xong rồi nhé. Bạn cảm thấy thế nào — tập
          tiếp hay cần nghỉ một ngày?
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
          className="ml-auto max-w-[70%] rounded-[14px] rounded-br-[4px] bg-gradient-to-br from-violet-600 to-fuchsia-500 px-3 py-2 text-[12px] text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.45)]"
        >
          Mình ổn — tập tiếp được. Ngày mai mình có thể tập lúc mấy giờ?
        </motion.div>

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="inline-flex items-center gap-1 rounded-[14px] rounded-bl-[4px] bg-violet-50 px-3 py-2"
        >
          <Dot delay={0} reduce={reduce} />
          <Dot delay={0.15} reduce={reduce} />
          <Dot delay={0.3} reduce={reduce} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Dot({ delay, reduce }: { delay: number; reduce: boolean }) {
  return (
    <motion.span
      animate={
        reduce
          ? { opacity: 0.5 }
          : {
              opacity: [0.3, 1, 0.3],
              y: [0, -2, 0],
            }
      }
      transition={{
        duration: 1.1,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500"
    />
  );
}

// ============================================================================
// Mini metric tile
// ============================================================================

function MiniMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "violet" | "cyan" | "amber";
}) {
  const toneClass =
    tone === "violet"
      ? "text-violet-600 bg-violet-50"
      : tone === "cyan"
        ? "text-cyan-600 bg-cyan-50"
        : "text-amber-600 bg-amber-50";
  return (
    <div className="rounded-[10px] border border-slate-100 bg-white px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded",
            toneClass,
          )}
        >
          <Icon size={10} />
        </span>
        <span className="text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-1 text-[15px] font-semibold leading-none tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Floating tag
// ============================================================================

function FloatingTag({
  icon: Icon,
  text,
  cls,
  delay,
  reduce,
  accent = "violet",
}: {
  icon: LucideIcon;
  text: ReactNode;
  cls: string;
  delay: number;
  reduce: boolean;
  accent?: "violet" | "amber";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      className={cn("absolute z-10", cls)}
    >
      <motion.div
        animate={
          reduce
            ? {}
            : {
                y: [0, -5, 0],
              }
        }
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay * 0.5,
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_10px_28px_-10px_rgba(15,23,42,0.18)]"
      >
        <Icon
          size={12}
          className={accent === "amber" ? "text-amber-600" : "text-violet-600"}
        />
        {text}
      </motion.div>
    </motion.div>
  );
}
