"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { cn } from "@/lib/utils";

interface Weight {
  id: string;
  label: string;
  value: number;
}

const DEFAULTS: Weight[] = [
  { id: "rating", label: "Coach Rating Weight", value: 85 },
  { id: "availability", label: "Availability Match", value: 40 },
  { id: "price", label: "Price Compatibility", value: 60 },
  { id: "experience", label: "Experience Weight", value: 55 },
  { id: "location", label: "Location Proximity", value: 30 },
  { id: "history", label: "Past Engagement", value: 70 },
];

const SAFETY_GUARDS = [
  {
    id: "g1",
    label: "Filter unverified coaches from suggestions",
    description: "Don't surface coaches still in verification queue.",
    enabled: true,
  },
  {
    id: "g2",
    label: "Block AI from auto-confirming paid sessions",
    description: "Require human approval before charging.",
    enabled: true,
  },
  {
    id: "g3",
    label: "Anonymize PII in training logs",
    description: "Strip names, emails and addresses before retraining.",
    enabled: true,
  },
  {
    id: "g4",
    label: "Log every AI recommendation",
    description: "Required for compliance auditing.",
    enabled: false,
  },
];

export default function AISettingsPage() {
  const [weights, setWeights] = useState<Weight[]>(DEFAULTS);
  const [guards, setGuards] = useState(SAFETY_GUARDS);
  const [model, setModel] = useState("balanced");

  const updateWeight = (id: string, value: number) =>
    setWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, value } : w)),
    );

  const toggleGuard = (id: string) =>
    setGuards((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)),
    );

  return (
    <AppShell role="admin" title="AI System Settings">
      <div className="max-w-[1400px] space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">AI System Settings</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Configure platform-wide intelligence and model parameters.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#1f7a4d] animate-pulse" />
            <span className="text-body-sm font-medium text-primary uppercase tracking-wider">
              System Operational
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Matching algorithm — big card */}
          <section className="lg:col-span-8 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] pb-3">
              <div className="flex items-center gap-2">
                <MaterialIcon
                  name="diversity_3"
                  size={22}
                  className="text-primary"
                />
                <h2 className="text-h2">Matching Algorithm</h2>
              </div>
              <button className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
                Retrain Model
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Adjust how the matching engine weighs each signal. Changes apply
              after retraining (typically 6–10 minutes).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {weights.map((w) => (
                <label key={w.id} className="block">
                  <div className="flex justify-between mb-1">
                    <span className="text-body-base font-medium">
                      {w.label}
                    </span>
                    <span className="text-body-sm text-primary font-medium">
                      {w.value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={w.value}
                    onChange={(e) =>
                      updateWeight(w.id, Number(e.target.value))
                    }
                    className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="border-t border-[var(--color-border-soft)] pt-4">
              <p className="text-h3 mb-2">Model preset</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      id: "accuracy",
                      label: "Accuracy-first",
                      desc: "Highest match quality, slower training",
                    },
                    {
                      id: "balanced",
                      label: "Balanced (recommended)",
                      desc: "Good trade-off for daily use",
                    },
                    {
                      id: "fresh",
                      label: "Freshness-first",
                      desc: "Bias toward newer coaches",
                    },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setModel(p.id)}
                    className={cn(
                      "flex-1 min-w-[200px] text-left p-3 rounded-[8px] border transition-colors",
                      model === p.id
                        ? "border-primary bg-primary/5"
                        : "border-[var(--color-border-soft)] hover:border-primary",
                    )}
                  >
                    <p
                      className={cn(
                        "text-body-base font-medium",
                        model === p.id && "text-primary",
                      )}
                    >
                      {p.label}
                    </p>
                    <p className="text-body-sm text-on-surface-variant mt-0.5">
                      {p.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Model status */}
          <aside className="lg:col-span-4 space-y-4">
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MaterialIcon
                  name="model_training"
                  size={20}
                  className="text-primary"
                />
                <h3 className="text-h3">Active Model</h3>
              </div>
              <KV label="Version" value="v3.2.1" />
              <KV label="Last trained" value="2026-05-12 06:14" />
              <KV label="Training samples" value="1.4M" />
              <KV label="Accuracy (test)" value="94.2%" highlight />
              <KV label="Avg inference" value="42ms" />
              <KV label="Region" value="us-east-1" />
            </section>

            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-3">
                <MaterialIcon
                  name="auto_awesome"
                  size={20}
                  className="text-primary"
                />
                <h3 className="text-h3">AI Coaching Assistant</h3>
              </div>
              <p className="text-body-sm text-on-surface-variant mb-3">
                The chat assistant available to learners and coaches.
              </p>
              <KV label="Daily messages" value="48,210" />
              <KV label="Satisfaction" value="4.6 / 5" highlight />
              <KV label="Fallback rate" value="2.1%" />
              <button className="mt-3 w-full px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low inline-flex items-center justify-center gap-1.5">
                <MaterialIcon name="settings" size={16} />
                Tune assistant
              </button>
            </section>
          </aside>
        </div>

        {/* Safety guardrails */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MaterialIcon name="security" size={20} className="text-primary" />
              <h2 className="text-h2">Safety Guardrails</h2>
            </div>
            <AIBadge label="Compliance" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {guards.map((g) => (
              <div
                key={g.id}
                className="flex items-start justify-between gap-3 p-3 border border-[var(--color-border-soft)] rounded-[6px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-base font-medium">{g.label}</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    {g.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleGuard(g.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5",
                    g.enabled
                      ? "bg-primary"
                      : "bg-surface-container-highest",
                  )}
                  aria-pressed={g.enabled}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                      g.enabled ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function KV({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-body-sm py-1.5 border-b border-[var(--color-border-soft)] last:border-b-0">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn(
          "text-right font-medium",
          highlight ? "text-primary" : "text-on-surface",
        )}
      >
        {value}
      </span>
    </div>
  );
}
