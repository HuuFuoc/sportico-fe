"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ChartCard } from "@/components/common/ChartCard";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { mockDailyActiveUsers } from "@/lib/mock/analytics";
import { getInsightsForRole, mockVerifications } from "@/lib/mock/insights";
import { mockCoaches, mockLearners } from "@/lib/mock/users";

const TOTAL_USERS = 24_592;
const ACTIVE_COACHES = 1_204;
const SESSIONS_TODAY = 452;
const PLATFORM_REVENUE_MTD = 842_000;
const AI_ACCURACY = 94.2;

export default function AdminDashboardPage() {
  const insights = getInsightsForRole("admin");
  const dau = mockDailyActiveUsers;
  const todayDAU = dau[dau.length - 1].activeUsers;
  const recentCoaches = mockCoaches.slice(0, 4);
  const recentLearners = mockLearners.slice(0, 4);

  return (
    <AppShell role="admin" title="Admin Dashboard">
      <div className="space-y-5 max-w-[1500px]">
        <header>
          <h1 className="text-h1">Platform Overview</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Real-time analytics across users, sessions and revenue.
          </p>
        </header>

        {insights[0] && <AIInsightBanner insight={insights[0]} />}

        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Kpi
            label="Total Users"
            value={formatNumber(TOTAL_USERS)}
            delta="+12% inc."
            deltaColor="success"
            icon="trending_up"
          />
          <Kpi
            label="Active Coaches"
            value={formatNumber(ACTIVE_COACHES)}
            delta="84 new this week"
            deltaColor="primary"
            icon="person_add"
          />
          <Kpi
            label="Sessions Today"
            value={formatNumber(SESSIONS_TODAY)}
            delta="Peak: 14:00"
            deltaColor="neutral"
            icon="schedule"
          />
          <Kpi
            label="Revenue MTD"
            value={formatCurrency(PLATFORM_REVENUE_MTD)}
            delta="+18% MoM"
            deltaColor="success"
            icon="payments"
          />
          <Kpi
            label="AI Match Accuracy"
            value={`${AI_ACCURACY}%`}
            delta="+1.1% w/w"
            deltaColor="primary"
            icon="auto_awesome"
          />
        </section>

        {/* Main chart + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <ChartCard
            title="Daily Active Users"
            subtitle="Past 30 days · current day highlighted"
            className="lg:col-span-8"
            action={
              <span className="text-body-sm text-on-surface-variant">
                Today:{" "}
                <span className="text-on-surface font-medium">
                  {formatNumber(todayDAU)}
                </span>
              </span>
            }
          >
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dau}
                  margin={{ left: -10, right: 6, top: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#e8e8e5"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#777587"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    stroke="#777587"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e8e8e5",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => formatNumber(Number(v))}
                  />
                  <Bar dataKey="activeUsers" radius={[3, 3, 0, 0]}>
                    {dau.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === dau.length - 1 ? "#3525cd" : "#c3c0ff"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Verification queue summary */}
          <section className="lg:col-span-4 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-h3">Pending Verifications</h3>
              <Link
                href="/admin/verifications"
                className="text-body-sm text-primary hover:underline"
              >
                All →
              </Link>
            </div>
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {mockVerifications.slice(0, 4).map((v) => (
                <li
                  key={v.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                >
                  <img
                    src={v.coachAvatar}
                    alt={v.coachName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-medium truncate">
                      {v.coachName}
                    </p>
                    <p className="text-body-sm text-on-surface-variant truncate">
                      {v.sport} · {v.documents.length} docs
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] uppercase tracking-wider font-medium">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Recent activity row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentList
            title="New Coaches"
            href="/admin/users"
            items={recentCoaches.map((c) => ({
              id: c.id,
              avatar: c.avatarUrl,
              name: c.name,
              sub: `${c.sport} · joined ${new Date(c.joinedAt).toLocaleDateString()}`,
              badge: c.verified ? "Verified" : "Unverified",
              badgeColor: c.verified ? "success" : "neutral",
            }))}
          />
          <RecentList
            title="New Learners"
            href="/admin/users"
            items={recentLearners.map((l) => ({
              id: l.id,
              avatar: l.avatarUrl,
              name: l.name,
              sub: `${l.preferredSports[0] ?? "—"} · joined ${new Date(l.joinedAt).toLocaleDateString()}`,
              badge: `${l.totalHoursTrained}h`,
              badgeColor: "primary",
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaColor,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  deltaColor: "success" | "primary" | "neutral";
  icon: string;
}) {
  const color =
    deltaColor === "success"
      ? "text-[#1f7a4d]"
      : deltaColor === "primary"
        ? "text-primary"
        : "text-on-surface-variant";
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
        {label}
      </p>
      <p className="text-h1 mt-1" style={{ letterSpacing: "-0.02em" }}>
        {value}
      </p>
      <p
        className={`text-body-sm mt-1 inline-flex items-center gap-1 ${color}`}
      >
        <MaterialIcon name={icon} size={14} />
        {delta}
      </p>
    </div>
  );
}

function RecentList({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: {
    id: string;
    avatar: string;
    name: string;
    sub: string;
    badge: string;
    badgeColor: "success" | "primary" | "neutral";
  }[];
}) {
  return (
    <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]">
      <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <h3 className="text-h3">{title}</h3>
        <Link href={href} className="text-body-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {items.map((it) => {
          const badgeStyle =
            it.badgeColor === "success"
              ? "bg-[#d1f4dd] text-[#1f7a4d]"
              : it.badgeColor === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-surface-container-high text-on-surface-variant";
          return (
            <li
              key={it.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
            >
              <img
                src={it.avatar}
                alt={it.name}
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-body-base font-medium truncate">
                  {it.name}
                </p>
                <p className="text-body-sm text-on-surface-variant truncate">
                  {it.sub}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${badgeStyle}`}
              >
                {it.badge}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
