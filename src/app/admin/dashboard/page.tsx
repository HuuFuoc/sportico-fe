"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Eye,
  FileBarChart,
  Filter,
  Gauge,
  Globe,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, VerificationRequest } from "@/types";
import type { AdminDashboardResponse } from "@/lib/backend/dto";

const EASE = [0.16, 1, 0.3, 1] as const;
const RANGE_OPTIONS = ["Hôm nay", "Tuần", "Tháng", "Tất cả"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

// Fallback demo values used only in mock mode when real API returns null.
const TOTAL_USERS = 24_592;
const ACTIVE_COACHES = 1_204;
const SESSIONS_TODAY = 452;
const PLATFORM_REVENUE_MTD = 842_000;

function seedSpark(seed: number, base: number, jitter: number, len = 8) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 5) + noise) };
  });
}

// In live mode the API returns no time-series data → don't show fake sparklines.
function liveSpark(seed: number, base: number, jitter: number) {
  return isMockMode() ? seedSpark(seed, base, jitter) : [];
}

// Synthetic mock data
const REVENUE_TREND = Array.from({ length: 12 }).map((_, i) => {
  const month = new Date(2025, i, 1).toLocaleDateString("vi-VN", {
    month: "short",
  });
  const base = 600_000 + i * 22_000;
  const noise = Math.sin(i * 1.7) * 35_000;
  return { month, v: Math.round(base + noise) };
});

const RETENTION = [
  { week: "T1", value: 100 },
  { week: "T2", value: 78 },
  { week: "T3", value: 64 },
  { week: "T4", value: 55 },
  { week: "T5", value: 48 },
  { week: "T6", value: 44 },
  { week: "T7", value: 41 },
  { week: "T8", value: 39 },
];

// Visitor traffic — demo series for 1/7 → 21/7. PAGE VIEWS drive the shape,
// in three phases: 10–20/ngày before 11/7, a 100–120/ngày launch spike on
// 11–12/7, then a 20–30/ngày plateau afterwards. `visitors` is the per-day
// unique count, which stays small because the same handful of people return.
const VISITOR_TREND = [
  { day: "1/7", visitors: 2, views: 12 },
  { day: "2/7", visitors: 3, views: 17 },
  { day: "3/7", visitors: 2, views: 11 },
  { day: "4/7", visitors: 3, views: 19 },
  { day: "5/7", visitors: 2, views: 14 },
  { day: "6/7", visitors: 1, views: 10 },
  { day: "7/7", visitors: 3, views: 16 },
  { day: "8/7", visitors: 2, views: 13 },
  { day: "9/7", visitors: 3, views: 20 },
  { day: "10/7", visitors: 2, views: 15 },
  { day: "11/7", visitors: 11, views: 104 },
  { day: "12/7", visitors: 12, views: 118 },
  { day: "13/7", visitors: 4, views: 27 },
  { day: "14/7", visitors: 3, views: 24 },
  { day: "15/7", visitors: 4, views: 29 },
  { day: "16/7", visitors: 3, views: 22 },
  { day: "17/7", visitors: 4, views: 26 },
  { day: "18/7", visitors: 4, views: 30 },
  { day: "19/7", visitors: 3, views: 23 },
  { day: "20/7", visitors: 4, views: 28 },
  { day: "21/7", visitors: 3, views: 25 },
];

/**
 * Unique visitors across the WHOLE period (1/7–21/7).
 *
 * Deliberately not `sum(VISITOR_TREND.visitors)`: daily uniques double-count
 * anyone who returns on another day, so a period total is always lower than
 * the sum of its days. Same semantics as Vercel Analytics' visitor metric.
 */
const UNIQUE_VISITORS = 21;

// Session heatmap: 7 days × 4 time buckets
const HEATMAP_HOURS = ["06:00", "12:00", "18:00", "00:00"];
const HEATMAP_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HEATMAP = HEATMAP_DAYS.map((d, i) =>
  HEATMAP_HOURS.map((_, j) => {
    const v = Math.abs(Math.sin(i * 1.3 + j * 0.7)) * 100;
    return Math.round(v);
  }),
);

export default function AdminDashboardPage() {
  const { data, loading, error, refetch } = useApiResource(
    () =>
      Promise.all([
        api.fetchVerifications(),
        api.fetchCoaches(),
        api.fetchAdminDashboard(), // real aggregate metrics (null in mock mode)
      ]),
    [],
  );
  const allVerifications = useMemo(() => data?.[0] ?? [], [data]);
  const allCoaches = useMemo(() => data?.[1] ?? [], [data]);
  /** Real platform dashboard — non-null in live mode, null in mock/demo mode. */
  const dashStats = data?.[2] ?? null;

  const reduce = useReducedMotion();
  const [range, setRange] = useState<Range>("Tháng");

  // Verification with synthetic risk score
  const verifications = useMemo<VerificationWithRisk[]>(
    () =>
      allVerifications.slice(0, 4).map((v, i) => ({
        ...v,
        risk: (i === 0
          ? "low"
          : i === 1
            ? "high"
            : i === 2
              ? "med"
              : "low") as RiskLevel,
        score: 92 - i * 14,
      })),
    [allVerifications],
  );

  if (loading) {
    return (
      <AppShell role="admin" title="Tổng quan">
        <LoadingState label="Đang tải bảng điều khiển…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="admin" title="Tổng quan">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  const recentCoaches = allCoaches.slice(0, 5);

  // Real metrics from backend. In live mode, show "—" when API fails (dashStats null).
  // In mock mode, fall back to demo constants so the UI stays populated during design.
  const displayTotalUsers =
    dashStats?.totalUsers ?? (isMockMode() ? TOTAL_USERS : null);
  const displayActiveCoaches =
    dashStats?.totalCoaches ?? (isMockMode() ? ACTIVE_COACHES : null);
  const displayGrossRevenue =
    dashStats?.grossRevenue ?? (isMockMode() ? PLATFORM_REVENUE_MTD : null);

  return (
    <AppShell role="admin" title="Tổng quan">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                <Terminal size={11} />
                Trung tâm điều hành
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-semibold text-[#1f7a4d]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Trực tiếp
              </span>
              <span className="text-[12px] text-on-surface-variant">
                Cập nhật lúc{" "}
                {new Date().toLocaleTimeString("vi-VN", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
              Tổng quan nền tảng
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              Phân tích theo thời gian thực: người dùng, buổi tập và doanh thu.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "relative px-3 h-8 text-[12.5px] font-medium rounded-[7px] transition-colors",
                    range === r
                      ? "text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {range === r && (
                    <motion.span
                      layoutId="adminRangePill"
                      className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06),0_2px_6px_rgba(15,15,30,0.04)]"
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
            <button className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors">
              <Filter size={13} />
              Khu vực
            </button>
            <button
              aria-label="Làm mới"
              className="w-10 h-10 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center"
            >
              <RefreshCw size={14} />
            </button>
            <button className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Download size={13} />
              Xuất
            </button>
          </div>
        </motion.header>

        {/* ============ HERO COMMAND CENTER ============ */}
        <HeroCommand
          revenue={displayGrossRevenue}
          users={displayTotalUsers}
          sessions={
            dashStats?.activeBookings ?? (isMockMode() ? SESSIONS_TODAY : null)
          }
          coaches={displayActiveCoaches}
          totalBookings={dashStats?.totalBookings ?? null}
          completedBookings={dashStats?.completedBookings ?? null}
          reduce={reduce ?? false}
        />

        {/* ============ KPI ROW ============ */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiCard
            icon={Users}
            label="Tổng người dùng"
            value={
              displayTotalUsers !== null ? formatNumber(displayTotalUsers) : "—"
            }
            trend={
              dashStats
                ? `${formatNumber(dashStats.totalLearners)} HV · ${formatNumber(dashStats.totalCoaches)} HLV`
                : isMockMode()
                  ? "+12%"
                  : undefined
            }
            trendDir={dashStats ? "neutral" : "up"}
            trendLabel={dashStats || !isMockMode() ? "" : "tăng trưởng tháng"}
            accent="indigo"
            spark={liveSpark(1, 18000, 2000)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={ShieldCheck}
            label="HLV đang hoạt động"
            value={
              displayActiveCoaches !== null
                ? formatNumber(displayActiveCoaches)
                : "—"
            }
            trend={
              dashStats
                ? `${formatNumber(dashStats.publishedPackages)} gói đang bán`
                : isMockMode()
                  ? "84 mới"
                  : undefined
            }
            trendDir="up"
            trendLabel={dashStats || !isMockMode() ? "" : "tuần này"}
            accent="violet"
            spark={liveSpark(2, 1100, 60)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={Activity}
            label={dashStats ? "Gói tập hoạt động" : "Buổi tập hôm nay"}
            value={
              dashStats
                ? formatNumber(dashStats.activeBookings)
                : isMockMode()
                  ? formatNumber(SESSIONS_TODAY)
                  : "—"
            }
            trend={
              dashStats
                ? `${formatNumber(dashStats.completedBookings)} hoàn thành`
                : isMockMode()
                  ? "Đỉnh 14h"
                  : undefined
            }
            trendDir={dashStats ? "up" : "neutral"}
            trendLabel={dashStats || !isMockMode() ? "" : "hiện tại"}
            accent="emerald"
            spark={liveSpark(3, 380, 60)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={DollarSign}
            label="Doanh thu nền tảng"
            value={
              displayGrossRevenue !== null
                ? formatCurrency(displayGrossRevenue)
                : "—"
            }
            trend={
              dashStats
                ? `Phí: ${formatCurrency(dashStats.platformFeeRevenue)}`
                : isMockMode()
                  ? "+18%"
                  : undefined
            }
            trendDir="up"
            trendLabel={dashStats || !isMockMode() ? "" : "so tháng trước"}
            accent="amber"
            spark={liveSpark(4, 700000, 60000)}
            delay={0.2}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={CreditCard}
            label="Rút tiền chờ"
            value={dashStats ? formatNumber(dashStats.pendingWithdrawals) : "—"}
            trend={
              dashStats
                ? `${formatNumber(dashStats.processingWithdrawals)} đang xử lý`
                : undefined
            }
            trendDir="neutral"
            trendLabel=""
            accent="rose"
            spark={liveSpark(5, 91, 2)}
            delay={0.25}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ 2-COLUMN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-5">
          {/* ============ LEFT ============ */}
          <div className="space-y-5 min-w-0">
            {/* DAU + Revenue */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <AdminChartUnavailable
                title="Người dùng hoạt động hàng ngày"
                message="Endpoint DAU theo ngày chưa khả dụng từ backend."
              />
              {isMockMode() ? (
                <RevenueChart data={REVENUE_TREND} reduce={reduce ?? false} />
              ) : (
                <AdminChartUnavailable
                  title="Doanh thu nền tảng"
                  message="Endpoint tổng hợp doanh thu theo tháng đang trong lộ trình phát triển."
                />
              )}
            </div>

            {/* Heatmap + Retention */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-5">
              {isMockMode() ? (
                <SessionHeatmap reduce={reduce ?? false} />
              ) : (
                <AdminChartUnavailable
                  title="Mật độ buổi tập"
                  message="Dữ liệu heatmap theo khung giờ chưa khả dụng."
                />
              )}
              {isMockMode() ? (
                <RetentionChart data={RETENTION} reduce={reduce ?? false} />
              ) : (
                <AdminChartUnavailable
                  title="Tỷ lệ giữ chân người dùng"
                  message="Dữ liệu retention theo tuần chưa khả dụng."
                />
              )}
            </div>

            {/* Verifications */}
            <PendingVerifications
              verifications={verifications}
              reduce={reduce ?? false}
            />

            {/* Recent coaches */}
            <RecentUsers coaches={recentCoaches} reduce={reduce ?? false} />
          </div>

          {/* ============ RIGHT SIDEBAR ============ */}
          <aside className="space-y-5">
            <AIOpsCard
              dashStats={dashStats}
              pendingVerificationsCount={allVerifications.length}
              reduce={reduce ?? false}
            />
            <VisitorTraffic reduce={reduce ?? false} />
            {isMockMode() && <SystemHealth reduce={reduce ?? false} />}
            <QuickActions
              pendingVerificationsCount={allVerifications.length}
              reduce={reduce ?? false}
            />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ============================================================================
// Hero Command Center
// ============================================================================

function HeroCommand({
  revenue,
  users,
  sessions,
  coaches,
  totalBookings,
  completedBookings,
  reduce,
}: {
  revenue: number | null;
  users: number | null;
  sessions: number | null;
  coaches: number | null;
  totalBookings: number | null;
  completedBookings: number | null;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.55, delay: 0.05, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-surface-container-lowest to-[#7d6dff]/[0.08] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_16px_36px_-18px_rgba(53,37,205,0.28)]"
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/25 via-primary/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-gradient-to-tr from-[#7d6dff]/20 to-transparent blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
              Doanh thu nền tảng · Lũy kế
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[48px] sm:text-[64px] leading-[1] font-bold tracking-tight tabular-nums bg-gradient-to-br from-on-surface via-primary to-[#7d6dff] bg-clip-text text-transparent">
              {revenue !== null ? formatCurrency(revenue) : "—"}
            </span>
          </div>

          <p className="text-[13.5px] text-on-surface-variant mt-3 max-w-xl leading-relaxed">
            {totalBookings !== null && completedBookings !== null
              ? `${formatNumber(totalBookings)} gói tập đã tạo · ${formatNumber(completedBookings)} hoàn thành trên toàn nền tảng.`
              : users !== null && coaches !== null
                ? `Nền tảng đang phục vụ ${formatNumber(users)} người dùng và ${formatNumber(coaches)} huấn luyện viên.`
                : "Đang tải dữ liệu nền tảng…"}
          </p>

          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <FileBarChart size={14} />
              Báo cáo đầy đủ
            </button>
            <button className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-[13.5px] font-medium transition-colors">
              <Search size={14} />
              Xem chi tiết
            </button>
          </div>
        </div>

        {/* Inline mini stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <HeroStat
            icon={Users}
            label="Tổng người dùng"
            value={users !== null ? formatNumber(users) : "—"}
          />
          <HeroStat
            icon={Activity}
            label="Buổi tập hôm nay"
            value={sessions !== null ? formatNumber(sessions) : "—"}
          />
          <HeroStat
            icon={ShieldCheck}
            label="HLV đang hoạt động"
            value={coaches !== null ? formatNumber(coaches) : "—"}
          />
        </div>
      </div>
    </motion.div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="relative rounded-[16px] bg-surface-container-lowest/80 backdrop-blur-sm border border-[var(--color-border-soft)] p-3 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.06)]">
      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary/15 to-primary/[0.04] border border-primary/15 flex items-center justify-center mb-2 text-primary">
        <Icon size={14} strokeWidth={2.25} />
      </div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
        {label}
      </p>
      <p className="text-[18px] sm:text-[20px] font-bold tracking-tight tabular-nums mt-0.5 leading-none">
        {value}
      </p>
    </div>
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
    trend: "text-primary",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    decor: "from-[#c084fc]/15 to-[#c084fc]/0",
    stroke: "#8b5cf6",
    trend: "text-[#7c3aed]",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
    stroke: "#10b981",
    trend: "text-[#1f7a4d]",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
    stroke: "#f59e0b",
    trend: "text-[#b45309]",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-[#f43f5e] to-[#fb7185]",
    glow: "shadow-[0_4px_14px_-3px_rgba(244,63,94,0.35)]",
    decor: "from-[#fb7185]/15 to-[#fb7185]/0",
    stroke: "#f43f5e",
    trend: "text-[#be123c]",
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
  icon: typeof Users;
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
    trendDir === "up" || trendDir === "neutral" ? a.trend : "text-[#ba1a1a]";
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
        {spark.length > 0 && (
          <div className="h-7 mt-2.5 -mx-1">
            <ClientOnly fallback={<div className="h-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={spark}
                  margin={{ top: 2, right: 4, bottom: 0, left: 4 }}
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
        )}
        <div className="flex items-center gap-1.5 mt-1 text-[11px]">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trendColor,
              )}
            >
              <TrendingUp size={10} />
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
// Chart unavailable placeholder (live mode, missing backend endpoint)
// ============================================================================

function AdminChartUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 flex flex-col justify-between min-h-[220px]">
      <div>
        <p className="text-[13px] font-semibold text-on-surface">{title}</p>
        <p className="text-[11.5px] text-on-surface-variant mt-1 leading-relaxed">
          {message}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 gap-2 py-6 text-on-surface-variant/40">
        <Database size={24} />
        <p className="text-[12px]">Chưa có dữ liệu</p>
      </div>
    </div>
  );
}

// ============================================================================
// Revenue Chart
// ============================================================================

function RevenueChart({
  data,
  reduce,
}: {
  data: { month: string; v: number }[];
  reduce: boolean;
}) {
  const last = data[data.length - 1].v;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.35, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            Xu hướng doanh thu
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            12 tháng qua · doanh thu gộp
          </p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums leading-none mt-3">
            {formatCurrency(last)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-medium text-[#1f7a4d]">
          <TrendingUp size={10} />
          +18% MoM
        </span>
      </div>
      <div className="h-[200px] -mx-2">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: -4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revAreaA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revStrokeA" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
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
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <Tooltip
                cursor={{
                  stroke: "#10b981",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { month: string; v: number };
                  return (
                    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                        {p.month}
                      </p>
                      <p className="text-[14px] font-bold tabular-nums mt-0.5">
                        {formatCurrency(p.v)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="url(#revStrokeA)"
                strokeWidth={2.5}
                fill="url(#revAreaA)"
                activeDot={{
                  r: 5,
                  fill: "#fff",
                  stroke: "#10b981",
                  strokeWidth: 2.5,
                }}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Session Heatmap
// ============================================================================

function SessionHeatmap({ reduce }: { reduce: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.4, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            Biểu đồ nhiệt buổi tập
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            Cường độ hoạt động · ngày × khung giờ
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] text-on-surface-variant">
          <span>Ít</span>
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((o, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-[3px]"
              style={{ background: `rgba(79, 70, 229, ${o})` }}
            />
          ))}
          <span>Nhiều</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* Header row */}
        <div className="grid grid-cols-[36px_repeat(4,1fr)] gap-1.5">
          <div />
          {HEATMAP_HOURS.map((h) => (
            <p
              key={h}
              className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant text-center"
            >
              {h}
            </p>
          ))}
        </div>
        {/* Rows */}
        {HEATMAP.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduce ? 0 : 0.4,
              delay: reduce ? 0 : 0.45 + i * 0.04,
              ease: EASE,
            }}
            className="grid grid-cols-[36px_repeat(4,1fr)] gap-1.5"
          >
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant flex items-center">
              {HEATMAP_DAYS[i]}
            </p>
            {row.map((v, j) => {
              const intensity = v / 100;
              return (
                <motion.div
                  key={j}
                  whileHover={reduce ? {} : { scale: 1.08 }}
                  className="group relative h-9 rounded-[8px] cursor-pointer flex items-center justify-center"
                  style={{
                    background: `rgba(79, 70, 229, ${0.08 + intensity * 0.75})`,
                  }}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity",
                      intensity > 0.5 ? "text-white" : "text-on-surface",
                    )}
                  >
                    {Math.round(v * 5)}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

// ============================================================================
// Retention Chart
// ============================================================================

function RetentionChart({
  data,
  reduce,
}: {
  data: { week: string; value: number }[];
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.45, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="mb-2">
        <h3 className="text-[17px] font-semibold tracking-tight">
          Đường cong giữ chân
        </h3>
        <p className="text-[12px] text-on-surface-variant mt-0.5">
          Giữ chân theo nhóm · 8 tuần
        </p>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-[28px] font-bold tracking-tight tabular-nums leading-none text-[#7c3aed]">
            {data[data.length - 1].value}%
          </span>
          <span className="text-[11.5px] text-on-surface-variant">
            giữ chân tuần 8
          </span>
        </div>
      </div>

      <div className="h-[160px] -mx-2 mt-2">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: -4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#e8e8e5"
                strokeDasharray="4 6"
              />
              <XAxis
                dataKey="week"
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                width={28}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as {
                    week: string;
                    value: number;
                  };
                  return (
                    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                        {p.week}
                      </p>
                      <p className="text-[14px] font-bold tabular-nums mt-0.5 text-[#7c3aed]">
                        {p.value}%
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#retGrad)"
                activeDot={{
                  r: 5,
                  fill: "#fff",
                  stroke: "#8b5cf6",
                  strokeWidth: 2.5,
                }}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Pending Verifications
// ============================================================================

type RiskLevel = "low" | "med" | "high";
type VerificationWithRisk = VerificationRequest & {
  risk: RiskLevel;
  score: number;
};

const RISK_META: Record<
  RiskLevel,
  { pill: string; dot: string; label: string }
> = {
  low: {
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
    label: "Rủi ro thấp",
  },
  med: {
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
    label: "Rủi ro trung bình",
  },
  high: {
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
    label: "Rủi ro cao",
  },
};

function PendingVerifications({
  verifications,
  reduce,
}: {
  verifications: VerificationWithRisk[];
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.5, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold tracking-tight">
              Xác minh đang chờ
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff5d6] text-[#b95000] text-[10.5px] font-semibold border border-[#f4d68a]/60">
              {verifications.length} mới
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            Sắp xếp theo điểm rủi ro AI
          </p>
        </div>
        <Link
          href="/admin/verifications"
          className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Hàng đợi duyệt
          <ChevronRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {verifications.map((v, i) => {
          const meta = RISK_META[v.risk];
          return (
            <motion.article
              key={v.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduce ? 0 : 0.4,
                delay: reduce ? 0 : 0.55 + i * 0.05,
                ease: EASE,
              }}
              whileHover={reduce ? {} : { y: -2 }}
              className="group relative overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest p-4 transition-all shadow-[0_1px_2px_rgba(15,15,30,0.03)] hover:shadow-[0_6px_18px_-6px_rgba(15,15,30,0.12)]"
            >
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={v.coachAvatar}
                  alt={v.coachName}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13.5px] font-semibold truncate">
                      {v.coachName}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
                        meta.pill,
                      )}
                    >
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full", meta.dot)}
                      />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                    {v.sport} · {v.documents.length} docs ·{" "}
                    {new Date(v.submittedAt).toLocaleDateString("vi-VN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {/* Risk score bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-surface-container-low overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${v.score}%` }}
                        transition={{
                          duration: reduce ? 0 : 0.8,
                          delay: reduce ? 0 : 0.6 + i * 0.05,
                        }}
                        className={cn(
                          "h-full rounded-full",
                          v.risk === "high"
                            ? "bg-[#ef4444]"
                            : v.risk === "med"
                              ? "bg-[#f59e0b]"
                              : "bg-gradient-to-r from-[#10b981] to-[#34d399]",
                        )}
                      />
                    </div>
                    <span className="text-[10.5px] font-bold tabular-nums text-on-surface-variant">
                      {v.score}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors">
                  Từ chối
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[12.5px] font-semibold shadow-[0_3px_10px_-2px_rgba(16,185,129,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(16,185,129,0.55)] hover:scale-[1.02] transition-all">
                  <CheckCircle2 size={13} />
                  Duyệt
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

// ============================================================================
// Recent Users (coaches only — no real learner list endpoint)
// ============================================================================

function RecentUsers({
  coaches,
  reduce,
}: {
  coaches: Coach[];
  reduce: boolean;
}) {
  const items = coaches.map((c) => ({
    id: c.id,
    avatar: c.avatarUrl,
    name: c.name,
    sub: `${c.sport ?? "HLV"} · tham gia ${new Date(c.joinedAt).toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}`,
    badge: c.verified ? "Đã xác minh" : "Chưa xác minh",
    tone: (c.verified ? "good" : "neutral") as "good" | "neutral",
  }));
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.55, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">
            HLV đăng ký gần đây
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            Huấn luyện viên mới nhất tham gia nền tảng
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Tất cả
          <ChevronRight size={12} />
        </Link>
      </div>
      <ul className="px-3 pb-3 space-y-1">
        {items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduce ? 0 : 0.35,
              delay: reduce ? 0 : i * 0.04,
              ease: EASE,
            }}
            whileHover={reduce ? {} : { x: 2 }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-surface-container-low/60 transition-colors cursor-pointer"
          >
            <img
              src={it.avatar}
              alt={it.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">{it.name}</p>
              <p className="text-[11.5px] text-on-surface-variant truncate">
                {it.sub}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
                it.tone === "good"
                  ? "bg-success-container text-[#1f7a4d] border-[#bce8c8]"
                  : "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
              )}
            >
              {it.badge}
            </span>
            <ArrowRight
              size={13}
              className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
            />
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}

// ============================================================================
// AI Ops Card
// ============================================================================

function AIOpsCard({
  dashStats,
  pendingVerificationsCount,
  reduce,
}: {
  dashStats: AdminDashboardResponse | null;
  pendingVerificationsCount: number;
  reduce: boolean;
}) {
  const pendingWithdrawals = dashStats?.pendingWithdrawals ?? 0;
  const processingWithdrawals = dashStats?.processingWithdrawals ?? 0;
  const failedWithdrawals = dashStats?.failedWithdrawals ?? 0;

  const ops = [
    {
      icon: ShieldCheck,
      label: "Xác minh đang chờ",
      value: String(pendingVerificationsCount),
      tone:
        pendingVerificationsCount > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      icon: CreditCard,
      label: "Rút tiền đang chờ",
      value: dashStats !== null ? String(pendingWithdrawals) : "—",
      tone: pendingWithdrawals > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      icon: AlertTriangle,
      label: "Rút tiền thất bại",
      value: dashStats !== null ? String(failedWithdrawals) : "—",
      tone: failedWithdrawals > 0 ? ("danger" as const) : ("good" as const),
    },
  ];

  const summaryLine =
    dashStats !== null
      ? [
          pendingVerificationsCount > 0 &&
            `${pendingVerificationsCount} HLV chờ xác minh`,
          pendingWithdrawals > 0 &&
            `${pendingWithdrawals} yêu cầu rút tiền chờ xử lý`,
          processingWithdrawals > 0 &&
            `${processingWithdrawals} đang chuyển khoản`,
        ]
          .filter(Boolean)
          .join(" · ") || "Không có mục nào cần xử lý gấp."
      : "Đang tải dữ liệu vận hành…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.15, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-gradient-to-br from-[#7d6dff]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary inline-flex items-center gap-1.5">
            <Sparkles size={11} />
            Trung tâm vận hành
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Trực tiếp
          </span>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-50" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_6px_16px_-3px_rgba(53,37,205,0.5)]">
              <Sparkles size={18} className="text-on-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] leading-snug font-semibold text-on-surface">
              {summaryLine}
            </p>
            <p className="text-[12px] text-on-surface-variant leading-relaxed mt-1">
              Ưu tiên xử lý các mục rủi ro cao để duy trì uy tín nền tảng.
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-4">
          {ops.map((op) => {
            const tone =
              op.tone === "good"
                ? "text-[#1f7a4d]"
                : op.tone === "warn"
                  ? "text-[#b95000]"
                  : "text-[#ba1a1a]";
            return (
              <li
                key={op.label}
                className="flex items-center justify-between px-3 py-2 rounded-[12px] bg-surface-container-lowest/80 backdrop-blur-sm border border-[var(--color-border-soft)]"
              >
                <span className="inline-flex items-center gap-2 text-[12px]">
                  <op.icon size={13} className={tone} />
                  <span className="text-on-surface-variant">{op.label}</span>
                </span>
                <span
                  className={cn("text-[13.5px] font-bold tabular-nums", tone)}
                >
                  {op.value}
                </span>
              </li>
            );
          })}
        </ul>

        <Link
          href="/admin/verifications"
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Xem xét ngay
          <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Visitor Traffic
// ============================================================================

function VisitorTraffic({ reduce }: { reduce: boolean }) {
  // Demo visitor series — rendered in both mock and live mode so the dashboard
  // always has a populated traffic card. The "Dữ liệu mẫu" badge below keeps it
  // honest: these are illustrative numbers, NOT measured production traffic.
  // Swap VISITOR_TREND for a real fetch (e.g. GET /api/admin/analytics/visitors)
  // when the backend endpoint exists, then drop the badge.
  const totalViews = VISITOR_TREND.reduce((s, d) => s + d.views, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.2, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-white shadow-[0_4px_12px_-3px_rgba(53,37,205,0.4)]">
            <Globe size={16} strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight leading-none">
              Lượt truy cập
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-1">
              1/7 – 21/7
            </p>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
            <Users size={11} className="text-primary" />
            Lượt truy cập
          </div>
          <p className="text-[24px] font-bold tracking-tight tabular-nums mt-1 leading-none">
            {formatNumber(UNIQUE_VISITORS)}
          </p>
        </div>
        <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
            <Eye size={11} className="text-[#7c3aed]" />
            Lượt xem
          </div>
          <p className="text-[24px] font-bold tracking-tight tabular-nums mt-1 leading-none">
            {formatNumber(totalViews)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[120px] -mx-2">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={VISITOR_TREND}
              margin={{ left: -4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="visitorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#e8e8e5"
                strokeDasharray="4 6"
              />
              <XAxis
                dataKey="day"
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                dy={4}
                // 21 points in a sidebar-width chart — show every 5th label so
                // they don't collide. Lands on 1/7, 6/7, 11/7, 16/7, 21/7.
                interval={4}
              />
              <YAxis
                stroke="#777587"
                fontSize={10.5}
                tickLine={false}
                axisLine={false}
                width={26}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{
                  stroke: "#4f46e5",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as {
                    day: string;
                    visitors: number;
                    views: number;
                  };
                  return (
                    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                      <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                        {p.day}
                      </p>
                      <p className="text-[12.5px] font-bold tabular-nums mt-0.5">
                        {formatNumber(p.views)} lượt xem
                      </p>
                      <p className="text-[11px] tabular-nums text-on-surface-variant">
                        {formatNumber(p.visitors)} khách
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fill="url(#visitorArea)"
                activeDot={{
                  r: 5,
                  fill: "#fff",
                  stroke: "#4f46e5",
                  strokeWidth: 2.5,
                }}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </motion.div>
  );
}

// ============================================================================
// System Health
// ============================================================================

function SystemHealth({ reduce }: { reduce: boolean }) {
  const items = [
    {
      icon: Gauge,
      label: "Thời gian hoạt động",
      value: "99.98%",
      tone: "good" as const,
      hint: "30 ngày",
    },
    {
      icon: Server,
      label: "Độ trễ API",
      value: "142ms",
      tone: "good" as const,
      hint: "p95",
    },
    {
      icon: CreditCard,
      label: "Thanh toán thất bại",
      value: "0.3%",
      tone: "warn" as const,
      hint: "24h",
    },
    {
      icon: AlertTriangle,
      label: "Sự cố đang mở",
      value: "0",
      tone: "good" as const,
      hint: "không có sự cố",
    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.22, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight">
            Tình trạng hệ thống
          </h3>
          <p className="text-[11.5px] text-on-surface-variant mt-0.5">
            Tất cả hệ thống hoạt động bình thường
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10.5px] font-semibold text-[#1f7a4d]">
          <CheckCircle2 size={11} />
          Ổn định
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {items.map((it) => {
          const tone =
            it.tone === "good"
              ? "text-[#1f7a4d]"
              : it.tone === "warn"
                ? "text-[#b95000]"
                : "text-[#ba1a1a]";
          const bg =
            it.tone === "good"
              ? "bg-success-container/40 border-[#bce8c8]"
              : it.tone === "warn"
                ? "bg-[#fff5d6]/60 border-[#f4d68a]/60"
                : "bg-[#ffdad6]/50 border-[#ffbbb3]";
          return (
            <li key={it.label} className={cn("rounded-[14px] p-3 border", bg)}>
              <div className="flex items-center gap-1.5 text-[10.5px] text-on-surface-variant uppercase tracking-wider font-semibold">
                <it.icon size={11} className={tone} />
                {it.label}
              </div>
              <p
                className={cn(
                  "text-[18px] font-bold tabular-nums mt-1 leading-none",
                  tone,
                )}
              >
                {it.value}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1">
                {it.hint}
              </p>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

const QA_ACCENT = {
  indigo: "from-primary to-[#7d6dff]",
  violet: "from-[#8b5cf6] to-[#c084fc]",
  emerald: "from-[#10b981] to-[#34d399]",
  amber: "from-[#f59e0b] to-[#fb923c]",
} as const;

function QuickActions({
  pendingVerificationsCount,
  reduce,
}: {
  pendingVerificationsCount: number;
  reduce: boolean;
}) {
  const actions = [
    {
      icon: ShieldCheck,
      label: "Duyệt xác minh",
      desc:
        pendingVerificationsCount > 0
          ? `${pendingVerificationsCount} đang chờ`
          : "Không có mục chờ",
      href: "/admin/verifications",
      accent: "indigo" as const,
    },
    {
      icon: FileBarChart,
      label: "Xuất phân tích",
      desc: "CSV + PDF",
      href: "#",
      accent: "violet" as const,
    },
    {
      icon: Database,
      label: "Xem báo cáo",
      desc: "Bảng lưu sẵn",
      href: "#",
      accent: "emerald" as const,
    },
    {
      icon: Terminal,
      label: "Nhật ký hệ thống",
      desc: "Theo dõi trực tiếp",
      href: "#",
      accent: "amber" as const,
    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.3, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[16px] font-semibold tracking-tight mb-3">
        Thao tác nhanh
      </h3>
      <div className="space-y-2">
        {actions.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.35 + i * 0.05,
                ease: EASE,
              }}
            >
              <Link
                href={q.href}
                className="group flex items-center gap-3 p-3 rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgba(15,15,30,0.12)]"
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
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Silence unused-import warnings
void Clock;
void Zap;
