import type { AnalyticsDailyPoint, ProgressMetric, ProgressTrendPoint } from "@/types";

function isoDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const seeded = (i: number) => {
  // deterministic pseudo-random in [0,1)
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export const mockDailyActiveUsers: AnalyticsDailyPoint[] = Array.from(
  { length: 30 },
  (_, i) => {
    const day = 29 - i;
    const base = 14_000 + i * 220;
    const noise = Math.round(seeded(i) * 1800);
    const activeUsers = base + noise;
    return {
      date: isoDate(day),
      activeUsers,
      sessions: Math.round(activeUsers * 0.18),
      revenue: Math.round(activeUsers * 1.45),
    };
  },
);

// ============================================================================
// Learner progress
// ============================================================================

export const mockProgressMetrics: ProgressMetric[] = [
  {
    id: "pm-1",
    learnerId: "learner-1",
    label: "Weekly Sessions",
    current: 4,
    target: 5,
    unit: "sessions",
  },
  {
    id: "pm-2",
    learnerId: "learner-1",
    label: "Mobility Score",
    current: 78,
    target: 90,
    unit: "/100",
  },
  {
    id: "pm-3",
    learnerId: "learner-1",
    label: "Sleep Avg",
    current: 7.4,
    target: 8,
    unit: "hrs",
  },
  {
    id: "pm-4",
    learnerId: "learner-1",
    label: "Streak",
    current: 8,
    target: 14,
    unit: "days",
  },
];

export const mockProgressTrend: ProgressTrendPoint[] = [
  { week: "W1", score: 62 },
  { week: "W2", score: 65 },
  { week: "W3", score: 68 },
  { week: "W4", score: 70 },
  { week: "W5", score: 71 },
  { week: "W6", score: 74 },
  { week: "W7", score: 76 },
  { week: "W8", score: 78 },
];

export function getDailyActiveUsers() {
  return mockDailyActiveUsers;
}

export function getProgressMetricsForLearner(learnerId: string) {
  return mockProgressMetrics.filter((m) => m.learnerId === learnerId);
}

export function getProgressTrend() {
  return mockProgressTrend;
}
