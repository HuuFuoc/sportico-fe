"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Brain,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  Eye,
  FileText,
  Filter,
  Flag,
  Globe,
  Hourglass,
  Info,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency } from "@/lib/utils";
import { mockEarnings, mockPayouts } from "@/lib/mock/earnings";
import { getCoachById } from "@/lib/mock/users";
import type { Payout } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// Synthetic financial data
// ============================================================================

const PLATFORM_FEE_PCT = 0.15;
const SCALE = 18.4; // marketplace-wide scale-up

const cashflow = mockEarnings.map((e, i) => {
  const revenue = Math.round(e.gross * SCALE);
  const payouts = Math.round(revenue * (1 - PLATFORM_FEE_PCT));
  const fees = revenue - payouts;
  // Plant 2 anomalies
  const anomaly = i === 6 ? "spike" : i === 9 ? "dip" : null;
  return {
    month: e.month,
    revenue,
    payouts,
    fees,
    failedRate: Number((0.6 + Math.sin(i * 1.2) * 0.4 + (i === 10 ? 1.4 : 0)).toFixed(2)),
    anomaly,
  };
});

const last = cashflow[cashflow.length - 1];
const prev = cashflow[cashflow.length - 2];

const GROSS_VOLUME = last.revenue;
const NET_REVENUE = last.fees;
const PLATFORM_MARGIN = 15.0;
const PENDING_LIABILITY = 125_400;
const FAILED_RATE = 2.4;
const RESERVE_EXPOSURE = 87_200;

const RAILS = [
  { id: "ach", label: "ACH", volume: 412_000, success: 97.2, latencyHr: 36 },
  { id: "wire", label: "Wire", volume: 198_000, success: 99.4, latencyHr: 4 },
  { id: "card", label: "Card payout", volume: 84_000, success: 95.1, latencyHr: 1 },
  { id: "intl", label: "Intl SEPA", volume: 62_000, success: 91.8, latencyHr: 48 },
];

type PayoutRail = "ACH" | "Wire" | "Card" | "SEPA";
type EnrichedPayout = Payout & {
  rail: PayoutRail;
  country: string;
  riskScore: number;
  aiFlag: boolean;
  failureReason?: string;
  ageHours: number;
};

const COUNTRIES = ["US", "US", "GB", "DE", "FR", "US", "CA"];

function seedSpark(seed: number, base: number, jitter: number, len = 12) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 4) + noise) };
  });
}

function seedSparkVar(seed: number, base: number, jitter: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: base + noise + (i === 8 ? -jitter * 1.4 : 0) };
  });
}

// ============================================================================
// Page
// ============================================================================

const RANGE_OPTIONS = ["24h", "7d", "30d", "90d", "12m"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

export default function AdminRevenuePage() {
  const reduce = useReducedMotion();
  const [range, setRange] = useState<Range>("30d");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState<
    "all" | "needs_action" | "failed" | "high_risk"
  >("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Enrich payouts
  const payouts = useMemo<EnrichedPayout[]>(
    () =>
      mockPayouts.map((p, i) => ({
        ...p,
        rail: (["ACH", "Wire", "Card", "SEPA"] as PayoutRail[])[i % 4],
        country: COUNTRIES[i % COUNTRIES.length],
        riskScore: p.status === "failed" ? 78 : p.status === "pending" ? 42 : 18,
        aiFlag: p.status === "failed" || i === 2,
        failureReason:
          p.status === "failed" ? "Account closed (R02)" : undefined,
        ageHours:
          p.status === "pending"
            ? 28 + i * 2
            : p.status === "processing"
              ? 6
              : 0,
      })),
    [],
  );

  const filteredPayouts = useMemo(() => {
    let list = payouts;
    if (tableFilter === "failed") list = list.filter((p) => p.status === "failed");
    if (tableFilter === "needs_action")
      list = list.filter(
        (p) => p.status === "pending" || p.status === "failed",
      );
    if (tableFilter === "high_risk")
      list = list.filter((p) => p.riskScore >= 50);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const c = getCoachById(p.coachId);
        return (
          (c?.name ?? "").toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [payouts, tableFilter, search]);

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (filteredPayouts.every((p) => selected.has(p.id))) {
      const next = new Set(selected);
      filteredPayouts.forEach((p) => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filteredPayouts.forEach((p) => next.add(p.id));
      setSelected(next);
    }
  };
  const allSelected =
    filteredPayouts.length > 0 &&
    filteredPayouts.every((p) => selected.has(p.id));

  return (
    <AppShell role="admin" title="Revenue & Payouts">
      <div className="max-w-[1500px] mx-auto pb-24 space-y-4">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10.5px] font-semibold border border-primary/15">
                <CircleDollarSign size={10} />
                Finance Ops Console
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#1f7a4d]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live · last sync 14s ago
              </span>
            </div>
            <h1 className="text-[26px] sm:text-[30px] leading-[1.1] font-bold tracking-tight">
              Revenue &amp; Payouts
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Cash movement, rail performance, and payout operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Range */}
            <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-container-low rounded-md border border-[var(--color-border-soft)]">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "relative px-2.5 h-7 text-[11.5px] font-semibold rounded-[5px] transition-colors tabular-nums",
                    range === r
                      ? "text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {range === r && (
                    <motion.span
                      layoutId="revRangePill"
                      className="absolute inset-0 bg-surface-container-lowest rounded-[5px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                      transition={{
                        type: "spring",
                        duration: reduce ? 0 : 0.35,
                        bounce: 0.2,
                      }}
                    />
                  )}
                  <span className="relative">{r}</span>
                </button>
              ))}
            </div>
            <ToolbarBtn icon={CalendarRange} label="Custom" />
            <ToolbarBtn icon={Globe} label="USD" caret />
            <ToolbarBtn icon={RefreshCw} ariaLabel="Refresh" />
            <ToolbarBtn icon={Settings2} ariaLabel="Settings" />
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-semibold transition-colors">
              <Download size={12} />
              Export
            </button>
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary text-[12px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.35)] hover:bg-[#3a2db5] transition-colors">
              <Play size={11} strokeWidth={2.5} />
              Run Payout Batch
            </button>
          </div>
        </motion.header>

        {/* ============ KPI STRIP ============ */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--color-border-soft)] rounded-[12px] border border-[var(--color-border-soft)] overflow-hidden">
          <Kpi
            label="Gross Volume"
            value={formatCurrency(GROSS_VOLUME)}
            delta={`+${pctDelta(last.revenue, prev.revenue)}%`}
            deltaDir="up"
            compare="vs prev month"
            spark={seedSpark(1, 600000, 80000)}
            tone="neutral"
            insight="Trending above 90-day average."
          />
          <Kpi
            label="Net Revenue"
            value={formatCurrency(NET_REVENUE)}
            delta={`+${pctDelta(last.fees, prev.fees)}%`}
            deltaDir="up"
            compare="vs prev month"
            spark={seedSpark(2, 90000, 12000)}
            tone="good"
          />
          <Kpi
            label="Platform Margin"
            value={`${PLATFORM_MARGIN.toFixed(1)}%`}
            delta="−0.4 bps"
            deltaDir="down"
            compare="QoQ compression"
            spark={seedSparkVar(3, 15.2, 0.4)}
            tone="warn"
            insight="Slight compression — investigate ACH rail cost."
          />
          <Kpi
            label="Pending Liability"
            value={formatCurrency(PENDING_LIABILITY)}
            delta="14 tx"
            deltaDir="neutral"
            compare="in flight"
            spark={seedSpark(4, 120000, 18000)}
            tone="neutral"
          />
          <Kpi
            label="Failed Payout Rate"
            value={`${FAILED_RATE.toFixed(2)}%`}
            delta="+18%"
            deltaDir="up"
            compare="vs 7d avg"
            spark={seedSparkVar(5, 1.6, 0.6)}
            tone="danger"
            insight="Spike on ACH rail — investigate"
            anomaly
          />
          <Kpi
            label="Reserve Exposure"
            value={formatCurrency(RESERVE_EXPOSURE)}
            delta="0.9x"
            deltaDir="neutral"
            compare="coverage ratio"
            spark={seedSpark(6, 85000, 6000)}
            tone="good"
          />
        </section>

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          {/* ============ LEFT ============ */}
          <div className="space-y-4 min-w-0">
            {/* Cashflow chart */}
            <CashflowChart data={cashflow} reduce={reduce ?? false} />

            {/* Rail performance + Settlement */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
              <RailPerformance reduce={reduce ?? false} />
              <SettlementTimeline reduce={reduce ?? false} />
            </div>

            {/* Payouts table */}
            <PayoutTable
              payouts={filteredPayouts}
              search={search}
              setSearch={setSearch}
              filter={tableFilter}
              setFilter={setTableFilter}
              selected={selected}
              toggleOne={toggleOne}
              toggleAll={toggleAll}
              allSelected={allSelected}
              expanded={expanded}
              setExpanded={setExpanded}
              reduce={reduce ?? false}
            />
          </div>

          {/* ============ RIGHT: AI INTELLIGENCE ============ */}
          <aside className="space-y-4">
            <AIAlerts reduce={reduce ?? false} />
            <CashflowForecast reduce={reduce ?? false} />
            <OperationalAlerts reduce={reduce ?? false} />
          </aside>
        </div>
      </div>

      {/* ============ BULK ACTION BAR ============ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ============================================================================
// Toolbar button
// ============================================================================

function ToolbarBtn({
  icon: Icon,
  label,
  caret,
  ariaLabel,
}: {
  icon: typeof RefreshCw;
  label?: string;
  caret?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      aria-label={ariaLabel ?? label}
      className={cn(
        "h-8 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-semibold text-on-surface transition-colors",
        label ? "px-2.5" : "w-8 justify-center",
      )}
    >
      <Icon size={12} />
      {label}
      {caret && <ChevronDown size={10} className="text-on-surface-variant" />}
    </button>
  );
}

// ============================================================================
// KPI tile (strip)
// ============================================================================

function Kpi({
  label,
  value,
  delta,
  deltaDir,
  compare,
  spark,
  tone,
  insight,
  anomaly,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  compare?: string;
  spark: { i: number; v: number }[];
  tone: "good" | "warn" | "danger" | "neutral";
  insight?: string;
  anomaly?: boolean;
}) {
  const sparkColor =
    tone === "good"
      ? "#10b981"
      : tone === "warn"
        ? "#f59e0b"
        : tone === "danger"
          ? "#ef4444"
          : "#4f46e5";
  const deltaColor =
    deltaDir === "up" && tone === "danger"
      ? "text-[#ba1a1a]"
      : deltaDir === "up"
        ? "text-[#1f7a4d]"
        : deltaDir === "down" && tone === "warn"
          ? "text-[#b95000]"
          : deltaDir === "down"
            ? "text-[#ba1a1a]"
            : "text-on-surface-variant";
  const DeltaIcon =
    deltaDir === "up" ? TrendingUp : deltaDir === "down" ? TrendingDown : Info;
  return (
    <div className="group relative bg-surface-container-lowest p-3.5 hover:bg-surface-container-low/40 transition-colors cursor-pointer">
      {anomaly && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-[#ffdad6] text-[#ba1a1a] text-[9px] font-bold uppercase tracking-wider">
          <AlertTriangle size={8} />
          Anomaly
        </span>
      )}
      <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
        {label}
      </p>
      <p className="text-[20px] font-bold tracking-tight tabular-nums leading-none mt-1.5">
        {value}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px]">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-bold tabular-nums",
              deltaColor,
            )}
          >
            <DeltaIcon size={10} />
            {delta}
          </span>
        )}
        {compare && (
          <span className="text-on-surface-variant">{compare}</span>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-6 mt-2 -mx-1">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={spark}
              margin={{ top: 2, right: 4, bottom: 0, left: 4 }}
            >
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>

      {insight && (
        <p className="text-[10px] text-on-surface-variant mt-1.5 line-clamp-1 group-hover:text-on-surface transition-colors">
          {insight}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Cashflow chart (revenue + payouts + failed rate + anomaly markers)
// ============================================================================

function CashflowChart({
  data,
  reduce,
}: {
  data: typeof cashflow;
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.05, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold tracking-tight">
              Cashflow Movement
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#ffdad6] text-[10px] font-bold text-[#ba1a1a]">
              <AlertTriangle size={9} />2 anomalies
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Revenue · Net payouts · Failed rate %
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <LegendDot color="#4f46e5" label="Revenue" filled />
          <LegendDot color="#94a3b8" label="Payouts" filled />
          <LegendDot color="#ef4444" label="Failed %" line />
        </div>
      </div>

      <div className="h-[280px] p-3">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ left: -4, right: 8, top: 12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="payBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#e8e8e5"
                strokeDasharray="4 6"
              />
              <XAxis
                dataKey="month"
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                yAxisId="left"
                stroke="#777587"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ef4444"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                width={32}
              />
              <Tooltip
                content={<CashflowTooltip />}
                cursor={{ fill: "rgba(79, 70, 229, 0.05)" }}
              />
              <ReferenceLine
                yAxisId="right"
                y={2}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
                label={{
                  value: "Threshold 2.0%",
                  position: "insideRight",
                  fontSize: 9,
                  fill: "#ef4444",
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="url(#revBar)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 700}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.anomaly === "spike" ? "#4f46e5" : "url(#revBar)"}
                    opacity={d.anomaly === "dip" ? 0.5 : 1}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="left"
                dataKey="payouts"
                fill="url(#payBar)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 700}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="failedRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload, index } = props as {
                    cx: number;
                    cy: number;
                    payload: { failedRate: number };
                    index: number;
                  };
                  const isAnomaly = payload.failedRate > 2;
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={isAnomaly ? 4 : 2}
                      fill={isAnomaly ? "#ef4444" : "#fff"}
                      stroke="#ef4444"
                      strokeWidth={isAnomaly ? 2 : 1.5}
                    />
                  );
                }}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </motion.section>
  );
}

interface CashflowPayload {
  payload: {
    month: string;
    revenue: number;
    payouts: number;
    fees: number;
    failedRate: number;
    anomaly: string | null;
  };
}

function CashflowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CashflowPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[8px] p-2.5 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)] min-w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant">
          {d.month}
        </p>
        {d.anomaly && (
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded",
              d.anomaly === "spike"
                ? "bg-success-container text-[#1f7a4d]"
                : "bg-[#fff5d6] text-[#b95000]",
            )}
          >
            {d.anomaly}
          </span>
        )}
      </div>
      <div className="space-y-1 text-[11px]">
        <Row
          color="#4f46e5"
          label="Revenue"
          value={formatCurrency(d.revenue)}
        />
        <Row
          color="#94a3b8"
          label="Payouts"
          value={formatCurrency(d.payouts)}
        />
        <Row
          color="#10b981"
          label="Net fees"
          value={formatCurrency(d.fees)}
        />
        <div className="pt-1 mt-1 border-t border-[var(--color-border-soft)]">
          <Row
            color="#ef4444"
            label="Failed rate"
            value={`${d.failedRate.toFixed(2)}%`}
            warn={d.failedRate > 2}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
  warn,
}: {
  color: string;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        {label}
      </span>
      <span
        className={cn(
          "font-bold tabular-nums",
          warn ? "text-[#ba1a1a]" : "text-on-surface",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function LegendDot({
  color,
  label,
  filled,
  line,
}: {
  color: string;
  label: string;
  filled?: boolean;
  line?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-variant">
      {line ? (
        <span
          className="inline-block w-3 h-0.5 rounded-full"
          style={{ background: color }}
        />
      ) : (
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ background: filled ? color : "transparent", border: filled ? "none" : `1px solid ${color}` }}
        />
      )}
      {label}
    </span>
  );
}

// ============================================================================
// Rail Performance
// ============================================================================

function RailPerformance({ reduce }: { reduce: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.1, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <Layers size={13} className="text-primary" />
            Payout Rail Performance
          </h3>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Volume · success rate · settlement latency
          </p>
        </div>
        <button className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5">
          Details
          <ChevronRight size={11} />
        </button>
      </div>

      <table className="w-full text-left">
        <thead className="bg-surface-container-low/30 border-b border-[var(--color-border-soft)] text-[10px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="px-4 py-2 font-semibold">Rail</th>
            <th className="px-3 py-2 font-semibold text-right">Volume</th>
            <th className="px-3 py-2 font-semibold text-right">Success</th>
            <th className="px-3 py-2 font-semibold text-right">Settle</th>
            <th className="px-4 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {RAILS.map((r) => {
            const healthy = r.success >= 96;
            const warn = r.success < 96 && r.success >= 92;
            return (
              <tr
                key={r.id}
                className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low/30 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <p className="text-[12.5px] font-semibold">{r.label}</p>
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] font-bold tabular-nums">
                  {formatCurrency(r.volume)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center justify-end gap-1 text-[12px] font-bold tabular-nums",
                      healthy
                        ? "text-[#1f7a4d]"
                        : warn
                          ? "text-[#b95000]"
                          : "text-[#ba1a1a]",
                    )}
                  >
                    {r.success.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-[11.5px] tabular-nums text-on-surface-variant">
                  {r.latencyHr < 24
                    ? `${r.latencyHr}h`
                    : `${Math.round(r.latencyHr / 24)}d`}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider",
                      healthy
                        ? "bg-success-container text-[#1f7a4d]"
                        : warn
                          ? "bg-[#fff5d6] text-[#b95000]"
                          : "bg-[#ffdad6] text-[#ba1a1a]",
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        healthy
                          ? "bg-[#10b981]"
                          : warn
                            ? "bg-[#f59e0b]"
                            : "bg-[#ef4444]",
                      )}
                    />
                    {healthy
                      ? "Healthy"
                      : warn
                        ? "Degraded"
                        : "Issue"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.section>
  );
}

// ============================================================================
// Settlement Timeline
// ============================================================================

function SettlementTimeline({ reduce }: { reduce: boolean }) {
  const items = [
    {
      id: 1,
      label: "Batch #20460 settled",
      meta: "ACH · 42 payouts · $84,200",
      time: "2h ago",
      tone: "good" as const,
      icon: ArrowUpRight,
    },
    {
      id: 2,
      label: "Wire rail reconciled",
      meta: "12 payouts · $42,500",
      time: "5h ago",
      tone: "good" as const,
      icon: ArrowUpRight,
    },
    {
      id: 3,
      label: "Failed payout batch",
      meta: "ACH R02 · 3 payouts",
      time: "9h ago",
      tone: "danger" as const,
      icon: XCircle,
    },
    {
      id: 4,
      label: "Reserve refilled",
      meta: "Treasury sweep · $200K",
      time: "1d ago",
      tone: "info" as const,
      icon: ArrowDownLeft,
    },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.15, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <h3 className="text-[14px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Activity size={13} className="text-primary" />
          Settlement Activity
        </h3>
        <span className="text-[10.5px] text-on-surface-variant">24h</span>
      </div>
      <ul className="px-2 py-2 space-y-0.5">
        {items.map((it) => {
          const tone =
            it.tone === "good"
              ? "text-[#1f7a4d] bg-success-container"
              : it.tone === "danger"
                ? "text-[#ba1a1a] bg-[#ffdad6]"
                : "text-primary bg-primary/10";
          return (
            <li
              key={it.id}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-container-low/40 transition-colors cursor-pointer"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                  tone,
                )}
              >
                <it.icon size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate">
                  {it.label}
                </p>
                <p className="text-[10.5px] text-on-surface-variant truncate">
                  {it.meta}
                </p>
              </div>
              <span className="text-[10.5px] text-on-surface-variant tabular-nums whitespace-nowrap">
                {it.time}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ============================================================================
// Payout Table
// ============================================================================

const STATUS_META: Record<
  Payout["status"],
  { label: string; pill: string; dot: string }
> = {
  paid: {
    label: "Paid",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
  },
  pending: {
    label: "Pending",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
  },
  processing: {
    label: "Processing",
    pill: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  failed: {
    label: "Failed",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
  },
};

function PayoutTable({
  payouts,
  search,
  setSearch,
  filter,
  setFilter,
  selected,
  toggleOne,
  toggleAll,
  allSelected,
  expanded,
  setExpanded,
  reduce,
}: {
  payouts: EnrichedPayout[];
  search: string;
  setSearch: (s: string) => void;
  filter: "all" | "needs_action" | "failed" | "high_risk";
  setFilter: (f: "all" | "needs_action" | "failed" | "high_risk") => void;
  selected: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  allSelected: boolean;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  reduce: boolean;
}) {
  const FILTERS: { id: typeof filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: payouts.length },
    {
      id: "needs_action",
      label: "Needs action",
      count: payouts.filter(
        (p) => p.status === "failed" || p.status === "pending",
      ).length,
    },
    {
      id: "failed",
      label: "Failed",
      count: payouts.filter((p) => p.status === "failed").length,
    },
    {
      id: "high_risk",
      label: "High risk",
      count: payouts.filter((p) => p.riskScore >= 50).length,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.2, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[14px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <Wallet size={13} className="text-primary" />
            Payout Operations Queue
          </h3>
          <span className="text-[10.5px] text-on-surface-variant">
            {payouts.length} in view
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Filter pills */}
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-container-low rounded-md border border-[var(--color-border-soft)]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 h-6 text-[11px] font-semibold rounded-[5px] transition-colors",
                  filter === f.id
                    ? "bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {f.label}
                {f.count !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-sm text-[9px] font-bold tabular-nums",
                      filter === f.id
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container-high text-on-surface-variant",
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search id, method, coach…"
              className="h-7 pl-7 pr-2.5 w-44 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/8 rounded-md outline-none text-[11.5px] placeholder:text-on-surface-variant transition-all"
            />
          </div>

          <button className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[11px] font-semibold transition-colors">
            <Filter size={11} />
            More
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="pl-4 pr-1 py-2 w-7">
                <SmallCheckbox
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-2 py-2 font-bold">Coach</th>
              <th className="px-2 py-2 font-bold">Reference</th>
              <th className="px-2 py-2 font-bold">Rail</th>
              <th className="px-2 py-2 font-bold">Country</th>
              <th className="px-2 py-2 font-bold text-right">Amount</th>
              <th className="px-2 py-2 font-bold">Risk</th>
              <th className="px-2 py-2 font-bold">Age</th>
              <th className="px-2 py-2 font-bold">Status</th>
              <th className="pr-4 pl-2 py-2 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center">
                  <p className="text-[12px] text-on-surface-variant">
                    No payouts match the current filter.
                  </p>
                </td>
              </tr>
            )}
            {payouts.map((p, i) => {
              const coach = getCoachById(p.coachId);
              const status = STATUS_META[p.status];
              const isSelected = selected.has(p.id);
              const isExpanded = expanded === p.id;
              const riskTone =
                p.riskScore >= 70
                  ? "high"
                  : p.riskScore >= 40
                    ? "med"
                    : "low";
              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className={cn(
                      "border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors cursor-pointer group",
                      i % 2 === 1 && !isSelected && "bg-surface-container-low/15",
                      isSelected
                        ? "bg-primary/[0.05] hover:bg-primary/[0.08]"
                        : "hover:bg-primary/[0.03]",
                      p.status === "failed" &&
                        !isSelected &&
                        "bg-[#ffdad6]/15 hover:bg-[#ffdad6]/25",
                    )}
                  >
                    <td
                      className="pl-4 pr-1 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SmallCheckbox
                        checked={isSelected}
                        onChange={() => toggleOne(p.id)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={coach?.avatarUrl}
                          alt={coach?.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold truncate inline-flex items-center gap-1">
                            {coach?.name ?? "—"}
                            {p.aiFlag && (
                              <span
                                className="text-primary"
                                title="AI flagged"
                              >
                                <Sparkles size={10} />
                              </span>
                            )}
                          </p>
                          <p className="text-[10.5px] text-on-surface-variant truncate">
                            {new Date(p.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-mono text-[11px] text-on-surface-variant uppercase">
                        {p.id}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-low text-on-surface border border-[var(--color-border-soft)]">
                        {p.rail}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-[11.5px] font-semibold text-on-surface">
                        {p.country}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <p className="text-[13px] font-bold tabular-nums">
                        {formatCurrency(p.amount, p.currency)}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5 w-[80px]">
                        <div className="flex-1 h-1 rounded-full bg-surface-container-low overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              riskTone === "high"
                                ? "bg-[#ef4444]"
                                : riskTone === "med"
                                  ? "bg-[#f59e0b]"
                                  : "bg-[#10b981]",
                            )}
                            style={{ width: `${p.riskScore}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[10.5px] font-bold tabular-nums",
                            riskTone === "high"
                              ? "text-[#ba1a1a]"
                              : riskTone === "med"
                                ? "text-[#b95000]"
                                : "text-on-surface-variant",
                          )}
                        >
                          {p.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <p
                        className={cn(
                          "text-[11px] tabular-nums",
                          p.ageHours > 48
                            ? "text-[#b95000] font-bold"
                            : "text-on-surface-variant",
                        )}
                      >
                        {p.ageHours > 0
                          ? p.ageHours > 24
                            ? `${Math.round(p.ageHours / 24)}d`
                            : `${p.ageHours}h`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          status.pill,
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status.dot,
                          )}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td
                      className="pr-4 pl-2 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {p.status === "failed" && (
                          <RowAction icon={RefreshCw} label="Retry" />
                        )}
                        {p.status === "pending" && (
                          <RowAction icon={Pause} label="Hold" />
                        )}
                        <RowAction icon={Eye} label="View" />
                        <RowAction icon={ShieldAlert} label="Investigate" />
                        <RowAction icon={EllipsisVertical} label="More" />
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-gradient-to-br from-primary/[0.02] to-transparent border-b border-[var(--color-border-soft)]"
                      >
                        <td colSpan={10} className="px-4 py-3">
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <Detail
                              label="Gross"
                              value={formatCurrency(
                                Math.round(p.amount / 0.85),
                                p.currency,
                              )}
                            />
                            <Detail
                              label="Platform fee"
                              value={`−${formatCurrency(Math.round((p.amount / 0.85) * 0.15), p.currency)}`}
                            />
                            <Detail
                              label="Net"
                              value={formatCurrency(p.amount, p.currency)}
                              highlight
                            />
                            <Detail label="Method" value={p.method} />
                            <Detail
                              label="Settle ETA"
                              value={
                                p.status === "paid"
                                  ? "Completed"
                                  : p.rail === "Wire"
                                    ? "Same day"
                                    : "1–3 business days"
                              }
                            />
                          </div>
                          {p.failureReason && (
                            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-[#ffdad6]/40 border border-[#ffbbb3]">
                              <XCircle
                                size={12}
                                className="text-[#ba1a1a] mt-0.5 shrink-0"
                              />
                              <div>
                                <p className="text-[11.5px] font-bold text-[#ba1a1a]">
                                  Failure: {p.failureReason}
                                </p>
                                <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                                  Suggested action: contact coach to verify
                                  bank account, then retry.
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-3">
                            <ExpandedAction icon={Eye} label="Full record" />
                            <ExpandedAction icon={FileText} label="Invoice" />
                            <ExpandedAction icon={Copy} label="Copy ID" />
                            {p.status === "failed" && (
                              <ExpandedAction
                                icon={RefreshCw}
                                label="Retry payout"
                                primary
                              />
                            )}
                            <ExpandedAction
                              icon={Flag}
                              label="Escalate"
                              danger
                            />
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--color-border-soft)] flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>
          Showing{" "}
          <span className="text-on-surface font-bold tabular-nums">
            {payouts.length}
          </span>{" "}
          of {payouts.length} payouts
        </span>
        <div className="inline-flex items-center gap-2">
          <span>
            Total volume:{" "}
            <span className="text-on-surface font-bold tabular-nums">
              {formatCurrency(
                payouts.reduce((s, p) => s + p.amount, 0),
              )}
            </span>
          </span>
        </div>
      </div>
    </motion.section>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
        {label}
      </p>
      <p
        className={cn(
          "text-[13px] font-bold tabular-nums mt-0.5",
          highlight && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ExpandedAction({
  icon: Icon,
  label,
  primary,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-[11px] font-semibold transition-colors",
        primary
          ? "bg-primary text-on-primary hover:bg-[#3a2db5]"
          : danger
            ? "border border-[var(--color-border-soft)] text-[#ba1a1a] hover:bg-[#ffdad6]/40"
            : "border border-[var(--color-border-soft)] hover:bg-surface-container-low",
      )}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

function RowAction({
  icon: Icon,
  label,
}: {
  icon: typeof RefreshCw;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-md hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
    >
      <Icon size={12} />
    </button>
  );
}

function SmallCheckbox({
  checked,
  onChange,
  ...rest
}: {
  checked: boolean;
  onChange: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
        {...rest}
      />
      <span
        className={cn(
          "w-3.5 h-3.5 rounded-[3px] border-2 flex items-center justify-center transition-all",
          checked
            ? "bg-primary border-primary"
            : "border-[var(--color-outline-variant)] bg-surface-container-lowest hover:border-primary/50",
        )}
      >
        {checked && (
          <svg viewBox="0 0 8 8" className="w-2 h-2 text-white">
            <path
              d="M1 4l2 2 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}

// ============================================================================
// AI Anomaly alerts
// ============================================================================

function AIAlerts({ reduce }: { reduce: boolean }) {
  const alerts = [
    {
      severity: "high" as const,
      icon: AlertTriangle,
      title: "Failed payouts +18%",
      body: "ACH rail spike vs 7-day average. Likely cause: bank R02 codes.",
      cta: "Investigate",
    },
    {
      severity: "med" as const,
      icon: Hourglass,
      title: "ACH processing delays",
      body: "Settlement latency 41h (avg 36h). 12 payouts impacted.",
      cta: "View batch",
    },
    {
      severity: "med" as const,
      icon: ShieldAlert,
      title: "3 payouts need manual review",
      body: "AI flagged inconsistent destination accounts.",
      cta: "Open queue",
    },
    {
      severity: "info" as const,
      icon: TrendingDown,
      title: "Margin compression",
      body: "Platform margin dropped 0.4 bps QoQ — review rail cost mix.",
      cta: "Analyze",
    },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.1, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain size={13} className="text-primary" />
            <h3 className="text-[13.5px] font-semibold tracking-tight">
              AI Anomaly Detection
            </h3>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {alerts.length} alerts · last scan 2m ago
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ffdad6] text-[10px] font-bold text-[#ba1a1a]">
          {alerts.filter((a) => a.severity === "high").length} high
        </span>
      </div>

      <ul className="divide-y divide-[var(--color-border-soft)]">
        {alerts.map((a, i) => {
          const tone =
            a.severity === "high"
              ? {
                  bg: "bg-[#ffdad6]/40",
                  iconBg: "bg-[#ef4444]",
                  text: "text-[#ba1a1a]",
                  pill: "bg-[#ef4444]/15 text-[#ba1a1a]",
                  label: "HIGH",
                }
              : a.severity === "med"
                ? {
                    bg: "bg-[#fff5d6]/40",
                    iconBg: "bg-[#f59e0b]",
                    text: "text-[#b95000]",
                    pill: "bg-[#f59e0b]/15 text-[#b95000]",
                    label: "MED",
                  }
                : {
                    bg: "bg-primary/[0.04]",
                    iconBg: "bg-primary",
                    text: "text-primary",
                    pill: "bg-primary/10 text-primary",
                    label: "INFO",
                  };
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduce ? 0 : 0.3,
                delay: reduce ? 0 : 0.15 + i * 0.05,
                ease: EASE,
              }}
              className="group hover:bg-surface-container-low/30 transition-colors cursor-pointer"
            >
              <div className={cn("flex items-start gap-2.5 px-3 py-2.5")}>
                <div
                  className={cn(
                    "w-6 h-6 rounded-md text-white flex items-center justify-center shrink-0",
                    tone.iconBg,
                  )}
                >
                  <a.icon size={11} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[12px] font-bold truncate">
                      {a.title}
                    </p>
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0",
                        tone.pill,
                      )}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-snug">
                    {a.body}
                  </p>
                  <button
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity",
                      tone.text,
                    )}
                  >
                    {a.cta}
                    <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ============================================================================
// Cashflow forecast
// ============================================================================

function CashflowForecast({ reduce }: { reduce: boolean }) {
  const forecast = [
    { d: "Mon", v: 84000 },
    { d: "Tue", v: 96000 },
    { d: "Wed", v: 102000 },
    { d: "Thu", v: 88000 },
    { d: "Fri", v: 112000 },
    { d: "Sat", v: 68000 },
    { d: "Sun", v: 54000 },
  ];
  const total = forecast.reduce((s, x) => s + x.v, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.18, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[13.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Banknote size={13} className="text-primary" />
          7-day Cashflow Forecast
        </h3>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Expected payout volume · AI-projected
        </p>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[20px] font-bold tabular-nums leading-none">
            {formatCurrency(total)}
          </span>
          <span className="text-[10.5px] text-on-surface-variant">
            projected
          </span>
        </div>
        <div className="h-[80px]">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecast}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#4f46e5"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#4f46e5" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
        <div className="grid grid-cols-7 mt-1 text-center">
          {forecast.map((f) => (
            <p
              key={f.d}
              className="text-[9.5px] uppercase tracking-wider font-semibold text-on-surface-variant"
            >
              {f.d}
            </p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Operational alerts
// ============================================================================

function OperationalAlerts({ reduce }: { reduce: boolean }) {
  const items = [
    {
      icon: ShieldAlert,
      label: "Reserve coverage 0.9x",
      hint: "Below 1.0x target",
      tone: "warn" as const,
    },
    {
      icon: Clock,
      label: "Wire cutoff in 1h 12m",
      hint: "21 payouts queued",
      tone: "info" as const,
    },
    {
      icon: AlertTriangle,
      label: "1 reconciliation pending",
      hint: "Batch #20458 · $42K",
      tone: "warn" as const,
    },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: 0.24, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[13.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Activity size={13} className="text-primary" />
          Operational Alerts
        </h3>
      </div>
      <ul className="px-2 py-2 space-y-0.5">
        {items.map((it) => {
          const tone =
            it.tone === "warn"
              ? "text-[#b95000]"
              : it.tone === "info"
                ? "text-primary"
                : "text-on-surface-variant";
          return (
            <li
              key={it.label}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-surface-container-low/40 transition-colors cursor-pointer"
            >
              <it.icon size={12} className={tone} />
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-semibold truncate">
                  {it.label}
                </p>
                <p className="text-[10px] text-on-surface-variant truncate">
                  {it.hint}
                </p>
              </div>
              <ChevronRight size={11} className="text-on-surface-variant" />
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ============================================================================
// Bulk action bar
// ============================================================================

function BulkBar({
  count,
  onClear,
  reduce,
}: {
  count: number;
  onClear: () => void;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{
        type: "spring",
        duration: reduce ? 0 : 0.4,
        bounce: 0.15,
      }}
      className="fixed bottom-5 left-4 right-4 lg:left-[calc(16rem+1.5rem)] lg:right-6 z-40"
    >
      <div className="max-w-[1500px] mx-auto rounded-[12px] bg-on-surface/95 backdrop-blur-md text-white py-2.5 px-4 flex items-center justify-between gap-3 shadow-[0_12px_32px_-8px_rgba(15,15,30,0.4)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary text-on-primary text-[11.5px] font-bold tabular-nums">
            {count}
          </span>
          <p className="text-[12.5px] font-semibold truncate">
            {count} payouts selected ·{" "}
            <span className="text-white/60 font-normal">
              Bulk actions apply to all
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BulkBtn icon={Play} label="Approve batch" tone="success" />
          <BulkBtn icon={RefreshCw} label="Retry" />
          <BulkBtn icon={Pause} label="Hold" />
          <BulkBtn icon={ShieldAlert} label="Investigate" />
          <BulkBtn icon={Download} label="Export" />
          <button
            onClick={onClear}
            aria-label="Clear"
            className="ml-1 w-8 h-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
          >
            <XCircle size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function BulkBtn({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Play;
  label: string;
  tone?: "success";
}) {
  return (
    <button
      className={cn(
        "h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md text-[11.5px] font-bold transition-colors",
        tone === "success"
          ? "bg-[#10b981] text-white hover:bg-[#0e9c6e]"
          : "bg-white/10 text-white hover:bg-white/15",
      )}
    >
      <Icon size={11} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function pctDelta(a: number, b: number) {
  return (((a - b) / b) * 100).toFixed(1);
}
