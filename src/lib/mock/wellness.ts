/**
 * Wellness / readiness mock data for the learner dashboard.
 *
 * Static and deterministic — a stand-in for a wearables/recovery API. Swap
 * via `src/lib/api.ts` when a real integration lands.
 */

export interface RecoveryMetric {
  key: string;
  label: string;
  icon: string;
  value: number;
  unit: string;
  /** Signed change vs. the 7-day baseline. */
  delta: number;
  /** Whether the change is good for the athlete (lower RHR is good, etc.). */
  deltaGood: boolean;
  /** Last 7 readings, oldest → newest. */
  trend: number[];
}

export interface LearnerWellness {
  readiness: number;
  readinessLabel: string;
  readinessNote: string;
  readinessTrend: number[];
  recommendation: {
    title: string;
    detail: string;
    confidence: number;
    durationMin: number;
  };
  recovery: RecoveryMetric[];
  /** Minutes trained per day this week, Mon → Sun. */
  weeklyTraining: number[];
  weeklyTrainingDelta: number;
}

export const learnerWellness: LearnerWellness = {
  readiness: 78,
  readinessLabel: "Primed to train",
  readinessNote:
    "Recovery is on track. A moderate session fits well — keep intensity controlled.",
  readinessTrend: [62, 70, 65, 71, 74, 69, 78],
  recommendation: {
    title: "15-minute mobility flow",
    detail:
      "Your HRV dipped slightly overnight. A low-intensity mobility session protects your 8-day streak while letting your nervous system recover for tomorrow's strength block.",
    confidence: 94,
    durationMin: 15,
  },
  recovery: [
    {
      key: "hrv",
      label: "HRV",
      icon: "ecg_heart",
      value: 62,
      unit: "ms",
      delta: -6,
      deltaGood: false,
      trend: [70, 67, 68, 64, 66, 63, 62],
    },
    {
      key: "sleep",
      label: "Sleep",
      icon: "bedtime",
      value: 7.4,
      unit: "h",
      delta: 5,
      deltaGood: true,
      trend: [6.6, 7.0, 7.5, 6.9, 7.2, 7.6, 7.4],
    },
    {
      key: "rhr",
      label: "Resting HR",
      icon: "cardiology",
      value: 54,
      unit: "bpm",
      delta: -3,
      deltaGood: true,
      trend: [57, 56, 58, 55, 56, 55, 54],
    },
  ],
  weeklyTraining: [40, 0, 55, 25, 45, 70, 30],
  weeklyTrainingDelta: 18,
};

/** Deterministic pseudo-random in [0, 1). */
function seeded(i: number) {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** 12 weeks × 7 days of training intensity (0–4) — newest week last. */
export const activityHeatmap: number[][] = Array.from({ length: 12 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const v = seeded(w * 7 + d) + w / 20;
    if (v < 0.34) return 0;
    if (v < 0.54) return 1;
    if (v < 0.72) return 2;
    if (v < 0.88) return 3;
    return 4;
  }),
);

export function getLearnerWellness() {
  return learnerWellness;
}
