"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatCurrency } from "@/lib/utils";
import { mockEarnings, mockPayouts } from "@/lib/mock/earnings";
import { getCoachById } from "@/lib/mock/users";

const PLATFORM_FEE_PCT = 0.15;
const TOTAL_REVENUE = 4_200_000;
const PLATFORM_FEE = 630_000;
const PENDING_PAYOUTS = 125_000;
const PAID_MTD = 480_000;

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-[#d1f4dd] text-[#1f7a4d]",
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-primary/10 text-primary",
  failed: "bg-[#ffdad6] text-[#ba1a1a]",
};

export default function AdminRevenuePage() {
  // Build revenue vs payout series from monthly earnings (scaled up for platform-wide)
  const series = mockEarnings.map((e) => ({
    month: e.month,
    revenue: Math.round(e.gross * 18.4),
    payouts: Math.round(e.gross * 18.4 * (1 - PLATFORM_FEE_PCT)),
    fees: Math.round(e.gross * 18.4 * PLATFORM_FEE_PCT),
  }));

  return (
    <AppShell role="admin" title="Revenue & Payouts">
      <div className="max-w-[1400px] space-y-5">
        <header>
          <h1 className="text-h1">Revenue & Payouts</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Financial overview and coach compensation management.
          </p>
        </header>

        {/* Summary KPI */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Summary
            label="Total Revenue"
            value={formatCurrency(TOTAL_REVENUE)}
            sub="+12.4% from last year"
            accent
          />
          <Summary
            label="Platform Fee (15%)"
            value={formatCurrency(PLATFORM_FEE)}
            sub="Lifetime collected"
          />
          <Summary
            label="Pending Payouts"
            value={formatCurrency(PENDING_PAYOUTS)}
            sub="14 requests active"
            tone="warning"
          />
          <Summary
            label="Paid Out (MTD)"
            value={formatCurrency(PAID_MTD)}
            sub="Month-to-date total"
          />
        </section>

        {/* Trends + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <ChartCard
            title="Revenue vs Payout Trends"
            subtitle="12-month rolling view"
            className="lg:col-span-8"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={series}
                  margin={{ left: -10, right: 6, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop
                        offset="100%"
                        stopColor="#4f46e5"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="pay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#777587" stopOpacity={0.25} />
                      <stop
                        offset="100%"
                        stopColor="#777587"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#e8e8e5"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e8e8e5",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      paddingTop: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#4f46e5"
                    fill="url(#rev)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="payouts"
                    name="Payouts"
                    stroke="#777587"
                    fill="url(#pay)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Fees trend */}
          <ChartCard
            title="Platform Fees"
            subtitle="Monthly fee revenue"
            className="lg:col-span-4"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series}
                  margin={{ left: -10, right: 6, top: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#e8e8e5"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e8e8e5",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Line
                    type="monotone"
                    dataKey="fees"
                    stroke="#3525cd"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3525cd" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Payouts table */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
            <h3 className="text-h3">Recent Payouts</h3>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low inline-flex items-center gap-1.5">
                <MaterialIcon name="filter_list" size={14} />
                Filter
              </button>
              <button className="px-3 py-1.5 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
                Run Payout Batch
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-[var(--color-border-soft)] text-[11px] uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-medium">Coach</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {mockPayouts.map((p) => {
                  const coach = getCoachById(p.coachId);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={coach?.avatarUrl}
                            alt={coach?.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <p className="text-body-base font-medium truncate">
                            {coach?.name ?? "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                        {p.method}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-medium",
                            STATUS_STYLES[p.status],
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-body-sm text-primary hover:underline">
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Summary({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tone?: "warning";
}) {
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex flex-col gap-1.5">
      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
        {label}
      </p>
      <p
        className={cn(
          "text-h1",
          accent
            ? "text-primary"
            : tone === "warning"
              ? "text-amber-700"
              : "text-on-surface",
        )}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-body-sm text-on-surface-variant">{sub}</p>
      )}
    </div>
  );
}
