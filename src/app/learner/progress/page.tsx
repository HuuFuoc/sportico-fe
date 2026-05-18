"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { StatCard } from "@/components/common/StatCard";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import {
  getProgressMetricsForLearner,
  getProgressTrend,
} from "@/lib/mock/analytics";
import { getInsightsForRole } from "@/lib/mock/insights";
import { getLearnerById } from "@/lib/mock/users";

const ACHIEVEMENTS = [
  { id: "a1", icon: "local_fire_department", label: "8-day streak", color: "amber" },
  { id: "a2", icon: "directions_run", label: "10K Hours Club", color: "primary" },
  { id: "a3", icon: "workspace_premium", label: "Top 5% mobility", color: "primary" },
  { id: "a4", icon: "psychology", label: "AI plan adopter", color: "primary" },
];

export default function LearnerProgressPage() {
  const learner = getLearnerById("learner-1")!;
  const metrics = getProgressMetricsForLearner(learner.id);
  const trend = getProgressTrend();
  const insights = getInsightsForRole("learner");

  return (
    <AppShell role="learner" title="My Progress">
      <div className="max-w-[1200px] space-y-5">
        <header>
          <h1 className="text-h1">My Progress</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Track sessions, recovery and fitness gains over time.
          </p>
        </header>

        {/* KPI row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="compact"
            label="Total Hours"
            value={learner.totalHoursTrained}
            trend={{ value: "+12%", direction: "up" }}
            hint="vs last month"
          />
          <StatCard
            variant="compact"
            label="Streak"
            value={`${learner.streakDays}d`}
            trend={{ value: "Personal best", direction: "up" }}
          />
          <StatCard
            variant="compact"
            label="AI Match Rate"
            value={`${learner.matchRate}%`}
            trend={{ value: "+2%", direction: "up" }}
          />
          <StatCard
            variant="compact"
            label="Upcoming"
            value={learner.upcomingSessions}
            hint="sessions this week"
          />
        </section>

        {insights[1] && <AIInsightBanner insight={insights[1]} />}

        {/* Trend chart */}
        <ChartCard
          title="Fitness Score Trend"
          subtitle="Composite score across mobility, strength, conditioning."
          action={
            <div className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Last 8 weeks
            </div>
          }
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ left: -10, right: 6, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="scoreGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#e8e8e5"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="week"
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
                  domain={[40, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e8e8e5",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Metrics + achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
              <h3 className="text-h3">Goal Progress</h3>
            </div>
            <div className="divide-y divide-[var(--color-border-soft)]">
              {metrics.map((m) => {
                const pct = Math.min(100, (m.current / m.target) * 100);
                return (
                  <div key={m.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-body-base font-medium">{m.label}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        <span className="text-on-surface font-medium">
                          {m.current}
                        </span>{" "}
                        / {m.target} {m.unit}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
              <h3 className="text-h3">Achievements</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col items-center text-center p-3 rounded-[8px] bg-surface-container-low"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                      a.color === "amber"
                        ? "bg-amber-50 text-amber-500"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <MaterialIcon name={a.icon} filled size={20} />
                  </div>
                  <p className="text-body-sm font-medium">{a.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
