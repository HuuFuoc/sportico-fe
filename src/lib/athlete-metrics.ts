import type { Learner } from "@/types";

/**
 * Derived athlete-performance metrics for the coaching workspace.
 *
 * The mock `Learner` only carries a few raw fields, so the richer signals a
 * coach needs (readiness, recovery, risk, trends…) are *derived* here.
 * Everything is computed from a deterministic string hash — never
 * `Math.random()` or `Date.now()` — so server and client render identically
 * and the numbers stay stable across reloads.
 */

function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, Math.round(n)));

export type RiskLevel = "on-track" | "watch" | "at-risk";
export type TrainingLoad = "Low" | "Optimal" | "High";

export interface AthleteMetrics {
  /** Daily readiness score 0–100. */
  readiness: number;
  /** Recovery score 0–100. */
  recovery: number;
  /** Engagement score 0–100. */
  engagement: number;
  /** Training-load state. */
  load: TrainingLoad;
  risk: RiskLevel;
  riskLabel: string;
  /** 7-point weekly performance trend (for the sparkline). */
  trend: number[];
  /** Signed % change across the trend window. */
  trendDelta: number;
  /** 14-day training-consistency strip. */
  consistency: boolean[];
  /** AI confidence in the recommendation 0–100. */
  confidence: number;
}

export function getAthleteMetrics(l: Learner): AthleteMetrics {
  const a = seeded(l.id + "rdy");
  const b = seeded(l.id + "rcv");
  const c = seeded(l.id + "eng");
  const d = seeded(l.id + "trd");

  const readiness = clamp(
    50 + l.streakDays * 1.15 + ((l.matchRate ?? 75) - 78) * 0.55 + a * 20,
  );
  const recovery = clamp(
    46 + ((l.matchRate ?? 70) - 70) * 0.5 + (l.streakDays % 10) * 2.2 + b * 24,
  );
  const engagement = clamp(
    38 + l.upcomingSessions * 8 + l.streakDays * 1.5 + c * 20,
  );

  const load: TrainingLoad =
    readiness < 58 ? "High" : engagement < 52 ? "Low" : "Optimal";

  // Weekly trend — 7-point readiness curve; most improving, some declining.
  // Slope is kept gentle so the week-over-week delta stays realistic.
  const direction = d > 0.42 ? 1 : -1;
  const slope = direction * (0.6 + d * 1.5);
  const trend = Array.from({ length: 7 }, (_, i) => {
    const noise = seeded(l.id + "t" + i) * 5 - 2.5;
    return clamp(readiness - slope * (6 - i) + noise, 30, 99);
  });
  // Signed point change across the week.
  const trendDelta = trend[6] - trend[0];

  let risk: RiskLevel = "on-track";
  if (readiness < 58 || engagement < 48 || trendDelta <= -8) risk = "at-risk";
  else if (readiness < 72 || recovery < 60 || trendDelta < 0) risk = "watch";
  const riskLabel =
    risk === "at-risk" ? "At risk" : risk === "watch" ? "Watch" : "On track";

  const consistency = Array.from(
    { length: 14 },
    (_, i) => seeded(l.id + "c" + i) < engagement / 108,
  );

  const confidence = clamp(84 + d * 14, 84, 98);

  return {
    readiness,
    recovery,
    engagement,
    load,
    risk,
    riskLabel,
    trend,
    trendDelta,
    consistency,
    confidence,
  };
}
