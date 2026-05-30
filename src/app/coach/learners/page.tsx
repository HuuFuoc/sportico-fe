"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { ProgressRing, Sparkline } from "@/components/coach/DataViz";
import { AnimatedNumber } from "@/components/landing/AnimatedNumber";
import { Reveal } from "@/components/landing/Motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import {
  getAthleteMetrics,
  type AthleteMetrics,
  type RiskLevel,
} from "@/lib/athlete-metrics";
import type { Learner } from "@/types";

type Enriched = { learner: Learner; m: AthleteMetrics };
type SortKey = "priority" | "readiness" | "streak" | "hours" | "name";

const RISK_STYLE: Record<
  RiskLevel,
  { chip: string; dot: string; ring: string }
> = {
  "on-track": {
    chip: "bg-[#e7f6ed] text-[#1f7a4d]",
    dot: "bg-[#1f9d57]",
    ring: "#1f9d57",
  },
  watch: {
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    ring: "#d98a0b",
  },
  "at-risk": {
    chip: "bg-[#ffe9e7] text-[#c4362b]",
    dot: "bg-[#e0503f]",
    ring: "#e0503f",
  },
};

function scoreColor(v: number) {
  return v >= 75 ? "#1f9d57" : v >= 58 ? "#d98a0b" : "#e0503f";
}

const RISK_RANK: Record<RiskLevel, number> = {
  "at-risk": 0,
  watch: 1,
  "on-track": 2,
};

export default function CoachLearnersPage() {
  const {
    data: learnersData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchLearners(), []);
  const learners = useMemo(() => learnersData ?? [], [learnersData]);

  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enriched = useMemo<Enriched[]>(
    () => learners.map((l) => ({ learner: l, m: getAthleteMetrics(l) })),
    [learners],
  );

  const stats = useMemo(() => {
    const n = enriched.length;
    const atRisk = enriched.filter((e) => e.m.risk === "at-risk");
    const watch = enriched.filter((e) => e.m.risk === "watch");
    const fatigue = enriched.filter(
      (e) => e.m.load === "High" || e.m.readiness < 60,
    );
    const declining = [...enriched]
      .filter((e) => e.m.trendDelta < 0)
      .sort((a, b) => a.m.trendDelta - b.m.trendDelta);
    return {
      n,
      atRisk,
      watch,
      fatigue,
      declining,
      avgReadiness: Math.round(
        enriched.reduce((s, e) => s + e.m.readiness, 0) / Math.max(n, 1),
      ),
      avgEngagement: Math.round(
        enriched.reduce((s, e) => s + e.m.engagement, 0) / Math.max(n, 1),
      ),
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const list = enriched.filter(({ learner, m }) => {
      if (riskFilter !== "all" && m.risk !== riskFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          learner.name.toLowerCase().includes(q) ||
          learner.goals.join(" ").toLowerCase().includes(q) ||
          learner.preferredSports.join(" ").toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "readiness":
          return b.m.readiness - a.m.readiness;
        case "streak":
          return b.learner.streakDays - a.learner.streakDays;
        case "hours":
          return b.learner.totalHoursTrained - a.learner.totalHoursTrained;
        case "name":
          return a.learner.name.localeCompare(b.learner.name);
        default:
          return (
            RISK_RANK[a.m.risk] - RISK_RANK[b.m.risk] ||
            a.m.readiness - b.m.readiness
          );
      }
    });
  }, [enriched, query, riskFilter, sortKey]);

  const needsAttention = stats.atRisk.length + stats.watch.length;
  const worstDecliner = stats.declining[0];

  const aiCards = [
    {
      icon: "battery_alert",
      tone: "#e0503f",
      category: "Phát hiện kiệt sức",
      headline: `${stats.fatigue.length} học viên đang có dấu hiệu mệt mỏi sớm`,
      explanation:
        "Chỉ số sẵn sàng và tải luyện tập cho thấy các học viên này đang tích lũy mệt mỏi nhanh hơn khả năng phục hồi. Hãy xem xét giảm tải tuần này.",
      athletes: stats.fatigue.slice(0, 4).map((e) => e.learner.name),
      action: "Xem xét mệt mỏi",
      confidence: 93,
    },
    {
      icon: "trending_down",
      tone: "#d98a0b",
      category: "Sụt giảm hiệu suất",
      headline: worstDecliner
        ? `Xu hướng sẵn sàng của ${worstDecliner.learner.name} giảm ${Math.abs(worstDecliner.m.trendDelta)} điểm`
        : "Tất cả xu hướng học viên đều ổn định",
      explanation: worstDecliner
        ? `Điểm hiệu suất hàng tuần của ${worstDecliner.learner.name.split(" ")[0]} đã giảm liên tục. Chương trình tập trung phục hồi sẽ ổn định xu hướng trước khối cường độ tiếp theo.`
        : "Không phát hiện xu hướng tiêu cực đáng kể trong danh sách học viên tuần này.",
      athletes: stats.declining.slice(0, 4).map((e) => e.learner.name),
      action: "Gửi chương trình phục hồi",
      confidence: 89,
    },
    {
      icon: "self_improvement",
      tone: "#4f46e5",
      category: "Coaching dự báo",
      headline: `${Math.max(stats.atRisk.length, 2)} học viên có thể cần buổi mobility`,
      explanation:
        "Dựa trên điểm phục hồi và lịch sử buổi tập, buổi mobility được dự báo sẽ nâng chỉ số sẵn sàng trong vòng một tuần.",
      athletes: (stats.atRisk.length ? stats.atRisk : stats.watch)
        .slice(0, 4)
        .map((e) => e.learner.name),
      action: "Tạo kế hoạch AI",
      confidence: 91,
    },
  ];

  if (loading) {
    return (
      <AppShell role="coach" title="My Learners">
        <LoadingState label="Đang tải danh sách học viên…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="My Learners">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="My Learners">
      <div className="mx-auto max-w-[1280px] space-y-6 pb-8">
        {/* ---------- Header ---------- */}
        <Reveal>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-on-surface sm:text-[30px]">
                Athlete workspace
              </h1>
              <p className="mt-1.5 text-[15px] text-on-surface-variant">
                {stats.n} athletes under your guidance —{" "}
                <span className="font-medium text-[#c4362b]">
                  {needsAttention} need attention
                </span>{" "}
                today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-low">
                <MaterialIcon name="file_download" size={16} />
                Export
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]">
                <MaterialIcon name="person_add" size={16} />
                Invite athlete
              </button>
            </div>
          </header>
        </Reveal>

        {/* ---------- KPI overview ---------- */}
        <Reveal delay={0.05}>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              icon="groups"
              label="Học viên đang hoạt động"
              hint="+2 tham gia tháng này"
            >
              <p className="text-[28px] font-semibold leading-none text-on-surface">
                <AnimatedNumber value={stats.n} duration={1.2} />
              </p>
            </KpiTile>

            <KpiTile
              icon="monitor_heart"
              label="Cần chú ý"
              hint={`${stats.atRisk.length} có nguy cơ · ${stats.watch.length} theo dõi`}
              tone="amber"
            >
              <p className="text-[28px] font-semibold leading-none text-[#b95000]">
                <AnimatedNumber value={needsAttention} duration={1.2} />
              </p>
            </KpiTile>

            <KpiTile
              icon="bolt"
              label="Sẵn sàng TB"
              hint="Toàn danh sách hôm nay"
            >
              <div className="flex items-center gap-3">
                <p className="text-[28px] font-semibold leading-none text-on-surface">
                  <AnimatedNumber value={stats.avgReadiness} duration={1.4} />
                  <span className="text-[16px] text-on-surface-variant">%</span>
                </p>
                <ProgressRing
                  value={stats.avgReadiness}
                  size={38}
                  stroke={4}
                  color={scoreColor(stats.avgReadiness)}
                />
              </div>
            </KpiTile>

            <KpiTile
              icon="trending_up"
              label="Tương tác"
              hint="+8% so tuần trước"
            >
              <div className="flex items-end justify-between gap-2">
                <p className="text-[28px] font-semibold leading-none text-on-surface">
                  <AnimatedNumber value={stats.avgEngagement} duration={1.4} />
                  <span className="text-[16px] text-on-surface-variant">%</span>
                </p>
                <Sparkline
                  data={[58, 61, 60, 66, 69, 72, stats.avgEngagement]}
                  width={72}
                  height={30}
                  color="#1f9d57"
                />
              </div>
            </KpiTile>
          </section>
        </Reveal>

        {/* ---------- AI command center ---------- */}
        <Reveal delay={0.1}>
          <section className="relative overflow-hidden rounded-[20px] bg-[#0b0a1e] p-5 shadow-[0_24px_50px_-30px_rgba(11,10,30,0.8)] sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_70%_70%_at_20%_0%,#000,transparent)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-600/25 blur-3xl"
            />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary to-violet-500 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.8)]">
                    <MaterialIcon name="auto_awesome" filled size={20} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-white">
                      AI Coaching Intelligence
                    </h2>
                    <p className="text-[12px] text-white/55">
                      Predictive insights across your roster
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/65">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Synced just now
                </span>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {aiCards.map((card) => (
                  <AICard key={card.category} {...card} />
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ---------- Sticky toolbar ---------- */}
        <div className="sticky top-16 z-20 -mx-1 rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest/85 px-3 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex h-10 flex-1 items-center rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 transition-colors focus-within:border-primary">
              <MaterialIcon
                name="search"
                size={18}
                className="text-on-surface-variant"
              />
              <input
                type="text"
                name="athlete-search"
                aria-label="Search athletes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm học viên theo tên, mục tiêu hoặc môn thể thao…"
                className="ml-2.5 flex-1 bg-transparent text-[14px] outline-none placeholder:text-on-surface-variant"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
                >
                  <MaterialIcon name="close" size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-low p-0.5">
                {(
                  [
                    ["all", "Tất cả"],
                    ["at-risk", "Có nguy cơ"],
                    ["watch", "Theo dõi"],
                    ["on-track", "Đúng tiến độ"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setRiskFilter(key)}
                    className={cn(
                      "rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                      riskFilter === key
                        ? "bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(16,16,16,0.06)]"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Sort athletes"
                  className="h-9 cursor-pointer appearance-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest pl-3 pr-8 text-[13px] font-medium text-on-surface outline-none transition-colors hover:border-primary/40 focus:border-primary"
                >
                  <option value="priority">Priority (AI)</option>
                  <option value="readiness">Readiness</option>
                  <option value="streak">Streak</option>
                  <option value="hours">Hours trained</option>
                  <option value="name">Name</option>
                </select>
                <MaterialIcon
                  name="expand_more"
                  size={16}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Learner list ---------- */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(({ learner, m }, i) => (
              <LearnerRow
                key={learner.id}
                learner={learner}
                m={m}
                index={i}
                expanded={expandedId === learner.id}
                onToggle={() =>
                  setExpandedId((id) => (id === learner.id ? null : learner.id))
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
              <MaterialIcon
                name="person_search"
                size={24}
                className="text-on-surface-variant"
              />
            </div>
            <p className="mt-4 text-[16px] font-semibold text-on-surface">
              No athletes match these filters
            </p>
            <button
              onClick={() => {
                setQuery("");
                setRiskFilter("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------ KPI tile ------------------------------ */

function KpiTile({
  icon,
  label,
  hint,
  tone = "indigo",
  children,
}: {
  icon: string;
  label: string;
  hint: string;
  tone?: "indigo" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(16,16,16,0.03)] transition-shadow hover:shadow-[0_14px_30px_-20px_rgba(53,37,205,0.4)]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[8px]",
            tone === "amber"
              ? "bg-[#fff1e0] text-[#b95000]"
              : "bg-primary/8 text-primary",
          )}
        >
          <MaterialIcon name={icon} filled size={15} />
        </span>
        <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
          {label}
        </p>
      </div>
      <div className="mt-3.5">{children}</div>
      <p className="mt-2 text-[12px] text-on-surface-variant">{hint}</p>
    </div>
  );
}

/* ----------------------------- AI card ----------------------------- */

function AICard({
  icon,
  tone,
  category,
  headline,
  explanation,
  athletes,
  action,
  confidence,
}: {
  icon: string;
  tone: string;
  category: string;
  headline: string;
  explanation: string;
  athletes: string[];
  action: string;
  confidence: number;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col rounded-[14px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:border-white/20">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{
            backgroundColor: `${tone}22`,
            color: tone,
          }}
        >
          <MaterialIcon name={icon} filled size={15} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
          {category}
        </span>
      </div>

      <p className="mt-3 text-[14.5px] font-semibold leading-snug text-white">
        {headline}
      </p>

      {/* confidence */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-white/55">
          {confidence}% confidence
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-[12.5px] leading-relaxed text-white/65">
              {explanation}
            </p>
            {athletes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {athletes.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/75"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-white/55 transition-colors hover:text-white"
        >
          {open ? "Ẩn" : "Vì sao?"}
          <MaterialIcon
            name="expand_more"
            size={15}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
        <button className="inline-flex items-center gap-1 rounded-[7px] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#0b0a1e] transition-transform hover:-translate-y-0.5">
          {action}
          <MaterialIcon name="arrow_forward" size={14} />
        </button>
      </div>
    </div>
  );
}

/* --------------------------- learner row --------------------------- */

const QUICK_ACTIONS = [
  { icon: "calendar_add_on", label: "Schedule session", href: "/coach/schedule" },
  { icon: "auto_awesome", label: "Generate AI plan", primary: true },
  { icon: "healing", label: "Send recovery program" },
  { icon: "analytics", label: "Review analytics", href: "/coach/dashboard" },
  { icon: "bolt", label: "Start AI intervention" },
];

function LearnerRow({
  learner,
  m,
  index,
  expanded,
  onToggle,
}: {
  learner: Learner;
  m: AthleteMetrics;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const risk = RISK_STYLE[m.risk];
  const trendUp = m.trendDelta >= 0;

  return (
    <article
      className={cn(
        "animate-rise-in overflow-hidden rounded-[16px] border bg-surface-container-lowest transition-all duration-300",
        expanded
          ? "border-primary/30 shadow-[0_20px_44px_-26px_rgba(53,37,205,0.45)]"
          : "border-[var(--color-border-soft)] hover:border-primary/25 hover:shadow-[0_14px_32px_-24px_rgba(53,37,205,0.4)]",
      )}
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      {/* collapsed header */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3.5 text-left sm:gap-4 sm:p-4"
      >
        {/* identity */}
        <div className="relative shrink-0">
          <img
            src={learner.avatarUrl}
            alt={learner.name}
            className="h-12 w-12 rounded-[12px] object-cover"
          />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-surface-container-lowest",
              risk.dot,
            )}
            title={m.riskLabel}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-on-surface">
            {learner.name}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-on-surface-variant">
            {learner.preferredSports[0]} · {learner.goals[0] ?? "General fitness"}
          </p>
        </div>

        {/* readiness ring */}
        <div className="hidden shrink-0 sm:block">
          <ProgressRing
            value={m.readiness}
            size={48}
            stroke={4.5}
            color={scoreColor(m.readiness)}
          >
            <span className="text-[13px] font-semibold text-on-surface">
              {m.readiness}
            </span>
          </ProgressRing>
        </div>

        {/* weekly trend */}
        <div className="hidden shrink-0 flex-col items-end xl:flex">
          <Sparkline
            data={m.trend}
            width={84}
            height={30}
            color={trendUp ? "#1f9d57" : "#e0503f"}
          />
          <span
            className={cn(
              "mt-0.5 text-[11px] font-semibold",
              trendUp ? "text-[#1f7a4d]" : "text-[#c4362b]",
            )}
          >
            {trendUp ? "+" : ""}
            {m.trendDelta} pts
          </span>
        </div>

        {/* streak */}
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <MaterialIcon
            name="local_fire_department"
            filled
            size={16}
            className="text-amber-500"
          />
          <span className="text-[13px] font-semibold text-on-surface">
            {learner.streakDays}d
          </span>
        </div>

        {/* risk chip */}
        <span
          className={cn(
            "hidden shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline-block",
            risk.chip,
          )}
        >
          {m.riskLabel}
        </span>

        <MaterialIcon
          name="expand_more"
          size={20}
          className={cn(
            "shrink-0 text-on-surface-variant transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border-soft)] p-4 sm:p-5">
              {/* metric tiles */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MetricBar label="Readiness" value={m.readiness} />
                <MetricBar label="Recovery" value={m.recovery} />
                <MetricBar label="Engagement" value={m.engagement} />
                <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                    AI compatibility
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[18px] font-semibold text-primary">
                    <MaterialIcon name="auto_awesome" filled size={14} />
                    {learner.matchRate}%
                  </p>
                </div>
              </div>

              {/* consistency + load */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                    14-day training consistency
                  </p>
                  <div className="mt-2 flex gap-1">
                    {m.consistency.map((on, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-4 w-4 rounded-[4px]",
                          on ? "bg-primary" : "bg-surface-container-high",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                      Training load
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[14px] font-semibold",
                        m.load === "High"
                          ? "text-[#c4362b]"
                          : m.load === "Low"
                            ? "text-[#b95000]"
                            : "text-[#1f7a4d]",
                      )}
                    >
                      {m.load}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                      Total trained
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-on-surface">
                      {learner.totalHoursTrained}h
                    </p>
                  </div>
                </div>
              </div>

              {/* quick actions */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border-soft)] pt-4">
                {QUICK_ACTIONS.map((a) => {
                  const cls = cn(
                    "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[12.5px] font-semibold transition-colors",
                    a.primary
                      ? "bg-primary text-on-primary hover:bg-[#2d20b8]"
                      : "border border-[var(--color-border-soft)] text-on-surface hover:border-primary/40 hover:text-primary",
                  );
                  return a.href ? (
                    <Link key={a.label} href={a.href} className={cls}>
                      <MaterialIcon name={a.icon} filled={a.primary} size={15} />
                      {a.label}
                    </Link>
                  ) : (
                    <button key={a.label} className={cls}>
                      <MaterialIcon name={a.icon} filled={a.primary} size={15} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1.5 text-[18px] font-semibold text-on-surface">
        {value}
        <span className="text-[12px] text-on-surface-variant">/100</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: scoreColor(value),
          }}
        />
      </div>
    </div>
  );
}
