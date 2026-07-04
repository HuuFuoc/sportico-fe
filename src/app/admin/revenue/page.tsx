"use client";

import { createContext, Fragment, useContext, useMemo, useRef, useState } from "react";
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
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  Eye,
  Filter,
  Flag,
  Globe,
  Hourglass,
  Info,
  Layers,
  Loader2,
  Pause,
  Play,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency } from "@/lib/utils";
import { showApiError } from "@/lib/toast";
import { api } from "@/lib/api";
import type { WithdrawalReceiptResponse } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, Payout } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// Synthetic financial data
// ============================================================================

const PLATFORM_FEE_PCT = 0.15;

type CashflowPoint = {
  month: string;
  revenue: number;
  payouts: number;
  fees: number;
  failedRate: number;
  anomaly: string | null;
};

// The backend exposes no admin-wide revenue/earnings endpoint — only the
// coach-scoped /api/coaches/me/wallet/transactions, which an admin token cannot
// read (it 403s). So this marketplace cashflow chart is illustrative: a
// deterministic 12-month series, not live data. The live, admin-accessible data
// on this page is the payout queue (pending withdrawals) below.
const CASHFLOW_MONTHS = [
  "T7", "T8", "T9", "T10", "T11", "T12",
  "T1", "T2", "T3", "T4", "T5", "T6",
];

function buildCashflow(): CashflowPoint[] {
  const base = 460_000;
  return CASHFLOW_MONTHS.map((month, i) => {
    const revenue = Math.round(base + i * 24_000 + Math.sin(i * 1.1) * 42_000);
    const payouts = Math.round(revenue * (1 - PLATFORM_FEE_PCT));
    const fees = revenue - payouts;
    // Plant 2 anomalies
    const anomaly = i === 6 ? "spike" : i === 9 ? "dip" : null;
    return {
      month,
      revenue,
      payouts,
      fees,
      failedRate: Number(
        (0.6 + Math.sin(i * 1.2) * 0.4 + (i === 10 ? 1.4 : 0)).toFixed(2),
      ),
      anomaly,
    };
  });
}

// Page-local coach lookup so the payout table can resolve names without each
// row fetching (provided by the page, consumed via useContext).
const CoachLookupContext = createContext<Map<string, Coach>>(new Map());
const PLATFORM_MARGIN = 15.0;
const PENDING_LIABILITY = 125_400;
const FAILED_RATE = 2.4;
const RESERVE_EXPOSURE = 87_200;

const RAILS = [
  { id: "ach", label: "ACH", volume: 412_000, success: 97.2, latencyHr: 36 },
  { id: "wire", label: "Wire", volume: 198_000, success: 99.4, latencyHr: 4 },
  { id: "card", label: "Chi trả thẻ", volume: 84_000, success: 95.1, latencyHr: 1 },
  { id: "intl", label: "SEPA quốc tế", volume: 62_000, success: 91.8, latencyHr: 48 },
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
  // NOTE: do NOT fetch coach-scoped earnings here — `/api/coaches/me/wallet/...`
  // 403s for an admin token and would error the whole page. Only the
  // admin-accessible payout queue + public coach directory are fetched live.
  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchPendingWithdrawals(),
        api.fetchCoaches(),
      ]),
    [],
  );
  const rawPayouts = useMemo(() => data?.[0] ?? [], [data]);
  const coachById = useMemo(
    () => new Map((data?.[1] ?? []).map((c) => [c.id, c])),
    [data],
  );
  const cashflow = useMemo(() => buildCashflow(), []);

  const reduce = useReducedMotion();
  const [range, setRange] = useState<Range>("30d");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState<
    "all" | "needs_action" | "failed" | "high_risk"
  >("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [receiptState, setReceiptState] = useState<{
    id: string;
    data: WithdrawalReceiptResponse | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setActionLoading(id);
    try {
      await fn();
      refetch();
    } catch (e) {
      showApiError(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = (id: string) =>
    runAction(id, () => api.approveWithdrawal(id));
  const handleReject = async (id: string, note: string) => {
    await runAction(id, () => api.rejectWithdrawal(id, note));
    setRejectTarget(null);
  };
  const handleMarkPaid = (id: string) =>
    runAction(id, () => api.markPaidWithdrawal(id));
  const handleRetry = (id: string) =>
    runAction(id, () => api.retryPayout(id));
  const handleRefreshStatus = (id: string) =>
    runAction(id, () => api.refreshPayoutStatus(id));

  const handleViewReceipt = async (id: string) => {
    setReceiptState({ id, data: null, loading: true, error: null });
    try {
      const d = await api.fetchAdminWithdrawalReceipt(id);
      setReceiptState({ id, data: d, loading: false, error: d ? null : "Biên nhận chưa khả dụng." });
    } catch {
      setReceiptState({ id, data: null, loading: false, error: "Không tải được biên nhận." });
    }
  };

  // Snapshot "now" outside useMemo so the computation is pure (no Date.now() inside).
  const [nowMs] = useState(() => Date.now());

  // Enrich payouts.
  // Mock mode: inject demo metadata (rail, country, fake risk score, ai flag).
  // Live mode: compute only real/derivable fields — no fake metadata on real money.
  const payouts = useMemo<EnrichedPayout[]>(
    () =>
      rawPayouts.map((p, i) => {
        const ageHours = p.date
          ? Math.max(0, Math.floor((nowMs - new Date(p.date).getTime()) / 3_600_000))
          : 0;
        const statusRisk = (p.status ?? "").toLowerCase() === "failed" ? 75
          : (p.status ?? "").toLowerCase() === "pending" ? 40
          : 10;
        if (isMockMode()) {
          return {
            ...p,
            rail: (["ACH", "Wire", "Card", "SEPA"] as PayoutRail[])[i % 4],
            country: COUNTRIES[i % COUNTRIES.length],
            riskScore: (p.status ?? "").toLowerCase() === "failed" ? 78 : (p.status ?? "").toLowerCase() === "pending" ? 42 : 18,
            aiFlag: (p.status ?? "").toLowerCase() === "failed" || i === 2,
            failureReason: (p.status ?? "").toLowerCase() === "failed" ? "Tài khoản đóng (R02)" : undefined,
            ageHours: (p.status ?? "").toLowerCase() === "pending" ? 28 + i * 2 : (p.status ?? "").toLowerCase() === "processing" ? 6 : 0,
          };
        }
        return {
          ...p,
          rail: "—" as PayoutRail,
          country: "—",
          riskScore: statusRisk,
          aiFlag: (p.status ?? "").toLowerCase() === "failed",
          failureReason: undefined,
          ageHours,
        };
      }),
    [rawPayouts, nowMs],
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
        const c = coachById.get(p.coachId);
        return (
          (c?.name ?? "").toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [payouts, tableFilter, search, coachById]);

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

  if (loading) {
    return (
      <AppShell role="admin" title="Doanh thu & Thanh toán">
        <LoadingState label="Đang tải dữ liệu doanh thu…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="admin" title="Doanh thu & Thanh toán">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  const last = cashflow[cashflow.length - 1];
  const prev = cashflow[cashflow.length - 2] ?? last;
  const GROSS_VOLUME = last.revenue;
  const NET_REVENUE = last.fees;

  return (
    <CoachLookupContext.Provider value={coachById}>
      <AppShell role="admin" title="Doanh thu & Thanh toán">
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
                Quản lý tài chính
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#1f7a4d]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Trực tiếp · đồng bộ 14 giây trước
              </span>
            </div>
            <h1 className="text-[26px] sm:text-[30px] leading-[1.1] font-bold tracking-tight">
              Doanh thu &amp; Thanh toán
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Dòng tiền, hiệu suất kênh thanh toán và vận hành chi trả.
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
            <ToolbarBtn icon={CalendarRange} label="Tùy chỉnh" />
            <ToolbarBtn icon={Globe} label="USD" caret />
            <ToolbarBtn icon={RefreshCw} ariaLabel="Refresh" />
            <ToolbarBtn icon={Settings2} ariaLabel="Settings" />
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-semibold transition-colors">
              <Download size={12} />
              Xuất
            </button>
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary text-[12px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.35)] hover:bg-[#3a2db5] transition-colors">
              <Play size={11} strokeWidth={2.5} />
              Chạy lô thanh toán
            </button>
          </div>
        </motion.header>

        {/* ============ KPI STRIP ============ */}
        {isMockMode() ? (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--color-border-soft)] rounded-[12px] border border-[var(--color-border-soft)] overflow-hidden">
            <Kpi
              label="Tổng khối lượng"
              value={formatCurrency(GROSS_VOLUME)}
              delta={`+${pctDelta(last.revenue, prev.revenue)}%`}
              deltaDir="up"
              compare="so tháng trước"
              spark={seedSpark(1, 600000, 80000)}
              tone="neutral"
              insight="Đang cao hơn mức trung bình 90 ngày."
            />
            <Kpi
              label="Doanh thu ròng"
              value={formatCurrency(NET_REVENUE)}
              delta={`+${pctDelta(last.fees, prev.fees)}%`}
              deltaDir="up"
              compare="so tháng trước"
              spark={seedSpark(2, 90000, 12000)}
              tone="good"
            />
            <Kpi
              label="Biên lợi nhuận"
              value={`${PLATFORM_MARGIN.toFixed(1)}%`}
              delta="−0.4 bps"
              deltaDir="down"
              compare="nén QoQ"
              spark={seedSparkVar(3, 15.2, 0.4)}
              tone="warn"
              insight="Nén nhẹ — kiểm tra chi phí kênh ACH."
            />
            <Kpi
              label="Nợ đang chờ"
              value={formatCurrency(PENDING_LIABILITY)}
              delta="14 tx"
              deltaDir="neutral"
              compare="đang xử lý"
              spark={seedSpark(4, 120000, 18000)}
              tone="neutral"
            />
            <Kpi
              label="Tỷ lệ thất bại"
              value={`${FAILED_RATE.toFixed(2)}%`}
              delta="+18%"
              deltaDir="up"
              compare="so TB 7 ngày"
              spark={seedSparkVar(5, 1.6, 0.6)}
              tone="danger"
              insight="Tăng đột biến kênh ACH — cần điều tra"
              anomaly
            />
            <Kpi
              label="Rủi ro dự trữ"
              value={formatCurrency(RESERVE_EXPOSURE)}
              delta="0.9x"
              deltaDir="neutral"
              compare="tỷ lệ bảo phủ"
              spark={seedSpark(6, 85000, 6000)}
              tone="good"
            />
          </section>
        ) : (
          <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-4 flex items-center gap-3 text-[12.5px] text-on-surface-variant">
            <Info size={16} className="text-on-surface-variant/50 shrink-0" />
            <span>
              <span className="font-semibold text-on-surface">Phân tích tài chính tổng hợp</span>{" "}
              chưa khả dụng — endpoint admin-level revenue đang trong lộ trình phát triển.
              Dữ liệu thanh toán thực bên dưới được lấy từ API payout queue.
            </span>
          </div>
        )}

        {/* ============ MAIN 2-COLUMN ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          {/* ============ LEFT ============ */}
          <div className="space-y-4 min-w-0">
            {/* Cashflow chart */}
            {isMockMode() ? (
              <CashflowChart data={cashflow} reduce={reduce ?? false} />
            ) : null}

            {/* Rail performance + Settlement — demo data, only shown in mock mode */}
            {isMockMode() && (
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                <RailPerformance reduce={reduce ?? false} />
                <SettlementTimeline reduce={reduce ?? false} />
              </div>
            )}

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
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onReject={(id) => setRejectTarget(id)}
              onMarkPaid={handleMarkPaid}
              onRetry={handleRetry}
              onRefreshStatus={handleRefreshStatus}
              onViewReceipt={handleViewReceipt}
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

      {/* Reject reason modal */}
      {rejectTarget && (
        <RejectReasonModal
          onConfirm={(note) => void handleReject(rejectTarget, note)}
          onClose={() => setRejectTarget(null)}
          loading={actionLoading === rejectTarget}
        />
      )}

      {/* Receipt modal */}
      {receiptState && (
        <AdminReceiptModal
          receipt={receiptState.data}
          loading={receiptState.loading}
          error={receiptState.error}
          onClose={() => setReceiptState(null)}
          onRetry={() => void handleViewReceipt(receiptState.id)}
        />
      )}
      </AppShell>
    </CoachLookupContext.Provider>
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
          Bất thường
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
  data: CashflowPoint[];
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
              Luồng tiền
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#ffdad6] text-[10px] font-bold text-[#ba1a1a]">
              <AlertTriangle size={9} />2 bất thường
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Doanh thu · Thanh toán ròng · Tỷ lệ thất bại %
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <LegendDot color="#4f46e5" label="Doanh thu" filled />
          <LegendDot color="#94a3b8" label="Thanh toán" filled />
          <LegendDot color="#ef4444" label="Thất bại %" line />
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
                  value: "Ngưỡng 2.0%",
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
          label="Doanh thu"
          value={formatCurrency(d.revenue)}
        />
        <Row
          color="#94a3b8"
          label="Thanh toán"
          value={formatCurrency(d.payouts)}
        />
        <Row
          color="#10b981"
          label="Phí ròng"
          value={formatCurrency(d.fees)}
        />
        <div className="pt-1 mt-1 border-t border-[var(--color-border-soft)]">
          <Row
            color="#ef4444"
            label="Tỷ lệ thất bại"
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
            Hiệu suất kênh thanh toán
          </h3>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Khối lượng · tỷ lệ thành công · độ trễ quyết toán
          </p>
        </div>
        <button className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5">
          Chi tiết
          <ChevronRight size={11} />
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[560px]">
        <thead className="bg-surface-container-low/30 border-b border-[var(--color-border-soft)] text-[10px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="px-4 py-2 font-semibold">Kênh</th>
            <th className="px-3 py-2 font-semibold text-right">Khối lượng</th>
            <th className="px-3 py-2 font-semibold text-right">Thành công</th>
            <th className="px-3 py-2 font-semibold text-right">Quyết toán</th>
            <th className="px-4 py-2 font-semibold">Trạng thái</th>
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
                      ? "Ổn định"
                      : warn
                        ? "Giảm hiệu năng"
                        : "Sự cố"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
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
      label: "Đã thanh toán lô #20460",
      meta: "ACH · 42 khoản · $84,200",
      time: "2 giờ trước",
      tone: "good" as const,
      icon: ArrowUpRight,
    },
    {
      id: 2,
      label: "Đã đối soát Wire",
      meta: "12 khoản · $42,500",
      time: "5 giờ trước",
      tone: "good" as const,
      icon: ArrowUpRight,
    },
    {
      id: 3,
      label: "Lô thanh toán thất bại",
      meta: "ACH R02 · 3 khoản",
      time: "9 giờ trước",
      tone: "danger" as const,
      icon: XCircle,
    },
    {
      id: 4,
      label: "Nạp lại quỹ dự trữ",
      meta: "Treasury sweep · $200K",
      time: "1 ngày trước",
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
          Hoạt động thanh toán
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
    label: "Đã trả",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
  },
  pending: {
    label: "Đang chờ",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
  },
  approved: {
    label: "Đã duyệt",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  processing: {
    label: "Đang xử lý",
    pill: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  failed: {
    label: "Thất bại",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
  },
  rejected: {
    label: "Đã từ chối",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
  },
  cancelled: {
    label: "Đã hủy",
    pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
    dot: "bg-on-surface-variant/40",
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
  actionLoading,
  onApprove,
  onReject,
  onMarkPaid,
  onRetry,
  onRefreshStatus,
  onViewReceipt,
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
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onRetry: (id: string) => void;
  onRefreshStatus: (id: string) => void;
  onViewReceipt: (id: string) => void;
  reduce: boolean;
}) {
  const coachById = useContext(CoachLookupContext);
  const FILTERS: { id: typeof filter; label: string; count?: number }[] = [
    { id: "all", label: "Tất cả", count: payouts.length },
    {
      id: "needs_action",
      label: "Cần xử lý",
      count: payouts.filter(
        (p) => p.status === "failed" || p.status === "pending",
      ).length,
    },
    {
      id: "failed",
      label: "Thất bại",
      count: payouts.filter((p) => p.status === "failed").length,
    },
    {
      id: "high_risk",
      label: "Rủi ro cao",
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
            Hàng đợi thanh toán
          </h3>
          <span className="text-[10.5px] text-on-surface-variant">
            {payouts.length} mục
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
              placeholder="Tìm id, phương thức, HLV…"
              className="h-7 pl-7 pr-2.5 w-44 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/8 rounded-md outline-none text-[11.5px] placeholder:text-on-surface-variant transition-all"
            />
          </div>

          <button className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[11px] font-semibold transition-colors">
            <Filter size={11} />
            Thêm
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
                  aria-label="Chọn tất cả"
                />
              </th>
              <th className="px-2 py-2 font-bold">HLV</th>
              <th className="px-2 py-2 font-bold">Mã tham chiếu</th>
              <th className="px-2 py-2 font-bold">Kênh</th>
              <th className="px-2 py-2 font-bold">Quốc gia</th>
              <th className="px-2 py-2 font-bold text-right">Số tiền</th>
              <th className="px-2 py-2 font-bold">Rủi ro</th>
              <th className="px-2 py-2 font-bold">Thời gian</th>
              <th className="px-2 py-2 font-bold">Trạng thái</th>
              <th className="pr-4 pl-2 py-2 font-bold text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center">
                  <p className="text-[12px] text-on-surface-variant">
                    Không có khoản nào khớp bộ lọc hiện tại.
                  </p>
                </td>
              </tr>
            )}
            {payouts.map((p, i) => {
              const coach = coachById.get(p.coachId);
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
                                title="AI gắn cờ"
                              >
                                <Sparkles size={10} />
                              </span>
                            )}
                          </p>
                          <p className="text-[10.5px] text-on-surface-variant truncate">
                            {new Date(p.date).toLocaleDateString("vi-VN", {
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
                      {actionLoading === p.id ? (
                        <span className="inline-flex items-center justify-center w-7 h-7">
                          <Loader2 size={12} className="animate-spin text-primary" />
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {p.status === "pending" && (
                            <>
                              <RowAction icon={CheckCircle2} label="Duyệt" onClick={() => onApprove(p.id)} />
                              <RowAction icon={XCircle} label="Từ chối" onClick={() => onReject(p.id)} />
                            </>
                          )}
                          {p.status === "processing" && (
                            <>
                              <RowAction icon={Play} label="Đánh dấu đã trả" onClick={() => onMarkPaid(p.id)} />
                              <RowAction icon={RefreshCw} label="Thử lại" onClick={() => onRetry(p.id)} />
                              <RowAction icon={Activity} label="Làm mới trạng thái" onClick={() => onRefreshStatus(p.id)} />
                            </>
                          )}
                          {p.status === "failed" && (
                            <RowAction icon={RefreshCw} label="Thử lại" onClick={() => onRetry(p.id)} />
                          )}
                          {p.status === "paid" && (
                            <RowAction icon={Receipt} label="Biên nhận" onClick={() => onViewReceipt(p.id)} />
                          )}
                          <RowAction icon={Eye} label="Xem" />
                          <RowAction icon={EllipsisVertical} label="Thêm" />
                        </div>
                      )}
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
                              label="Doanh thu gộp"
                              value={formatCurrency(
                                Math.round(p.amount / 0.85),
                                p.currency,
                              )}
                            />
                            <Detail
                              label="Phí nền tảng"
                              value={`−${formatCurrency(Math.round((p.amount / 0.85) * 0.15), p.currency)}`}
                            />
                            <Detail
                              label="Ròng"
                              value={formatCurrency(p.amount, p.currency)}
                              highlight
                            />
                            <Detail label="Phương thức" value={p.method} />
                            <Detail
                              label="Thời hạn quyết toán"
                              value={
                                p.status === "paid"
                                  ? "Hoàn thành"
                                  : p.rail === "Wire"
                                    ? "Trong ngày"
                                    : "1–3 ngày làm việc"
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
                                  Lỗi: {p.failureReason}
                                </p>
                                <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                                  Đề xuất: liên hệ HLV để xác minh tài khoản
                                  ngân hàng, sau đó thử lại.
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                            {p.status === "pending" && (
                              <>
                                <ExpandedAction icon={CheckCircle2} label="Duyệt" primary onClick={() => onApprove(p.id)} />
                                <ExpandedAction icon={XCircle} label="Từ chối" danger onClick={() => onReject(p.id)} />
                              </>
                            )}
                            {p.status === "processing" && (
                              <>
                                <ExpandedAction icon={Play} label="Đánh dấu đã trả" primary onClick={() => onMarkPaid(p.id)} />
                                <ExpandedAction icon={RefreshCw} label="Thử lại PayOS" onClick={() => onRetry(p.id)} />
                                <ExpandedAction icon={Activity} label="Làm mới trạng thái" onClick={() => onRefreshStatus(p.id)} />
                              </>
                            )}
                            {p.status === "failed" && (
                              <ExpandedAction icon={RefreshCw} label="Thử lại" primary onClick={() => onRetry(p.id)} />
                            )}
                            {p.status === "paid" && (
                              <ExpandedAction icon={Receipt} label="Xem biên nhận" onClick={() => onViewReceipt(p.id)} />
                            )}
                            <ExpandedAction icon={Eye} label="Xem đầy đủ" />
                            <ExpandedAction icon={Copy} label="Sao chép ID" />
                            <ExpandedAction icon={Flag} label="Leo thang" danger />
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
          Hiển thị{" "}
          <span className="text-on-surface font-bold tabular-nums">
            {payouts.length}
          </span>{" "}
          trong {payouts.length} khoản
        </span>
        <div className="inline-flex items-center gap-2">
          <span>
            Tổng khối lượng:{" "}
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
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
  onClick,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
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
      title: "Thanh toán thất bại +18%",
      body: "Kênh ACH tăng đột biến so với trung bình 7 ngày. Nguyên nhân: mã R02 ngân hàng.",
      cta: "Điều tra",
    },
    {
      severity: "med" as const,
      icon: Hourglass,
      title: "ACH xử lý chậm",
      body: "Độ trễ quyết toán 41h (TB 36h). 12 khoản bị ảnh hưởng.",
      cta: "Xem lô",
    },
    {
      severity: "med" as const,
      icon: ShieldAlert,
      title: "3 khoản cần xem xét thủ công",
      body: "AI phát hiện tài khoản đích không nhất quán.",
      cta: "Mở hàng đợi",
    },
    {
      severity: "info" as const,
      icon: TrendingDown,
      title: "Biên lợi nhuận bị nén",
      body: "Biên nền tảng giảm 0.4 bps QoQ — xem lại cơ cấu chi phí kênh.",
      cta: "Phân tích",
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
              AI Phát hiện bất thường
            </h3>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {alerts.length} cảnh báo · quét lần cuối 2 phút trước
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ffdad6] text-[10px] font-bold text-[#ba1a1a]">
          {alerts.filter((a) => a.severity === "high").length} cao
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
                  label: "CAO",
                }
              : a.severity === "med"
                ? {
                    bg: "bg-[#fff5d6]/40",
                    iconBg: "bg-[#f59e0b]",
                    text: "text-[#b95000]",
                    pill: "bg-[#f59e0b]/15 text-[#b95000]",
                    label: "VỪA",
                  }
                : {
                    bg: "bg-primary/[0.04]",
                    iconBg: "bg-primary",
                    text: "text-primary",
                    pill: "bg-primary/10 text-primary",
                    label: "TIN",
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
    { d: "T2", v: 84000 },
    { d: "T3", v: 96000 },
    { d: "T4", v: 102000 },
    { d: "T5", v: 88000 },
    { d: "T6", v: 112000 },
    { d: "T7", v: 68000 },
    { d: "CN", v: 54000 },
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
          Dự báo luồng tiền 7 ngày
        </h3>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Khối lượng thanh toán dự kiến · AI dự báo
        </p>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[20px] font-bold tabular-nums leading-none">
            {formatCurrency(total)}
          </span>
          <span className="text-[10.5px] text-on-surface-variant">
            dự kiến
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
      label: "Tỷ lệ bảo phủ dự trữ 0.9x",
      hint: "Dưới mục tiêu 1.0x",
      tone: "warn" as const,
    },
    {
      icon: Clock,
      label: "Wire đóng cửa sau 1h 12m",
      hint: "21 khoản trong hàng đợi",
      tone: "info" as const,
    },
    {
      icon: AlertTriangle,
      label: "1 đối soát đang chờ",
      hint: "Lô #20458 · $42K",
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
          Cảnh báo vận hành
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
            {count} khoản được chọn ·{" "}
            <span className="text-white/60 font-normal">
              Thao tác áp dụng cho tất cả
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BulkBtn icon={Play} label="Duyệt lô" tone="success" />
          <BulkBtn icon={RefreshCw} label="Thử lại" />
          <BulkBtn icon={Pause} label="Giữ" />
          <BulkBtn icon={ShieldAlert} label="Điều tra" />
          <BulkBtn icon={Download} label="Xuất" />
          <button
            onClick={onClear}
            aria-label="Xóa"
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
// Reject reason modal
// ============================================================================

function RejectReasonModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (note: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-[16px] bg-surface-container-lowest border border-[var(--color-border-soft)] shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#ffdad6] flex items-center justify-center">
              <XCircle size={14} className="text-[#ba1a1a]" />
            </div>
            <p className="text-[14.5px] font-semibold">Từ chối yêu cầu rút tiền</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-[12.5px] text-on-surface-variant">Nhập lý do để thông báo cho HLV.</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Thông tin tài khoản không hợp lệ..."
            rows={3}
            className="w-full px-3 py-2.5 bg-surface-container-low border border-[var(--color-border-soft)] focus:border-primary/40 focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[12.5px] resize-none transition-all"
          />
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => onConfirm(note.trim())}
              disabled={loading || !note.trim()}
              className="flex-1 h-9 rounded-lg bg-[#ba1a1a] text-white text-[12.5px] font-semibold hover:bg-[#9b1515] disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Từ chối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Admin receipt modal
// ============================================================================

function AdminReceiptModal({
  receipt,
  loading,
  error,
  onClose,
  onRetry,
}: {
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
      <div className="w-full max-w-md rounded-[16px] bg-surface-container-lowest border border-[var(--color-border-soft)] shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center">
              <Receipt size={14} className="text-white" />
            </div>
            <p className="text-[14.5px] font-semibold">Biên nhận thanh toán</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
              <Loader2 size={18} className="animate-spin text-primary" />
              <p className="text-[12.5px]">Đang tải biên nhận…</p>
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-9 h-9 rounded-full bg-[#ffdad6] flex items-center justify-center">
                <XCircle size={16} className="text-[#ba1a1a]" />
              </div>
              <p className="text-[12.5px] text-on-surface-variant">{error}</p>
              <button onClick={onRetry} className="px-4 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors">
                Thử lại
              </button>
            </div>
          )}
          {receipt && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-surface-container-low/50">
                <p className="text-[11px] text-on-surface-variant font-medium">Số biên nhận</p>
                <p className="text-[11.5px] font-mono font-semibold">{receipt.receiptNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">HLV</p>
                  <p className="text-[12.5px] font-semibold mt-0.5 truncate">{receipt.coachName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Số tiền</p>
                  <p className="text-[12.5px] font-bold tabular-nums mt-0.5">{formatCurrency(receipt.amount, receipt.currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Trạng thái</p>
                  <p className="text-[12.5px] font-semibold mt-0.5">{receipt.status}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Ngày tạo</p>
                  <p className="text-[12.5px] font-semibold mt-0.5">{new Date(receipt.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-[10px] border border-[var(--color-border-soft)]">
                <div className="w-8 h-8 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold truncate">{receipt.bankName}</p>
                  <p className="text-[11px] text-on-surface-variant">{receipt.maskedAccountNumber} · {receipt.accountHolderName}</p>
                </div>
              </div>
              {receipt.payOsReferenceId && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-on-surface-variant">Mã PayOS</span>
                  <span className="font-mono">{receipt.payOsReferenceId}</span>
                </div>
              )}
              {receipt.adminNote && (
                <p className="text-[11px] text-on-surface-variant italic border-t border-[var(--color-border-soft)] pt-3">{receipt.adminNote}</p>
              )}
            </div>
          )}
        </div>
        <div className="px-5 pb-4 flex justify-end">
          <button onClick={onClose} className="px-5 h-8 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function pctDelta(a: number, b: number) {
  return (((a - b) / b) * 100).toFixed(1);
}
