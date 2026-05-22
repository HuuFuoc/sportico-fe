"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { StatCard } from "@/components/common/StatCard";
import { ClientOnly } from "@/components/common/ClientOnly";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatCurrency } from "@/lib/utils";
import { mockEarnings, mockPayouts } from "@/lib/mock/earnings";
import { getCoachById } from "@/lib/mock/users";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-[#d1f4dd] text-[#1f7a4d]",
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-primary/10 text-primary",
  failed: "bg-[#ffdad6] text-[#ba1a1a]",
};

export default function CoachEarningsPage() {
  const coach = getCoachById("coach-1")!;
  const last = mockEarnings[mockEarnings.length - 1];
  const prev = mockEarnings[mockEarnings.length - 2];
  const total = mockEarnings.reduce((s, x) => s + x.gross, 0);
  const myPayouts = mockPayouts.filter((p) => p.coachId === coach.id);
  const pendingTotal = myPayouts
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell role="coach" title="Earnings">
      <div className="max-w-[1300px] space-y-5">
        <header>
          <h1 className="text-h1">Earnings & Analytics</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Track revenue, session volume and payout status.
          </p>
        </header>

        {/* KPI */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4">
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              This Month
            </p>
            <p
              className="text-h1 text-primary mt-1"
              style={{ letterSpacing: "-0.02em" }}
            >
              {formatCurrency(last.gross)}
            </p>
            {(() => {
              const deltaPct = Math.round(
                ((last.gross - prev.gross) / prev.gross) * 100,
              );
              const down = deltaPct < 0;
              return (
                <p
                  className={cn(
                    "text-body-sm mt-1 inline-flex items-center gap-1",
                    down ? "text-[#ba1a1a]" : "text-[#1f7a4d]",
                  )}
                >
                  <MaterialIcon
                    name={down ? "trending_down" : "trending_up"}
                    size={14}
                  />
                  {deltaPct > 0 ? "+" : ""}
                  {deltaPct}% vs last
                </p>
              );
            })()}
          </div>
          <StatCard
            variant="compact"
            label="Last Month"
            value={formatCurrency(prev.gross)}
          />
          <StatCard
            variant="compact"
            label="Total Earnings"
            value={formatCurrency(total)}
            hint="last 12 months"
          />
          <StatCard
            variant="compact"
            label="Pending Payout"
            value={formatCurrency(pendingTotal)}
            hint={`${myPayouts.filter((p) => p.status !== "paid").length} transactions`}
          />
        </section>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Monthly Revenue"
            subtitle="Gross vs net (after fees)"
            className="lg:col-span-2"
          >
            <div className="h-[280px]">
              <ClientOnly
                fallback={
                  <div className="h-full w-full bg-surface-container-low rounded animate-pulse" />
                }
              >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mockEarnings}
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
                  />
                  <YAxis
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
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
                    dataKey="gross"
                    stroke="#3525cd"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3525cd" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#777587"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </ClientOnly>
            </div>
            <div className="flex items-center gap-4 text-body-sm text-on-surface-variant mt-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Gross
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-outline" />
                Net (after fees)
              </span>
            </div>
          </ChartCard>

          <ChartCard
            title="Sessions / Month"
            subtitle="Volume trend"
          >
            <div className="h-[280px]">
              <ClientOnly
                fallback={
                  <div className="h-full w-full bg-surface-container-low rounded animate-pulse" />
                }
              >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockEarnings}
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
                  />
                  <YAxis
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e8e8e5",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                    {mockEarnings.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === mockEarnings.length - 1
                            ? "#3525cd"
                            : "#c3c0ff"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </ClientOnly>
            </div>
          </ChartCard>
        </div>

        {/* Payouts table */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
            <h3 className="text-h3">Payout History</h3>
            <button className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
              <MaterialIcon name="file_download" size={16} />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-[var(--color-border-soft)] text-[11px] uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {mockPayouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 text-body-base">
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
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
