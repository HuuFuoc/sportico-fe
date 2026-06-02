"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Hourglass,
  Lightbulb,
  Loader2,
  Receipt,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { WithdrawModal } from "@/components/coach/WithdrawModal";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { WithdrawalReceiptResponse } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth-session";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { EarningPoint, Payout } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;
const RANGE_OPTIONS = ["3M", "6M", "1Y", "All"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

function seedSpark(seed: number, base: number, jitter: number, len = 8) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 5) + noise) };
  });
}

const STATUS_META: Record<
  Payout["status"],
  { label: string; pill: string; dot: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Đã trả",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
    icon: CheckCircle2,
  },
  pending: {
    label: "Đang chờ",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
    icon: Clock,
  },
  approved: {
    label: "Đã duyệt",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: Hourglass,
  },
  processing: {
    label: "Đang xử lý",
    pill: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
    icon: Hourglass,
  },
  failed: {
    label: "Thất bại",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
    icon: XCircle,
  },
  rejected: {
    label: "Đã từ chối",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
    icon: XCircle,
  },
};

export default function CoachEarningsPage() {
  const currentUserId = getCurrentUserId();

  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchEarnings(),
        api.fetchPayouts(),
        api.fetchEarningsTotal(),
      ]),
    [],
  );
  const earnings = useMemo(() => data?.[0] ?? [], [data]);
  const payouts = useMemo(() => data?.[1] ?? [], [data]);
  const earningsTotal = data?.[2];

  const reduce = useReducedMotion();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [range, setRange] = useState<Range>("1Y");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Payout["status"] | "all">(
    "all",
  );
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Range-filtered earnings
  const rangedEarnings = useMemo(() => {
    const len = earnings.length;
    if (range === "3M") return earnings.slice(-3);
    if (range === "6M") return earnings.slice(-6);
    if (range === "1Y") return earnings.slice(-12);
    return earnings.slice(-len);
  }, [range, earnings]);

  // Filtered payouts list
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.method.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.coachId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, statusFilter, payouts]);

  if (loading) {
    return (
      <AppShell role="coach" title="Thu nhập">
        <LoadingState label="Đang tải dữ liệu thu nhập…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Thu nhập">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  // Empty state: coach has no transactions yet — show wallet summary if available,
  // otherwise a friendly empty income screen.
  if (earnings.length === 0) {
    return (
      <AppShell role="coach" title="Thu nhập">
        <div className="max-w-[1340px] mx-auto">
          <div className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-10 sm:p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(53,37,205,0.4)]">
              <Wallet size={24} className="text-on-primary" />
            </div>
            <h2 className="text-[20px] font-bold tracking-tight">Chưa có thu nhập</h2>
            <p className="text-[14px] text-on-surface-variant mt-2 max-w-sm mx-auto">
              Thu nhập sẽ xuất hiện ở đây sau khi các buổi tập hoàn thành và được ghi nhận vào ví.
            </p>
            {earningsTotal && (
              <div className="mt-6 inline-flex gap-6 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Số dư khả dụng</p>
                  <p className="text-[22px] font-bold tabular-nums mt-0.5">{formatCurrency(earningsTotal.net)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Tổng tích lũy</p>
                  <p className="text-[22px] font-bold tabular-nums mt-0.5">{formatCurrency(earningsTotal.gross)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const last = earnings[earnings.length - 1];
  const prev = earnings[earnings.length - 2] ?? last;
  const total = earnings.reduce((s, x) => s + x.gross, 0);
  const myPayouts = payouts.filter((p) =>
    !currentUserId || p.coachId === currentUserId,
  );
  const pendingTotal = myPayouts
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);

  const deltaPct =
    prev.gross > 0
      ? Math.round(((last.gross - prev.gross) / prev.gross) * 100)
      : 0;

  // Revenue breakdown
  const grossThisMonth = last.gross;
  const platformFee = Math.round(grossThisMonth * 0.15);
  const refunds = Math.round(grossThisMonth * 0.03);
  const netPayout = grossThisMonth - platformFee - refunds;
  const breakdown = [
    { name: "Net payout", value: netPayout, color: "#10b981" },
    { name: "Platform fee", value: platformFee, color: "#4f46e5" },
    { name: "Refunds", value: refunds, color: "#f59e0b" },
  ];

  return (
    <AppShell role="coach" title="Thu nhập">
      <div className="max-w-[1340px] mx-auto space-y-6">
        {/* ============ PAGE HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                <Sparkles size={11} />
                Live financial data
              </span>
              <span className="text-[12px] text-on-surface-variant">
                Updated{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
              Earnings &amp; Analytics
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              Revenue, session volume, and payout flow at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="h-11 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13.5px] font-medium transition-colors">
              <CalendarRange size={15} />
              May 2026
              <ChevronDown size={13} />
            </button>
            <button className="h-11 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13.5px] font-medium transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </motion.header>

        {/* ============ HERO EARNINGS ============ */}
        <HeroEarnings
          value={last.gross}
          deltaPct={deltaPct}
          trend={earnings.slice(-6)}
          onWithdraw={() => setWithdrawOpen(true)}
          reduce={reduce ?? false}
        />

        {/* ============ KPI ROW ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Wallet}
            label="Tháng này"
            value={formatCurrency(last.gross)}
            trend={`${deltaPct > 0 ? "+" : ""}${deltaPct}%`}
            trendDir={deltaPct >= 0 ? "up" : "down"}
            trendLabel="so tháng trước"
            accent="indigo"
            spark={seedSpark(1, last.gross / 50, 8)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Receipt}
            label="Tháng trước"
            value={formatCurrency(prev.gross)}
            trend="Đã đóng"
            trendDir="neutral"
            trendLabel="đã đối soát"
            accent="violet"
            spark={seedSpark(2, prev.gross / 50, 7)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Banknote}
            label="Tổng thu nhập"
            value={formatCurrency(total)}
            trend="+18%"
            trendDir="up"
            trendLabel="so năm ngoái"
            accent="emerald"
            spark={seedSpark(3, total / 200, 30)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Hourglass}
            label="Đang chờ chi trả"
            value={formatCurrency(pendingTotal)}
            trend={`${myPayouts.filter((p) => p.status !== "paid").length} tx`}
            trendDir="neutral"
            trendLabel="đang xử lý"
            accent="amber"
            spark={seedSpark(4, pendingTotal / 30 || 50, 20)}
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ REVENUE CHART + AI SIDEBAR ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5">
          {/* Revenue chart */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
            className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
          >
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[18px] font-semibold tracking-tight">
                    Doanh thu hàng tháng
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-medium text-[#1f7a4d]">
                    <TrendingUp size={10} />
                    Gộp + Ròng
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant">
                  Doanh thu gộp so với doanh thu ròng (sau phí)
                </p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-[32px] leading-none font-bold tracking-tight tabular-nums">
                    {formatCurrency(
                      hoveredMonth
                        ? rangedEarnings.find((e) => e.month === hoveredMonth)
                            ?.gross ?? last.gross
                        : last.gross,
                    )}
                  </span>
                  <span className="text-[13px] text-on-surface-variant">
                    {hoveredMonth ?? last.month}
                  </span>
                </div>
              </div>

              {/* Range pill */}
              <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "relative px-3 h-7 text-[12px] font-medium rounded-[7px] transition-colors",
                      range === r
                        ? "text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {range === r && (
                      <motion.span
                        layoutId="earnRangePill"
                        className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                        transition={{
                          type: "spring",
                          duration: reduce ? 0 : 0.4,
                          bounce: 0.2,
                        }}
                      />
                    )}
                    <span className="relative">{r}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] -mx-2">
              <ClientOnly
                fallback={
                  <div className="h-full w-full bg-surface-container-low rounded-xl animate-pulse" />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={rangedEarnings}
                    margin={{ left: -4, right: 8, top: 12, bottom: 0 }}
                    onMouseMove={(state: unknown) => {
                      const s = state as
                        | {
                            activePayload?: { payload?: { month?: string } }[];
                          }
                        | undefined;
                      const m = s?.activePayload?.[0]?.payload?.month;
                      if (m) setHoveredMonth(m);
                    }}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    <defs>
                      <linearGradient id="revGrossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="60%" stopColor="#4f46e5" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7d6dff" />
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
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      stroke="#777587"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                      width={42}
                    />
                    <Tooltip
                      content={<RevenueTooltip />}
                      cursor={{
                        stroke: "#4f46e5",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="url(#revStrokeGrad)"
                      strokeWidth={2.5}
                      fill="url(#revGrossGrad)"
                      activeDot={{
                        r: 6,
                        fill: "#fff",
                        stroke: "#4f46e5",
                        strokeWidth: 2.5,
                      }}
                      animationDuration={reduce ? 0 : 1200}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="transparent"
                      animationDuration={reduce ? 0 : 1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            <div className="flex items-center gap-5 text-[12px] text-on-surface-variant mt-3 pt-3 border-t border-[var(--color-border-soft)]">
              <Legend color="#4f46e5" label="Gross revenue" />
              <Legend color="#94a3b8" label="Net (after fees)" dashed />
            </div>
          </motion.section>

          {/* AI insights sidebar */}
          <aside className="space-y-4">
            <AIInsightCard
              icon={TrendingUp}
              accent="emerald"
              title={`Doanh thu tăng ${deltaPct >= 0 ? "+" : ""}${deltaPct}% tháng này`}
              body="Bạn đang trên đà đạt tháng mạnh nhất. Duy trì tỷ lệ đặt lịch thứ Sáu để tối đa hóa thu nhập."
              delay={0.15}
              reduce={reduce ?? false}
            />
            <AIInsightCard
              icon={Lightbulb}
              accent="primary"
              title="Mobility Coaching dẫn đầu thu nhập"
              body="62% doanh thu gộp tháng này đến từ buổi mobility — danh mục biên lợi nhuận tốt nhất của bạn."
              cta={{ label: "Tối ưu lịch", icon: Target }}
              delay={0.22}
              reduce={reduce ?? false}
            />
            <AIInsightCard
              icon={Zap}
              accent="amber"
              title="Buổi thứ Sáu trả cao nhất"
              body="Slot thứ Sáu kiếm nhiều hơn 28% trung bình. Còn 3 slot trống thứ Sáu tới."
              cta={{ label: "Lấp đầy slot", icon: ArrowUpRight }}
              delay={0.29}
              reduce={reduce ?? false}
            />
          </aside>
        </div>

        {/* ============ SESSIONS + BREAKDOWN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <SessionsCard
            data={rangedEarnings}
            reduce={reduce ?? false}
          />
          <RevenueBreakdownCard
            breakdown={breakdown}
            gross={grossThisMonth}
            onWithdraw={() => setWithdrawOpen(true)}
            reduce={reduce ?? false}
          />
        </div>

        {/* ============ PAYOUT TABLE + QUICK ACTIONS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <PayoutTable
            payouts={filteredPayouts}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            reduce={reduce ?? false}
          />
          <QuickActionsPanel
            onWithdraw={() => setWithdrawOpen(true)}
            available={earningsTotal?.available}
            pending={earningsTotal?.pending}
            reduce={reduce ?? false}
          />
        </div>
      </div>

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        available={earningsTotal?.available ?? earningsTotal?.net ?? netPayout}
        onSuccess={refetch}
      />
    </AppShell>
  );
}

// ============================================================================
// Hero Earnings
// ============================================================================

function HeroEarnings({
  value,
  deltaPct,
  trend,
  onWithdraw,
  reduce,
}: {
  value: number;
  deltaPct: number;
  trend: EarningPoint[];
  onWithdraw: () => void;
  reduce: boolean;
}) {
  const up = deltaPct >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.55, delay: 0.05, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_16px_36px_-18px_rgba(53,37,205,0.25)]"
    >
      {/* Glow blobs */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-60 h-60 rounded-full bg-gradient-to-tr from-[#7d6dff]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
              This Month Earnings
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold",
                up
                  ? "bg-success-container text-[#1f7a4d]"
                  : "bg-[#ffdad6] text-[#ba1a1a]",
              )}
            >
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {up ? "+" : ""}
              {deltaPct}% vs last month
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[44px] sm:text-[56px] leading-[1] font-bold tracking-tight tabular-nums bg-gradient-to-br from-on-surface via-on-surface to-primary bg-clip-text text-transparent">
              {formatCurrency(value)}
            </span>
            <span className="text-[14px] text-on-surface-variant">USD</span>
          </div>

          <p className="text-[13.5px] text-on-surface-variant mt-3 max-w-xl leading-relaxed">
            You&apos;re pacing{" "}
            <span className="text-on-surface font-medium">12% ahead</span> of
            your monthly target. At this rate, you&apos;ll hit{" "}
            <span className="text-primary font-semibold">$4,800</span> by
            month-end — your highest month on record.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button
              onClick={onWithdraw}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ArrowDownToLine size={15} strokeWidth={2.5} />
              Withdraw Funds
            </button>
            <button className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-[14px] font-medium transition-colors">
              <FileText size={15} />
              Export Report
            </button>
          </div>
        </div>

        {/* Mini hero chart */}
        <div className="hidden lg:block w-[280px] h-[140px] -mb-2">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#heroGrad)"
                  isAnimationActive={!reduce}
                  animationDuration={reduce ? 0 : 1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ClientOnly>
          <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant text-right -translate-y-2">
            6-month trend
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// KPI Card
// ============================================================================

const KPI_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    decor: "from-primary/15 to-primary/0",
    stroke: "#4f46e5",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    decor: "from-[#c084fc]/15 to-[#c084fc]/0",
    stroke: "#8b5cf6",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
    stroke: "#10b981",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
    stroke: "#f59e0b",
  },
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDir,
  trendLabel,
  accent,
  spark,
  delay,
  reduce,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  trend?: string;
  trendDir?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent: keyof typeof KPI_ACCENTS;
  spark: { i: number; v: number }[];
  delay: number;
  reduce: boolean;
}) {
  const a = KPI_ACCENTS[accent];
  const trendColor =
    trendDir === "up"
      ? "text-[#1f7a4d]"
      : trendDir === "down"
        ? "text-[#ba1a1a]"
        : "text-on-surface-variant";
  const TrendIcon =
    trendDir === "up"
      ? TrendingUp
      : trendDir === "down"
        ? TrendingDown
        : Circle;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow cursor-pointer"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
          a.decor,
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[12px] flex items-center justify-center text-white transition-transform group-hover:scale-105",
              a.iconBg,
              a.glow,
            )}
          >
            <Icon size={17} strokeWidth={2.25} />
          </div>
          <ArrowUpRight
            size={15}
            className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
          />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </p>
        <p className="text-[22px] sm:text-[24px] leading-none font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>
        <div className="h-8 mt-3 -mx-1">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={spark}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={a.stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reduce}
                  animationDuration={reduce ? 0 : 1100}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[11.5px]">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trendColor,
              )}
            >
              <TrendIcon size={11} />
              {trend}
            </span>
          )}
          {trendLabel && (
            <span className="text-on-surface-variant">{trendLabel}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// AI Insight Card
// ============================================================================

const INSIGHT_ACCENTS = {
  primary: {
    bg: "from-primary/[0.06] to-[#7d6dff]/[0.04]",
    border: "border-primary/15",
    icon: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]",
    text: "text-primary",
  },
  emerald: {
    bg: "from-[#10b981]/[0.06] to-[#34d399]/[0.04]",
    border: "border-[#10b981]/15",
    icon: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_12px_-2px_rgba(16,185,129,0.35)]",
    text: "text-[#1f7a4d]",
  },
  amber: {
    bg: "from-[#f59e0b]/[0.06] to-[#fb923c]/[0.04]",
    border: "border-[#f59e0b]/20",
    icon: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_12px_-2px_rgba(245,158,11,0.35)]",
    text: "text-[#b45309]",
  },
} as const;

function AIInsightCard({
  icon: Icon,
  accent,
  title,
  body,
  cta,
  delay,
  reduce,
}: {
  icon: typeof Lightbulb;
  accent: keyof typeof INSIGHT_ACCENTS;
  title: string;
  body: string;
  cta?: { label: string; icon: typeof ArrowUpRight };
  delay: number;
  reduce: boolean;
}) {
  const a = INSIGHT_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-[18px] border bg-gradient-to-br p-4 transition-all shadow-[0_1px_2px_rgba(15,15,30,0.04)] hover:shadow-[0_8px_24px_-10px_rgba(15,15,30,0.15)]",
        a.bg,
        a.border,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0",
            a.icon,
            a.glow,
          )}
        >
          <Icon size={15} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold leading-snug">{title}</p>
          <p className="text-[12px] text-on-surface-variant leading-relaxed mt-1">
            {body}
          </p>
          {cta && (
            <button
              className={cn(
                "mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline",
                a.text,
              )}
            >
              <cta.icon size={12} />
              {cta.label}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Sessions chart
// ============================================================================

function SessionsCard({
  data,
  reduce,
}: {
  data: EarningPoint[];
  reduce: boolean;
}) {
  const max = Math.max(...data.map((d) => d.sessions));
  const total = data.reduce((s, d) => s + d.sessions, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.3, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            Session Volume
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Sessions per month
          </p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums mt-3 leading-none">
            {total}
            <span className="text-[13px] font-medium text-on-surface-variant ml-2">
              total in range
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-medium text-[#1f7a4d]">
          <TrendingUp size={10} />
          Peak: {max}
        </span>
      </div>
      <div className="h-[200px] -mx-2">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: -4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="sessBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7d6dff" stopOpacity={0.5} />
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
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                stroke="#777587"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as {
                    month: string;
                    sessions: number;
                    gross: number;
                  };
                  return (
                    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(15,15,30,0.18)]">
                      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                        {p.month}
                      </p>
                      <p className="text-[15px] font-bold tabular-nums mt-0.5">
                        {p.sessions} sessions
                      </p>
                      <p className="text-[11.5px] text-on-surface-variant tabular-nums mt-0.5">
                        {formatCurrency(p.gross)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="sessions"
                radius={[6, 6, 2, 2]}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 900}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.sessions === max ? "#4f46e5" : "url(#sessBarGrad)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Revenue breakdown donut
// ============================================================================

function RevenueBreakdownCard({
  breakdown,
  gross,
  onWithdraw,
  reduce,
}: {
  breakdown: { name: string; value: number; color: string }[];
  gross: number;
  onWithdraw: () => void;
  reduce: boolean;
}) {
  const netPayout = breakdown[0].value;
  const netPct = Math.round((netPayout / gross) * 100);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.35, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="mb-2">
        <h3 className="text-[17px] font-semibold tracking-tight">
          Revenue Breakdown
        </h3>
        <p className="text-[12.5px] text-on-surface-variant mt-0.5">
          Where this month&apos;s {formatCurrency(gross)} goes
        </p>
      </div>

      <div className="flex items-center gap-5 mt-3">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <ClientOnly fallback={<div className="w-full h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                  isAnimationActive={!reduce}
                  animationDuration={reduce ? 0 : 900}
                >
                  {breakdown.map((seg, i) => (
                    <Cell key={i} fill={seg.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ClientOnly>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[22px] font-bold leading-none tabular-nums">
              {netPct}%
            </p>
            <p className="text-[9.5px] uppercase tracking-wider font-medium text-on-surface-variant mt-0.5">
              Net
            </p>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5 min-w-0">
          {breakdown.map((s) => (
            <li key={s.name}>
              <div className="flex items-center gap-2 text-[12.5px]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <span className="text-on-surface-variant truncate flex-1">
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(s.value)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-container-low overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(s.value / gross) * 100}%`,
                    background: s.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
            Net Payout
          </p>
          <p className="text-[20px] font-bold tabular-nums leading-none mt-0.5">
            {formatCurrency(netPayout)}
          </p>
        </div>
        <button
          onClick={onWithdraw}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] transition-all"
        >
          <ArrowDownToLine size={13} />
          Withdraw
        </button>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Payout table
// ============================================================================

function PayoutTable({
  payouts,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  reduce,
}: {
  payouts: Payout[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: Payout["status"] | "all";
  setStatusFilter: (s: Payout["status"] | "all") => void;
  reduce: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Payout | null>(null);
  const [receiptData, setReceiptData] = useState<WithdrawalReceiptResponse | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const handleViewReceipt = async (e: React.MouseEvent, p: Payout) => {
    e.stopPropagation();
    setViewingReceipt(p);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptLoading(true);
    try {
      const data = await api.fetchWithdrawalReceipt(p.id);
      setReceiptData(data);
      if (!data) setReceiptError("Biên nhận chưa khả dụng cho yêu cầu này.");
    } catch {
      setReceiptError("Không tải được biên nhận. Vui lòng thử lại.");
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <>
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.4, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border-soft)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            Payout History
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {payouts.length} payout{payouts.length === 1 ? "" : "s"} in view
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              aria-label="Search payouts"
              placeholder="Tìm phương thức, id…"
              className="h-9 pl-9 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-lg outline-none text-[12.5px] w-44 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-lg">
            {(["all", "paid", "pending", "processing", "failed"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2.5 h-7 rounded-md text-[11px] font-medium capitalize transition-colors",
                    statusFilter === s
                      ? "bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <button className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors">
            <Filter size={13} />
            More
          </button>
          <button className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] transition-all">
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-5 sm:px-6 py-3 font-semibold w-10" />
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 font-semibold">Method</th>
              <th className="px-3 py-3 font-semibold">Reference</th>
              <th className="px-3 py-3 font-semibold text-right">Amount</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-5 sm:px-6 py-3 font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <p className="text-[13px] text-on-surface-variant">
                    No payouts match your filters.
                  </p>
                </td>
              </tr>
            )}
            {payouts.map((p, i) => {
              const meta = STATUS_META[p.status];
              const isOpen = expanded === p.id;
              const StatusIcon = meta.icon;
              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className={cn(
                      "border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors cursor-pointer group",
                      i % 2 === 1 && "bg-surface-container-low/15",
                      "hover:bg-primary/[0.03]",
                    )}
                  >
                    <td className="px-5 sm:px-6 py-3.5">
                      <ChevronRight
                        size={14}
                        className={cn(
                          "text-on-surface-variant transition-transform",
                          isOpen && "rotate-90 text-primary",
                        )}
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[13px] font-medium">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[13px] text-on-surface truncate max-w-[180px]">
                        {p.method}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-[12px] font-mono text-on-surface-variant">
                        {p.id.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="text-[14px] font-bold tabular-nums">
                        {formatCurrency(p.amount, p.currency)}
                      </p>
                      <p className="text-[10.5px] text-on-surface-variant">
                        {p.currency}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                          meta.pill,
                        )}
                      >
                        <StatusIcon size={10} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {p.status === "paid" && (
                          <button
                            onClick={(e) => void handleViewReceipt(e, p)}
                            aria-label="Tải biên nhận"
                            title="Tải biên nhận"
                            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                          >
                            <Receipt size={13} />
                          </button>
                        )}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          aria-label="View"
                          className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gradient-to-br from-primary/[0.02] to-transparent border-b border-[var(--color-border-soft)]">
                      <td colSpan={7} className="px-5 sm:px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[12px]">
                          <DetailItem
                            label="Doanh thu gộp"
                            value={formatCurrency(
                              Math.round(p.amount / 0.85),
                              p.currency,
                            )}
                          />
                          <DetailItem
                            label="Phí nền tảng"
                            value={`-${formatCurrency(
                              Math.round((p.amount / 0.85) * 0.15),
                              p.currency,
                            )}`}
                          />
                          <DetailItem
                            label="Chi trả ròng"
                            value={formatCurrency(p.amount, p.currency)}
                            highlight
                          />
                          <DetailItem
                            label="Quyết toán"
                            value={new Date(
                              new Date(p.date).getTime() +
                                3 * 24 * 60 * 60 * 1000,
                            ).toLocaleDateString("vi-VN", {
                              month: "short",
                              day: "numeric",
                            })}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {p.status === "paid" && (
                            <button
                              onClick={(e) => void handleViewReceipt(e, p)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors"
                            >
                              <Receipt size={12} />
                              Tải biên nhận
                            </button>
                          )}
                          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors">
                            <Send size={12} />
                            Gửi email
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.section>

    {viewingReceipt && (
      <ReceiptModal
        payout={viewingReceipt}
        receipt={receiptData}
        loading={receiptLoading}
        error={receiptError}
        onClose={() => { setViewingReceipt(null); setReceiptData(null); setReceiptError(null); }}
        onRetry={() => void handleViewReceipt({ stopPropagation: () => {} } as React.MouseEvent, viewingReceipt)}
      />
    )}
  </>
  );
}

function DetailItem({
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
      <p className="text-[10.5px] uppercase tracking-wider font-medium text-on-surface-variant">
        {label}
      </p>
      <p
        className={cn(
          "text-[14px] font-bold tabular-nums mt-0.5",
          highlight && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Quick actions panel
// ============================================================================

const QUICK_ACTIONS = [
  {
    icon: ArrowDownToLine,
    label: "Rút tiền",
    desc: "Chuyển về ngân hàng",
    accent: "indigo" as const,
  },
  {
    icon: Download,
    label: "Xuất CSV",
    desc: "12 tháng gần nhất",
    accent: "violet" as const,
  },
  {
    icon: FileText,
    label: "Hồ sơ thuế",
    desc: "1099 & biên lai",
    accent: "amber" as const,
  },
  {
    icon: Receipt,
    label: "Xem hóa đơn",
    desc: "Tất cả giao dịch",
    accent: "emerald" as const,
  },
];

const QA_ACCENT = {
  indigo: "from-primary to-[#7d6dff]",
  violet: "from-[#8b5cf6] to-[#c084fc]",
  emerald: "from-[#10b981] to-[#34d399]",
  amber: "from-[#f59e0b] to-[#fb923c]",
} as const;

function QuickActionsPanel({
  onWithdraw,
  available,
  pending,
  reduce,
}: {
  onWithdraw: () => void;
  available?: number;
  pending?: number;
  reduce: boolean;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.45, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">
        Thao tác nhanh
      </h3>
      <div className="space-y-2">
        {QUICK_ACTIONS.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.button
              key={q.label}
              onClick={q.label === "Rút tiền" ? onWithdraw : undefined}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.5 + i * 0.05,
                ease: EASE,
              }}
              whileHover={reduce ? {} : { x: 2 }}
              className="group w-full flex items-center gap-3 p-3 rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent transition-all text-left"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-[10px] bg-gradient-to-br flex items-center justify-center text-white shadow-[0_3px_10px_-2px_rgba(15,15,30,0.18)] shrink-0 transition-transform group-hover:scale-105",
                  QA_ACCENT[q.accent],
                )}
              >
                <Icon size={15} strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight">
                  {q.label}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {q.desc}
                </p>
              </div>
              <ChevronRight
                size={13}
                className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
              />
            </motion.button>
          );
        })}
      </div>

      {/* Wallet balance banner */}
      <div className="mt-4 p-3.5 rounded-[14px] bg-gradient-to-br from-primary/[0.06] to-[#7d6dff]/[0.04] border border-primary/15">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={12} className="text-primary" />
          <p className="text-[10.5px] uppercase tracking-wider font-bold text-primary">
            Số dư ví
          </p>
        </div>
        {available !== undefined ? (
          <>
            <p className="text-[18px] font-bold tabular-nums leading-none mt-1">
              {formatCurrency(available)}
            </p>
            <p className="text-[11.5px] text-on-surface-variant mt-1">
              Khả dụng rút ngay
              {pending !== undefined && pending > 0 && (
                <> · <span className="text-on-surface font-medium">{formatCurrency(pending)} đang chờ</span></>
              )}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-on-surface-variant mt-1">Đang tải…</p>
        )}
      </div>
    </motion.aside>
  );
}

// ============================================================================
// Receipt Modal
// ============================================================================

function ReceiptModal({
  payout,
  receipt,
  loading,
  error,
  onClose,
  onRetry,
}: {
  payout: Payout;
  receipt: WithdrawalReceiptResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md rounded-[20px] bg-surface-container-lowest border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)]">
              <Receipt size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Biên nhận rút tiền</p>
              <p className="text-[11.5px] text-on-surface-variant">
                {formatCurrency(payout.amount, payout.currency)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-10 text-on-surface-variant">
              <Loader2 size={20} className="animate-spin text-primary" />
              <p className="text-[12.5px]">Đang tải biên nhận…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
                <XCircle size={18} className="text-[#ba1a1a]" />
              </div>
              <p className="text-[13px] text-on-surface-variant">{error}</p>
              <button
                onClick={onRetry}
                className="px-4 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {receipt && !loading && (
            <div className="space-y-4">
              {/* Receipt number */}
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-surface-container-low/50">
                <p className="text-[11.5px] text-on-surface-variant font-medium">Số biên nhận</p>
                <p className="text-[12px] font-mono font-semibold">{receipt.receiptNumber}</p>
              </div>

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-3">
                <ReceiptField label="Số tiền" value={formatCurrency(receipt.amount, receipt.currency)} mono />
                <ReceiptField label="Trạng thái" value={receipt.status} />
                <ReceiptField label="Ngày tạo" value={new Date(receipt.createdAt).toLocaleDateString("vi-VN")} />
                {receipt.paidAt && (
                  <ReceiptField label="Ngày thanh toán" value={new Date(receipt.paidAt).toLocaleDateString("vi-VN")} />
                )}
              </div>

              {/* Bank account */}
              <div className="flex items-center gap-3 p-3 rounded-[10px] border border-[var(--color-border-soft)]">
                <div className="w-9 h-9 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{receipt.bankName}</p>
                  <p className="text-[11.5px] text-on-surface-variant">
                    {receipt.maskedAccountNumber} · {receipt.accountHolderName}
                  </p>
                </div>
              </div>

              {/* PayOS reference */}
              {receipt.payOsReferenceId && (
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-on-surface-variant">Mã tham chiếu PayOS</span>
                  <span className="font-mono text-on-surface">{receipt.payOsReferenceId}</span>
                </div>
              )}

              {/* Note */}
              {receipt.note && (
                <p className="text-[11px] text-on-surface-variant/70 italic border-t border-[var(--color-border-soft)] pt-3">
                  {receipt.note}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 h-9 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">{label}</p>
      <p className={cn("text-[13px] font-bold mt-0.5 tabular-nums", mono ? "font-mono" : "")}>{value ?? "—"}</p>
    </div>
  );
}

// ============================================================================
// Misc
// ============================================================================

function Legend({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{
          background: dashed ? "transparent" : color,
          border: dashed ? `1.5px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

interface RevTooltipPayload {
  payload: { month: string; gross: number; net: number; sessions: number };
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RevTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(15,15,30,0.18)] min-w-[160px]">
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
        {d.month}
      </p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11.5px] text-on-surface-variant inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Gross
          </span>
          <span className="text-[13px] font-bold tabular-nums">
            {formatCurrency(d.gross)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11.5px] text-on-surface-variant inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
            Net
          </span>
          <span className="text-[13px] font-bold tabular-nums">
            {formatCurrency(d.net)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-[var(--color-border-soft)]">
          <span className="text-[11px] text-on-surface-variant">Sessions</span>
          <span className="text-[11.5px] font-semibold tabular-nums">
            {d.sessions}
          </span>
        </div>
      </div>
    </div>
  );
}
