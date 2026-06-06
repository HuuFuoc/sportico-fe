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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Hourglass,
  Info,
  Loader2,
  Receipt,
  Search,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { WithdrawModal } from "@/components/coach/WithdrawModal";
import { cn, formatCurrencyVnd, formatCurrencyVndCompact } from "@/lib/utils";
import { api } from "@/lib/api";
import type { WithdrawalReceiptResponse, EarningsTotal } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { EarningPoint, Payout, PayoutAccount } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;
const RANGE_OPTIONS = ["3T", "6T", "1N", "Tất cả"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

// ---- Helpers ----------------------------------------------------------------

function maskAccountNumber(num: string | undefined): string {
  if (!num) return "—";
  if (num.length <= 4) return num;
  return `••••${num.slice(-4)}`;
}

function isAccountVerified(account: PayoutAccount | null): boolean {
  if (!account) return false;
  const s = (account.status ?? "").toLowerCase();
  return s === "verified" || s === "approved";
}

function getWithdrawBlockReason(
  earningsTotal: EarningsTotal | undefined,
  payoutAccount: PayoutAccount | null,
): string | null {
  if (!earningsTotal || earningsTotal.availableBalance <= 0)
    return "Bạn chưa có số dư có thể rút.";
  if (!payoutAccount?.bankAccountNumber)
    return "Bạn chưa thiết lập tài khoản nhận tiền.";
  if (!isAccountVerified(payoutAccount))
    return "Tài khoản nhận tiền chưa được xác minh.";
  return null;
}

// ---- Status metadata --------------------------------------------------------

const STATUS_META: Record<
  Payout["status"],
  { label: string; pill: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Đã nhận tiền",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    icon: CheckCircle2,
  },
  pending: {
    label: "Đang chờ admin duyệt",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    icon: Clock,
  },
  approved: {
    label: "Đã duyệt — chờ chuyển khoản",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Hourglass,
  },
  processing: {
    label: "Đang chuyển khoản",
    pill: "bg-primary/10 text-primary border-primary/20",
    icon: Hourglass,
  },
  failed: {
    label: "Chuyển khoản thất bại",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    icon: XCircle,
  },
  rejected: {
    label: "Bị từ chối",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    icon: XCircle,
  },
  cancelled: {
    label: "Đã hủy",
    pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
    icon: XCircle,
  },
};

const STATUS_FILTER_LABELS: Record<Payout["status"] | "all", string> = {
  all: "Tất cả",
  paid: "Đã nhận tiền",
  pending: "Chờ duyệt",
  processing: "Đang chuyển",
  approved: "Đã duyệt",
  failed: "Thất bại",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};

// ============================================================================
// Page
// ============================================================================

export default function CoachEarningsPage() {
  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchEarnings(),
        api.fetchPayouts(),
        api.fetchEarningsTotal(),
        api.fetchPayoutAccount(),
      ]),
    [],
  );
  const earnings = useMemo(() => data?.[0] ?? [], [data]);
  const payouts = useMemo(() => data?.[1] ?? [], [data]);
  const earningsTotal = data?.[2];
  const payoutAccount = data?.[3] ?? null;

  const reduce = useReducedMotion();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [range, setRange] = useState<Range>("1N");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Payout["status"] | "all">(
    "all",
  );
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const rangedEarnings = useMemo(() => {
    const len = earnings.length;
    if (range === "3T") return earnings.slice(-3);
    if (range === "6T") return earnings.slice(-6);
    if (range === "1N") return earnings.slice(-12);
    return earnings.slice(-len);
  }, [range, earnings]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.method.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
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

  const withdrawBlockReason = getWithdrawBlockReason(earningsTotal, payoutAccount);
  const canWithdraw = withdrawBlockReason === null;

  return (
    <AppShell role="coach" title="Thu nhập">
      <div className="max-w-[1340px] mx-auto space-y-6">
        {/* ============ PAGE HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
        >
          <h1 className="text-[28px] sm:text-[32px] leading-[1.1] font-bold tracking-tight">
            Thu nhập của tôi
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Quản lý ví, lịch sử rút tiền và tài khoản ngân hàng.
          </p>
        </motion.header>

        {/* ============ WALLET HERO ============ */}
        <WalletHero
          earningsTotal={earningsTotal}
          canWithdraw={canWithdraw}
          withdrawBlockReason={withdrawBlockReason}
          onWithdraw={() => setWithdrawOpen(true)}
          reduce={reduce ?? false}
        />

        {/* ============ KPI ROW ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Banknote}
            label="Tổng thu nhập đã ghi nhận"
            value={
              earningsTotal
                ? formatCurrencyVnd(earningsTotal.totalEarned)
                : "—"
            }
            accent="emerald"
            delay={0.05}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Wallet}
            label="Số dư có thể rút"
            value={
              earningsTotal
                ? formatCurrencyVnd(earningsTotal.availableBalance)
                : "—"
            }
            accent="indigo"
            delay={0.1}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Hourglass}
            label="Đang xử lý"
            value={
              earningsTotal
                ? formatCurrencyVnd(earningsTotal.pendingBalance)
                : "—"
            }
            accent="amber"
            delay={0.15}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={ArrowDownToLine}
            label="Đã rút về ngân hàng"
            value={
              earningsTotal
                ? formatCurrencyVnd(earningsTotal.totalWithdrawn)
                : "—"
            }
            accent="violet"
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ MONTHLY CHART + SESSIONS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <EarningsChartCard
            earnings={rangedEarnings}
            allEarnings={earnings}
            range={range}
            setRange={setRange}
            hoveredMonth={hoveredMonth}
            setHoveredMonth={setHoveredMonth}
            reduce={reduce ?? false}
          />
          <SessionsCard data={rangedEarnings} reduce={reduce ?? false} />
        </div>

        {/* ============ WALLET DISTRIBUTION + PAYOUT ACCOUNT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WalletDistributionCard
            earningsTotal={earningsTotal}
            onWithdraw={canWithdraw ? () => setWithdrawOpen(true) : undefined}
            reduce={reduce ?? false}
          />
          <PayoutAccountCard
            payoutAccount={payoutAccount}
            onUpdate={() => setWithdrawOpen(true)}
            reduce={reduce ?? false}
          />
        </div>

        {/* ============ PAYOUT TABLE ============ */}
        <PayoutTable
          payouts={filteredPayouts}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onWithdraw={canWithdraw ? () => setWithdrawOpen(true) : undefined}
          reduce={reduce ?? false}
        />
      </div>

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        available={earningsTotal?.availableBalance ?? 0}
        onSuccess={refetch}
      />
    </AppShell>
  );
}

// ============================================================================
// Wallet Hero
// ============================================================================

function WalletHero({
  earningsTotal,
  canWithdraw,
  withdrawBlockReason,
  onWithdraw,
  reduce,
}: {
  earningsTotal: EarningsTotal | undefined;
  canWithdraw: boolean;
  withdrawBlockReason: string | null;
  onWithdraw: () => void;
  reduce: boolean;
}) {
  const isConsistent =
    earningsTotal !== undefined &&
    Math.abs(
      earningsTotal.totalEarned -
        (earningsTotal.availableBalance +
          earningsTotal.pendingBalance +
          earningsTotal.totalWithdrawn),
    ) < 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.55, delay: 0.05, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_16px_36px_-18px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-3">
            Ví thu nhập
          </p>

          {/* Primary: availableBalance */}
          <div>
            <p className="text-[13px] text-on-surface-variant mb-1">
              Số dư có thể rút
            </p>
            <span className="text-[44px] sm:text-[56px] leading-[1] font-bold tracking-tight tabular-nums bg-gradient-to-br from-on-surface via-on-surface to-primary bg-clip-text text-transparent">
              {earningsTotal
                ? formatCurrencyVnd(earningsTotal.availableBalance)
                : "—"}
            </span>
          </div>

          {/* Secondaries */}
          {earningsTotal && (
            <div className="mt-4 flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Tổng thu nhập đã ghi nhận
                </p>
                <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                  {formatCurrencyVnd(earningsTotal.totalEarned)}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Đang xử lý
                </p>
                <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                  {formatCurrencyVnd(earningsTotal.pendingBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Đã rút về ngân hàng
                </p>
                <p className="text-[15px] font-semibold tabular-nums mt-0.5">
                  {formatCurrencyVnd(earningsTotal.totalWithdrawn)}
                </p>
              </div>
            </div>
          )}

          {/* Formula helper text — conditional on consistency */}
          <p className="text-[12px] text-on-surface-variant mt-3 max-w-xl leading-relaxed">
            {isConsistent
              ? "Số dư có thể rút = Tổng thu nhập đã ghi nhận − Đã rút − Đang xử lý."
              : "Số dư có thể rút được tính từ dữ liệu ví hiện tại sau khi hệ thống trừ các khoản đã rút, đang xử lý hoặc đang đối soát."}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            {canWithdraw ? (
              <button
                onClick={onWithdraw}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <ArrowDownToLine size={15} strokeWidth={2.5} />
                Rút tiền
              </button>
            ) : (
              <>
                <button
                  disabled
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-surface-container-low text-on-surface-variant text-[14px] font-semibold cursor-not-allowed opacity-60"
                >
                  <ArrowDownToLine size={15} strokeWidth={2.5} />
                  Rút tiền
                </button>
                {withdrawBlockReason && (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">
                    <AlertCircle size={13} className="shrink-0 text-[#f59e0b]" />
                    {withdrawBlockReason}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// KPI Card (no sparklines)
// ============================================================================

const KPI_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    decor: "from-primary/15 to-primary/0",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    decor: "from-[#c084fc]/15 to-[#c084fc]/0",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
  },
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  delay,
  reduce,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  accent: keyof typeof KPI_ACCENTS;
  delay: number;
  reduce: boolean;
}) {
  const a = KPI_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60",
          a.decor,
        )}
      />
      <div className="relative">
        <div
          className={cn(
            "w-10 h-10 rounded-[12px] flex items-center justify-center text-white mb-3",
            a.iconBg,
            a.glow,
          )}
        >
          <Icon size={17} strokeWidth={2.25} />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant leading-tight">
          {label}
        </p>
        <p className="text-[18px] sm:text-[20px] leading-none font-bold tracking-tight tabular-nums mt-1.5">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Monthly Earnings Chart
// ============================================================================

function EarningsChartCard({
  earnings,
  allEarnings,
  range,
  setRange,
  hoveredMonth,
  setHoveredMonth,
  reduce,
}: {
  earnings: EarningPoint[];
  allEarnings: EarningPoint[];
  range: Range;
  setRange: (r: Range) => void;
  hoveredMonth: string | null;
  setHoveredMonth: (m: string | null) => void;
  reduce: boolean;
}) {
  const last = earnings[earnings.length - 1];

  if (allEarnings.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
        className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)] flex flex-col items-center justify-center min-h-[300px] text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-3">
          <Banknote size={20} className="text-on-surface-variant" />
        </div>
        <p className="text-[14px] font-medium">
          Chưa đủ dữ liệu để hiển thị xu hướng thu nhập.
        </p>
        <p className="text-[12px] text-on-surface-variant mt-1 max-w-xs">
          Thu nhập sẽ xuất hiện sau khi các buổi tập được ghi nhận vào ví.
        </p>
      </motion.section>
    );
  }

  const displayValue =
    hoveredMonth
      ? (earnings.find((e) => e.month === hoveredMonth)?.gross ?? last?.gross ?? 0)
      : (last?.gross ?? 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight">
            Thu nhập ghi nhận theo tháng
          </h3>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Theo dõi các khoản thu nhập đã được ghi nhận vào ví coach.
          </p>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-[28px] leading-none font-bold tracking-tight tabular-nums">
              {formatCurrencyVnd(displayValue)}
            </span>
            <span className="text-[13px] text-on-surface-variant">
              {hoveredMonth ?? last?.month ?? ""}
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

      <div className="h-[260px] -mx-2">
        <ClientOnly
          fallback={
            <div className="h-full w-full bg-surface-container-low rounded-xl animate-pulse" />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={earnings}
              margin={{ left: -4, right: 8, top: 12, bottom: 0 }}
              onMouseMove={(state: unknown) => {
                const s = state as
                  | { activePayload?: { payload?: { month?: string } }[] }
                  | undefined;
                const m = s?.activePayload?.[0]?.payload?.month;
                if (m) setHoveredMonth(m);
              }}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              <defs>
                <linearGradient id="earnGrossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#4f46e5" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="earnStrokeGrad" x1="0" y1="0" x2="1" y2="0">
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
                tickFormatter={formatCurrencyVndCompact}
                width={52}
              />
              <Tooltip
                content={<EarningsTooltip />}
                cursor={{
                  stroke: "#4f46e5",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="gross"
                stroke="url(#earnStrokeGrad)"
                strokeWidth={2.5}
                fill="url(#earnGrossGrad)"
                activeDot={{
                  r: 6,
                  fill: "#fff",
                  stroke: "#4f46e5",
                  strokeWidth: 2.5,
                }}
                animationDuration={reduce ? 0 : 1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant mt-3 pt-3 border-t border-[var(--color-border-soft)]">
        <span className="inline-block w-3 h-3 rounded-full bg-primary" />
        Thu nhập ghi nhận (VND)
      </div>
    </motion.section>
  );
}

// ---- Earnings chart tooltip --------------------------------------------------

interface EarnTooltipPayload {
  payload: { month: string; gross: number; sessions: number };
}

function EarningsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: EarnTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(15,15,30,0.18)] min-w-[190px]">
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
        {d.month}
      </p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11.5px] text-on-surface-variant inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Thu nhập
          </span>
          <span className="text-[13px] font-bold tabular-nums">
            {formatCurrencyVnd(d.gross)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-[var(--color-border-soft)]">
          <span className="text-[11px] text-on-surface-variant">
            Số giao dịch
          </span>
          <span className="text-[11.5px] font-semibold tabular-nums">
            {d.sessions}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sessions bar chart
// ============================================================================

function SessionsCard({
  data,
  reduce,
}: {
  data: EarningPoint[];
  reduce: boolean;
}) {
  const max = data.length > 0 ? Math.max(...data.map((d) => d.sessions)) : 0;
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
            Khối lượng buổi tập
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Số buổi theo tháng
          </p>
          <p className="text-[26px] font-bold tracking-tight tabular-nums mt-3 leading-none">
            {total}
            <span className="text-[13px] font-medium text-on-surface-variant ml-2">
              tổng trong khoảng
            </span>
          </p>
        </div>
        {max > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-medium text-[#1f7a4d]">
            Cao nhất: {max}
          </span>
        )}
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
                width={28}
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
                        {p.sessions} buổi
                      </p>
                      <p className="text-[11.5px] text-on-surface-variant tabular-nums mt-0.5">
                        {formatCurrencyVnd(p.gross)}
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
                      d.sessions === max && max > 0
                        ? "#4f46e5"
                        : "url(#sessBarGrad)"
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
// Wallet Distribution Card
// ============================================================================

const DIST_SEGMENTS = [
  {
    key: "availableBalance" as const,
    label: "Có thể rút",
    color: "#4f46e5",
  },
  {
    key: "pendingBalance" as const,
    label: "Đang xử lý",
    color: "#f59e0b",
  },
  {
    key: "totalWithdrawn" as const,
    label: "Đã rút",
    color: "#8b5cf6",
  },
] as const;

function WalletDistributionCard({
  earningsTotal,
  onWithdraw,
  reduce,
}: {
  earningsTotal: EarningsTotal | undefined;
  onWithdraw?: () => void;
  reduce: boolean;
}) {
  if (!earningsTotal) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, delay: 0.35, ease: EASE }}
        className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)] flex items-center justify-center min-h-[220px]"
      >
        <p className="text-[13px] text-on-surface-variant">
          Đang tải dữ liệu ví…
        </p>
      </motion.section>
    );
  }

  const { totalEarned, availableBalance, pendingBalance, totalWithdrawn } =
    earningsTotal;
  const sum = availableBalance + pendingBalance + totalWithdrawn;
  const isConsistent = Math.abs(totalEarned - sum) < 1;

  const donutData = DIST_SEGMENTS.map((s) => ({
    ...s,
    value: earningsTotal[s.key],
  }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.35, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[17px] font-semibold tracking-tight">
        Tổng quan dòng tiền coach
      </h3>
      <p className="text-[12.5px] text-on-surface-variant mt-0.5">
        Tổng thu nhập đã ghi nhận:{" "}
        <span className="font-semibold tabular-nums text-on-surface">
          {formatCurrencyVnd(totalEarned)}
        </span>
      </p>

      {/* Donut (only when values are consistent) */}
      {isConsistent ? (
        <div className="flex items-center gap-5 mt-4">
          <div className="relative w-[140px] h-[140px] shrink-0">
            <ClientOnly fallback={<div className="w-full h-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
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
                    {donutData.map((seg, i) => (
                      <Cell key={i} fill={seg.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ClientOnly>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[9px] uppercase tracking-wider font-medium text-on-surface-variant">
                Tổng
              </p>
              <p className="text-[11px] font-bold tabular-nums leading-tight">
                {formatCurrencyVndCompact(totalEarned)}
              </p>
            </div>
          </div>
          <ul className="flex-1 space-y-2.5 min-w-0">
            {donutData.map((s) => (
              <li key={s.key}>
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-on-surface-variant truncate flex-1">
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrencyVnd(s.value)}
                  </span>
                </div>
                {totalEarned > 0 && (
                  <div className="h-1 rounded-full bg-surface-container-low overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s.value / totalEarned) * 100}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* Card list fallback when values don't sum to totalEarned */
        <ul className="mt-4 space-y-2">
          {donutData.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-3 p-3 rounded-[12px] border border-[var(--color-border-soft)]"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <span className="flex-1 text-[13px] text-on-surface-variant">
                {s.label}
              </span>
              <span className="font-semibold tabular-nums text-[14px]">
                {formatCurrencyVnd(s.value)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Helper text */}
      <div className="mt-4 flex items-start gap-1.5 text-[11.5px] text-on-surface-variant">
        <Info size={12} className="shrink-0 mt-0.5" />
        <p>
          {isConsistent
            ? "Số dư có thể rút = Tổng thu nhập đã ghi nhận − Đã rút − Đang xử lý."
            : "Một số khoản có thể đang được hệ thống giữ, xử lý hoặc đối soát nên tổng không nhất thiết khớp tuyệt đối."}
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider font-medium text-on-surface-variant">
            Số dư có thể rút
          </p>
          <p className="text-[18px] font-bold tabular-nums leading-none mt-0.5">
            {formatCurrencyVnd(availableBalance)}
          </p>
        </div>
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] transition-all"
          >
            <ArrowDownToLine size={13} />
            Rút tiền
          </button>
        )}
      </div>
    </motion.section>
  );
}

// ============================================================================
// Payout Account Card
// ============================================================================

function PayoutAccountCard({
  payoutAccount,
  onUpdate,
  reduce,
}: {
  payoutAccount: PayoutAccount | null;
  onUpdate: () => void;
  reduce: boolean;
}) {
  const statusRaw = (payoutAccount?.status ?? "").toLowerCase();
  const isVerified =
    statusRaw === "verified" || statusRaw === "approved";
  const isRejected = statusRaw === "rejected";
  const isPending =
    !isVerified &&
    !isRejected &&
    !!payoutAccount?.bankAccountNumber;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.4, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            Tài khoản nhận tiền
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Thông tin tài khoản ngân hàng nhận thanh toán.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(139,92,246,0.4)] shrink-0">
          <Building2 size={17} className="text-white" />
        </div>
      </div>

      {payoutAccount?.bankAccountNumber ? (
        <div className="space-y-2.5">
          <InfoRow
            label="Ngân hàng"
            value={payoutAccount.bankName ?? "—"}
          />
          <InfoRow
            label="Số tài khoản"
            value={maskAccountNumber(payoutAccount.bankAccountNumber)}
            mono
          />
          <InfoRow
            label="Chủ tài khoản"
            value={payoutAccount.bankAccountHolder ?? "—"}
          />
          <InfoRow
            label="Phương thức"
            value={payoutAccount.payoutMethod ?? "Chuyển khoản ngân hàng"}
          />

          {/* Status badge */}
          <div className="flex items-center gap-2 pt-1">
            <p className="text-[11.5px] text-on-surface-variant">Trạng thái:</p>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <ShieldCheck size={11} />
                Đã xác minh
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 border border-rose-200">
                <XCircle size={11} />
                Bị từ chối
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                <Clock size={11} />
                Chờ xác minh
              </span>
            )}
            {!isVerified && !isRejected && !isPending && (
              <span className="text-[11.5px] text-on-surface-variant">—</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-3">
            <Building2 size={20} className="text-on-surface-variant" />
          </div>
          <p className="text-[13px] text-on-surface-variant font-medium">
            Bạn chưa thiết lập tài khoản nhận tiền.
          </p>
          <p className="text-[12px] text-on-surface-variant/70 mt-1">
            Cần có tài khoản ngân hàng được duyệt để rút tiền.
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[var(--color-border-soft)]">
        <button
          onClick={onUpdate}
          className="w-full h-9 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Building2 size={13} />
          Cập nhật tài khoản nhận tiền
        </button>
      </div>
    </motion.section>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-[12px] text-on-surface-variant shrink-0">{label}</p>
      <p
        className={cn(
          "text-[13px] font-medium text-right",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Payout Table
// ============================================================================

function PayoutTable({
  payouts,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onWithdraw,
  reduce,
}: {
  payouts: Payout[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: Payout["status"] | "all";
  setStatusFilter: (s: Payout["status"] | "all") => void;
  onWithdraw?: () => void;
  reduce: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Payout | null>(null);
  const [receiptData, setReceiptData] =
    useState<WithdrawalReceiptResponse | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const handleViewReceipt = async (e: React.MouseEvent, p: Payout) => {
    e.stopPropagation();
    setViewingReceipt(p);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptLoading(true);
    try {
      const receipt = await api.fetchWithdrawalReceipt(p.id);
      setReceiptData(receipt);
      if (!receipt)
        setReceiptError("Biên nhận chưa khả dụng cho yêu cầu này.");
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
        transition={{ duration: reduce ? 0 : 0.5, delay: 0.5, ease: EASE }}
        className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border-soft)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight">
              Lịch sử rút tiền
            </h3>
            <p className="text-[12px] text-on-surface-variant mt-0.5">
              {payouts.length} yêu cầu hiển thị
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
                aria-label="Tìm kiếm yêu cầu rút tiền"
                placeholder="Tìm mã, phương thức…"
                className="h-9 pl-9 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-lg outline-none text-[12.5px] w-44 transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-lg flex-wrap">
              {(
                [
                  "all",
                  "paid",
                  "pending",
                  "approved",
                  "processing",
                  "failed",
                  "rejected",
                  "cancelled",
                ] as const
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors",
                    statusFilter === s
                      ? "bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {STATUS_FILTER_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Disabled export */}
            <button
              disabled
              title="Sắp hỗ trợ"
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] text-[12px] font-medium text-on-surface-variant opacity-50 cursor-not-allowed"
            >
              Xuất CSV
              <span className="text-[9px] bg-surface-container-low rounded px-1 py-0.5 ml-0.5">
                Sắp hỗ trợ
              </span>
            </button>

            {/* Withdraw CTA */}
            {onWithdraw && (
              <button
                onClick={onWithdraw}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] transition-all"
              >
                <ArrowDownToLine size={13} />
                Rút tiền
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-5 sm:px-6 py-3 font-semibold w-10" />
                <th className="px-3 py-3 font-semibold">Ngày</th>
                <th className="px-3 py-3 font-semibold">Phương thức</th>
                <th className="px-3 py-3 font-semibold">Mã tham chiếu</th>
                <th className="px-3 py-3 font-semibold text-right">Số tiền</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-5 sm:px-6 py-3 font-semibold text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <p className="text-[13px] text-on-surface-variant">
                      Không tìm thấy yêu cầu rút tiền phù hợp.
                    </p>
                  </td>
                </tr>
              )}
              {payouts.map((p, i) => {
                const meta = STATUS_META[p.status];
                const isOpen = expanded === p.id;
                const StatusIcon = meta.icon;
                const isFailed =
                  p.status === "failed" || p.status === "rejected";
                const failureText = p.failureReason ?? p.adminNote ?? null;
                return (
                  <Fragment key={p.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      className={cn(
                        "border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors cursor-pointer",
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
                          {new Date(p.date).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
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
                          {formatCurrencyVnd(p.amount)}
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
                              aria-label="Xem biên nhận"
                              title="Xem biên nhận"
                              className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                            >
                              <Receipt size={13} />
                            </button>
                          )}
                          <button
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Xem chi tiết"
                            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isOpen && (
                      <tr className="bg-gradient-to-br from-primary/[0.02] to-transparent border-b border-[var(--color-border-soft)]">
                        <td colSpan={7} className="px-5 sm:px-6 py-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <DetailItem
                              label="Mã yêu cầu"
                              value={p.id.toUpperCase()}
                              mono
                            />
                            <DetailItem
                              label="Ngày tạo"
                              value={new Date(p.date).toLocaleDateString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )}
                            />
                            {p.processingAt && (
                              <DetailItem
                                label="Ngày bắt đầu chuyển"
                                value={new Date(p.processingAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              />
                            )}
                            {p.paidAt && (
                              <DetailItem
                                label="Ngày hoàn tất"
                                value={new Date(p.paidAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                highlight
                              />
                            )}
                            <DetailItem
                              label="Mã PayOS Payout"
                              value={p.payOsPayoutId ?? "—"}
                              mono
                            />
                            <DetailItem
                              label="Trạng thái PayOS"
                              value={p.payOsPayoutStatus ?? "—"}
                            />
                          </div>

                          {/* Status description */}
                          {p.status === "processing" && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-[10px] bg-primary/[0.05] border border-primary/20">
                              <Info size={14} className="text-primary shrink-0 mt-0.5" />
                              <p className="text-[12.5px] text-primary">
                                Yêu cầu rút tiền đang được PayOS xử lý. Trạng thái sẽ tự cập nhật khi chuyển khoản hoàn tất.
                              </p>
                            </div>
                          )}

                          {/* Failure reason — shown directly, not behind icon */}
                          {isFailed && (
                            <div className="mt-3 flex items-start gap-2 p-3 rounded-[10px] bg-[#ffdad6]/50 border border-[#ffbbb3]">
                              <AlertCircle
                                size={14}
                                className="text-[#ba1a1a] shrink-0 mt-0.5"
                              />
                              <p className="text-[12.5px] text-[#ba1a1a]">
                                <span className="font-semibold">
                                  {p.status === "failed" ? "Chuyển khoản thất bại — tiền đã hoàn về số dư khả dụng. " : "Bị từ chối — tiền đã hoàn về số dư khả dụng. "}
                                </span>
                                {failureText && <>Lý do: {failureText}</>}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3">
                            {p.status === "paid" && (
                              <button
                                onClick={(e) => void handleViewReceipt(e, p)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-medium transition-colors"
                              >
                                <Receipt size={12} />
                                Xem biên nhận
                              </button>
                            )}
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
          onClose={() => {
            setViewingReceipt(null);
            setReceiptData(null);
            setReceiptError(null);
          }}
          onRetry={() =>
            void handleViewReceipt(
              { stopPropagation: () => {} } as React.MouseEvent,
              viewingReceipt,
            )
          }
        />
      )}
    </>
  );
}

function DetailItem({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider font-medium text-on-surface-variant">
        {label}
      </p>
      <p
        className={cn(
          "text-[13px] font-bold tabular-nums mt-0.5",
          highlight && "text-primary",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
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
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[20px] bg-surface-container-lowest border border-[var(--color-border-soft)] shadow-[0_24px_60px_-12px_rgba(15,15,30,0.35)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)]">
              <Receipt size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                Biên nhận rút tiền
              </p>
              <p className="text-[11.5px] text-on-surface-variant">
                {formatCurrencyVnd(payout.amount)}
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
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-surface-container-low/50">
                <p className="text-[11.5px] text-on-surface-variant font-medium">
                  Số biên nhận
                </p>
                <p className="text-[12px] font-mono font-semibold">
                  {receipt.receiptNumber}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ReceiptField
                  label="Số tiền"
                  value={formatCurrencyVnd(receipt.amount)}
                  mono
                />
                <ReceiptField label="Trạng thái" value={receipt.status} />
                <ReceiptField
                  label="Ngày tạo"
                  value={new Date(receipt.createdAt).toLocaleDateString(
                    "vi-VN",
                  )}
                />
                {receipt.paidAt && (
                  <ReceiptField
                    label="Ngày thanh toán"
                    value={new Date(receipt.paidAt).toLocaleDateString("vi-VN")}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-[10px] border border-[var(--color-border-soft)]">
                <div className="w-9 h-9 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">
                    {receipt.bankName}
                  </p>
                  <p className="text-[11.5px] text-on-surface-variant">
                    {receipt.maskedAccountNumber} · {receipt.accountHolderName}
                  </p>
                </div>
              </div>

              {receipt.payOsReferenceId && (
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-on-surface-variant">
                    Mã tham chiếu PayOS
                  </span>
                  <span className="font-mono text-on-surface">
                    {receipt.payOsReferenceId}
                  </span>
                </div>
              )}

              {receipt.note && (
                <p className="text-[11px] text-on-surface-variant/70 italic border-t border-[var(--color-border-soft)] pt-3">
                  {receipt.note}
                </p>
              )}

              <div className="flex items-start gap-2 p-3 rounded-[10px] bg-emerald-50 border border-emerald-200 mt-1">
                <ShieldCheck size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-700">
                  Phí nền tảng đã được trừ khi học viên mua gói tập. Không có phí bổ sung nào bị trừ trong lần rút tiền này.
                </p>
              </div>
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

function ReceiptField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
        {label}
      </p>
      <p
        className={cn(
          "text-[13px] font-bold mt-0.5 tabular-nums",
          mono ? "font-mono" : "",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
