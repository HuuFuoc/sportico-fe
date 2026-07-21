"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  MapPin,
  Smartphone,
  Users,
} from "lucide-react";
import { ClientOnly } from "@/components/common/ClientOnly";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { cn, formatNumber } from "@/lib/utils";
import type { AdminAnalyticsDashboardResponse } from "@/lib/backend/dto";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Monday 00:00 of the week containing `d`, in local time. */
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Mon=0 … Sun=6
  return x;
}

/** "31/5" — compact enough to fit under a bar. */
function shortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Local calendar-day key. Deliberately not toISOString(), which shifts to UTC
 * and would file late-evening hits under the following day for VN (UTC+7).
 */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/** One analytics request, shared by the two cards that render from it. */
type AnalyticsResource = {
  data: AdminAnalyticsDashboardResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

/**
 * Visitor analytics block — GET /api/admin/analytics/dashboard.
 *
 * Fetches once and feeds both cards. The aggregate endpoint returns every
 * section in a single round-trip, so there is no reason to hit the seven
 * granular endpoints here.
 */
export function VisitorAnalyticsSection({ reduce }: { reduce: boolean }) {
  const analytics = useApiResource(() => api.fetchVisitorAnalytics(), []);
  const d = analytics.data;

  // Decide layout up front: without an audience column a 2-col grid would
  // leave a visible hole, so the traffic card goes full width instead.
  const hasAudience = Boolean(
    d &&
      ((d.devices?.length ?? 0) > 0 ||
        (d.browsers?.length ?? 0) > 0 ||
        (d.countries?.length ?? 0) > 0),
  );

  return (
    <section
      className={cn(
        "grid gap-4 sm:gap-5",
        hasAudience ? "grid-cols-1 lg:grid-cols-[1.6fr_1fr]" : "grid-cols-1",
      )}
    >
      <VisitorTraffic analytics={analytics} reduce={reduce} />
      {hasAudience && (
        <AudienceBreakdown analytics={analytics} reduce={reduce} />
      )}
    </section>
  );
}

// ============================================================================
// Visitor traffic — stats, trend chart, new/returning split, top pages
// ============================================================================

function VisitorTraffic({
  analytics,
  reduce,
}: {
  analytics: AnalyticsResource;
  reduce: boolean;
}) {
  const { data, loading, error, refetch } = analytics;

  // Split the backend's daily series into calendar weeks (Mon–Sun), one page
  // per week. Every week is padded to a full 7 days so the bar layout stays
  // identical while paging and gaps read as real zeros, not missing columns.
  //
  // Page views sum exactly. Visitors do NOT — someone active on three days is
  // three daily uniques but one weekly unique — so the week total is a sum of
  // daily uniques and the UI labels it as such.
  const weeks = useMemo(() => {
    const daily = new Map<string, { visitors: number; views: number }>();
    let min: Date | null = null;
    let max: Date | null = null;

    for (const p of data?.visitorsChart ?? []) {
      const at = new Date(p.periodStart);
      if (Number.isNaN(at.getTime())) continue; // ignore unparseable timestamps
      const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
      const key = dayKey(day);
      const prev = daily.get(key) ?? { visitors: 0, views: 0 };
      daily.set(key, {
        visitors: prev.visitors + p.visitorCount,
        views: prev.views + p.pageViewCount,
      });
      if (!min || day < min) min = day;
      if (!max || day > max) max = day;
    }

    if (!min || !max) return [];

    const out = [];
    const lastWeek = startOfWeek(max);
    for (
      let cursor = startOfWeek(min);
      cursor <= lastWeek;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
    ) {
      const start = new Date(cursor);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const days = DAY_LABELS.map((label, i) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const v = daily.get(dayKey(d)) ?? { visitors: 0, views: 0 };
        return { label, date: shortDate(d), ...v };
      });
      out.push({
        range: `${shortDate(start)} – ${shortDate(end)}`,
        views: days.reduce((s, d) => s + d.views, 0),
        visitors: days.reduce((s, d) => s + d.visitors, 0),
        days,
      });
    }
    return out;
  }, [data]);

  // null = "follow the latest week". Keeping it null rather than syncing an
  // effect means the newest week stays selected when data arrives or refreshes,
  // while an explicit choice by the user is preserved.
  const [weekIndex, setWeekIndex] = useState<number | null>(null);
  const activeIndex =
    weeks.length === 0
      ? -1
      : Math.min(Math.max(weekIndex ?? weeks.length - 1, 0), weeks.length - 1);
  const activeWeek = activeIndex >= 0 ? weeks[activeIndex] : null;

  const topPages = (data?.topPages ?? []).slice(0, 5);
  const stats = data?.visitorStats;
  const views = data?.pageViewStats;
  // Split bar: share of visitors who had been here before.
  const knownMix = stats ? stats.newVisitors + stats.returningVisitors : 0;
  const newPct = knownMix > 0 ? (stats!.newVisitors / knownMix) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.2, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-white shadow-[0_4px_12px_-3px_rgba(53,37,205,0.4)]">
            <Globe size={16} strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight leading-none">
              Lượt truy cập
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Toàn bộ thời gian · theo tuần
            </p>
          </div>
        </div>
        {stats && stats.activeVisitors > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {formatNumber(stats.activeVisitors)} online
          </span>
        )}
      </div>

      {loading ? (
        <LoadingState label="Đang tải lượt truy cập…" className="py-10" />
      ) : error ? (
        <ErrorState
          message="Không tải được dữ liệu truy cập."
          onRetry={refetch}
        />
      ) : !stats || !views ? (
        // Mock mode: traffic only exists on a deployed site, so there is no
        // fixture — say so rather than showing invented numbers.
        <p className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-center text-[12px] text-on-surface-variant">
          Cần kết nối backend để xem lượt truy cập.
        </p>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
                <Users size={11} className="text-primary" />
                Khách truy cập
              </div>
              <p className="text-[24px] font-bold tracking-tight tabular-nums mt-1 leading-none">
                {formatNumber(stats.totalVisitors)}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
                <Eye size={11} className="text-[#7c3aed]" />
                Lượt xem
              </div>
              <p className="text-[24px] font-bold tracking-tight tabular-nums mt-1 leading-none">
                {formatNumber(views.totalPageViews)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
            Hôm nay{" "}
            <span className="font-semibold tabular-nums text-on-surface">
              {formatNumber(stats.todayVisitors)}
            </span>{" "}
            khách ·{" "}
            <span className="font-semibold tabular-nums text-on-surface">
              {formatNumber(views.todayPageViews)}
            </span>{" "}
            lượt xem · TB{" "}
            <span className="font-semibold tabular-nums text-on-surface">
              {views.averagePageViewsPerSession.toFixed(1)}
            </span>{" "}
            trang/phiên
          </p>

          {/* Week navigator */}
          {activeWeek && (
            <div className="flex items-center justify-between gap-2 mb-2 rounded-[12px] bg-surface-container-low px-2 py-1.5">
              <button
                type="button"
                onClick={() => setWeekIndex(activeIndex - 1)}
                disabled={activeIndex <= 0}
                aria-label="Tuần trước"
                className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="min-w-0 text-center">
                <p className="text-[12.5px] font-semibold tabular-nums leading-none truncate">
                  {activeWeek.range}
                </p>
                <p className="text-[10.5px] text-on-surface-variant mt-1 tabular-nums">
                  {formatNumber(activeWeek.views)} lượt xem ·{" "}
                  {formatNumber(activeWeek.visitors)} khách
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWeekIndex(activeIndex + 1)}
                disabled={activeIndex >= weeks.length - 1}
                aria-label="Tuần sau"
                className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Chart. Only the right edge may bleed — a negative LEFT margin
              clips the Y-axis labels. */}
          {activeWeek ? (
            <div className="h-[180px] -mr-2">
              <ClientOnly fallback={<div className="h-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeWeek.days}
                    margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="visitorBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop
                          offset="100%"
                          stopColor="#4f46e5"
                          stopOpacity={0.7}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#e8e8e5"
                      strokeDasharray="4 6"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#777587"
                      fontSize={10.5}
                      tickLine={false}
                      axisLine={false}
                      dy={4}
                      // Exactly 7 bars — always label every day.
                      interval={0}
                    />
                    <YAxis
                      stroke="#777587"
                      fontSize={10.5}
                      tickLine={false}
                      axisLine={false}
                      // Wide enough for 3 digits; 4-digit values are shortened
                      // by the formatter below so the axis never grows.
                      width={34}
                      allowDecimals={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(79, 70, 229, 0.07)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as {
                          label: string;
                          date: string;
                          visitors: number;
                          views: number;
                        };
                        return (
                          <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] px-3 py-2 shadow-[0_8px_20px_-8px_rgba(15,15,30,0.18)]">
                            <p className="text-[10.5px] uppercase tracking-wider text-on-surface-variant font-semibold">
                              {p.label} · {p.date}
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
                    <Bar
                      dataKey="views"
                      fill="url(#visitorBar)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      isAnimationActive={!reduce}
                      animationDuration={reduce ? 0 : 900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          ) : (
            <p className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] px-4 py-5 text-center text-[11.5px] text-on-surface-variant">
              Chưa đủ dữ liệu để vẽ biểu đồ.
            </p>
          )}

          {/* New vs returning */}
          {knownMix > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant mb-1.5">
                <span>Mới {formatNumber(stats.newVisitors)}</span>
                <span>Quay lại {formatNumber(stats.returningVisitors)}</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-container-low">
                <div className="bg-primary" style={{ width: `${newPct}%` }} />
                <div
                  className="bg-[#8b5cf6]"
                  style={{ width: `${100 - newPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Top pages */}
          {topPages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)]">
              <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                Trang xem nhiều nhất
              </p>
              <ul className="space-y-1.5">
                {topPages.map((p) => (
                  <li
                    key={p.path}
                    className="flex items-center justify-between gap-3 text-[12px]"
                  >
                    <span
                      className="truncate font-medium text-on-surface"
                      title={p.path}
                    >
                      {p.path}
                    </span>
                    <span className="shrink-0 tabular-nums text-on-surface-variant">
                      {formatNumber(p.viewCount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ============================================================================
// Audience breakdown — devices / browsers / countries
// ============================================================================

function AudienceBreakdown({
  analytics,
  reduce,
}: {
  analytics: AnalyticsResource;
  reduce: boolean;
}) {
  const { data } = analytics;

  const groups = [
    {
      label: "Thiết bị",
      icon: Smartphone,
      rows: (data?.devices ?? []).map((d) => ({
        name: d.device,
        count: d.count,
        pct: d.percentage,
      })),
    },
    {
      label: "Trình duyệt",
      icon: AppWindow,
      rows: (data?.browsers ?? []).map((b) => ({
        name: b.browser,
        count: b.count,
        pct: b.percentage,
      })),
    },
    {
      label: "Quốc gia",
      icon: MapPin,
      rows: (data?.countries ?? []).map((c) => ({
        name: c.country,
        count: c.count,
        pct: c.percentage,
      })),
    },
  ].filter((g) => g.rows.length > 0);

  // Nothing to say yet — stay out of the way rather than render empty shells.
  if (groups.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.26, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[15px] font-semibold tracking-tight mb-4">
        Người truy cập
      </h3>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
              <g.icon size={11} className="text-primary" />
              {g.label}
            </p>
            <ul className="space-y-2">
              {g.rows.slice(0, 4).map((r) => (
                <li key={r.name}>
                  <div className="flex items-center justify-between gap-3 text-[12px] mb-1">
                    <span className="truncate font-medium text-on-surface">
                      {r.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-on-surface-variant">
                      {r.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
                      style={{ width: `${Math.min(100, r.pct)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
