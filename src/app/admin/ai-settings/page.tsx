"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Beaker,
  Bot,
  Brain,
  Check,
  ChevronRight,
  CircleDot,
  Clock,
  Cpu,
  Database,
  FileBarChart,
  FileText,
  FlaskConical,
  GitBranch,
  GitCommit,
  History,
  Info,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  Play,
  Radio,
  RotateCcw,
  Save,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// Domain
// ============================================================================

type Env = "production" | "canary" | "staging" | "sandbox";

interface Signal {
  id: string;
  label: string;
  desc: string;
  value: number;
  default: number;
  impact: {
    match: number;
    repeat: number;
    diversity: number;
  };
  confidence: number;
}

const SIGNAL_DEFAULTS: Signal[] = [
  {
    id: "rating",
    label: "Coach Rating Weight",
    desc: "Bias toward higher-rated coaches",
    value: 85,
    default: 85,
    impact: { match: 12, repeat: 9, diversity: -4 },
    confidence: 92,
  },
  {
    id: "availability",
    label: "Availability Match",
    desc: "Prefer coaches with open slots in 7d",
    value: 40,
    default: 40,
    impact: { match: 5, repeat: 7, diversity: 2 },
    confidence: 88,
  },
  {
    id: "price",
    label: "Price Compatibility",
    desc: "Match learner budget bands",
    value: 60,
    default: 60,
    impact: { match: 8, repeat: 4, diversity: -2 },
    confidence: 84,
  },
  {
    id: "experience",
    label: "Experience Weight",
    desc: "Weight years of coaching",
    value: 55,
    default: 55,
    impact: { match: 7, repeat: 3, diversity: -1 },
    confidence: 86,
  },
  {
    id: "location",
    label: "Location Proximity",
    desc: "Prefer geographically close coaches",
    value: 30,
    default: 30,
    impact: { match: 3, repeat: 2, diversity: 4 },
    confidence: 78,
  },
  {
    id: "history",
    label: "Past Engagement",
    desc: "Boost coaches with positive history",
    value: 70,
    default: 70,
    impact: { match: 10, repeat: 14, diversity: -7 },
    confidence: 94,
  },
];

const GUARDS = [
  {
    id: "g1",
    label: "Filter unverified coaches",
    desc: "Don't surface coaches still in verification queue.",
    enabled: true,
    severity: "low" as const,
    compliance: null,
  },
  {
    id: "g2",
    label: "Block auto-confirm paid sessions",
    desc: "Require human approval before charging.",
    enabled: true,
    severity: "high" as const,
    compliance: "PCI DSS · §4.2",
  },
  {
    id: "g3",
    label: "Anonymize PII in training logs",
    desc: "Strip names, emails and addresses before retraining.",
    enabled: true,
    severity: "critical" as const,
    compliance: "GDPR Art. 25",
  },
  {
    id: "g4",
    label: "Log every AI recommendation",
    desc: "Required for compliance auditing.",
    enabled: false,
    severity: "med" as const,
    compliance: "SOC 2 CC7.3",
  },
  {
    id: "g5",
    label: "Hallucination guard on chat",
    desc: "Block low-confidence assistant responses.",
    enabled: true,
    severity: "high" as const,
    compliance: "Internal AUP",
  },
  {
    id: "g6",
    label: "Bias drift detection",
    desc: "Flag demographic ranking skew automatically.",
    enabled: true,
    severity: "high" as const,
    compliance: "EU AI Act Art. 9",
  },
];

const RISK_ALERTS = [
  {
    severity: "high" as const,
    icon: TrendingDown,
    title: "Recommendation diversity dropping",
    body: "Top-10 results 18% less diverse vs 7-day baseline.",
    metric: "Diversity index 0.71 → 0.58",
    age: "12m",
  },
  {
    severity: "med" as const,
    icon: AlertTriangle,
    title: "Fallback rate elevated",
    body: "Assistant escalations to humans up 2.4%.",
    metric: "2.1% → 4.5%",
    age: "1h",
  },
  {
    severity: "med" as const,
    icon: Activity,
    title: "Inference latency spike",
    body: "p99 above 380ms in us-east-1 for 14m.",
    metric: "p99 380ms",
    age: "14m",
  },
  {
    severity: "info" as const,
    icon: Info,
    title: "Model drift trending up",
    body: "Population stability index increasing.",
    metric: "PSI 0.18",
    age: "6h",
  },
];

const ACTIVITY_FEED = [
  {
    icon: GitCommit,
    label: "v3.2.1 deployed to production",
    meta: "By admin · 2h ago",
    tone: "good" as const,
  },
  {
    icon: Beaker,
    label: "Shadow test started: rating_v2",
    meta: "Running on 12% traffic",
    tone: "info" as const,
  },
  {
    icon: ShieldAlert,
    label: "Guardrail enabled: Hallucination guard",
    meta: "By compliance@",
    tone: "info" as const,
  },
  {
    icon: AlertTriangle,
    label: "Latency alert resolved",
    meta: "us-east-1 · 38m ago",
    tone: "good" as const,
  },
  {
    icon: GitBranch,
    label: "Canary v3.2.2 promoted to 25%",
    meta: "Auto · health checks passed",
    tone: "info" as const,
  },
];

const DEPLOY_HISTORY = [
  {
    version: "v3.2.1",
    env: "production",
    time: "Today 06:14",
    samples: "1.4M",
    accuracy: 94.2,
    by: "ops@",
    status: "active" as const,
  },
  {
    version: "v3.2.0",
    env: "production",
    time: "May 8 11:30",
    samples: "1.3M",
    accuracy: 93.4,
    by: "ops@",
    status: "rolled-back" as const,
  },
  {
    version: "v3.1.8",
    env: "production",
    time: "May 2 09:12",
    samples: "1.3M",
    accuracy: 92.9,
    by: "auto",
    status: "archived" as const,
  },
];

// ============================================================================
// Helpers
// ============================================================================

function seedSpark(seed: number, base: number, jitter: number, len = 16) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.3 + seed) * jitter;
    return { i, v: Math.max(0, base + noise) };
  });
}

const ENV_META: Record<
  Env,
  { label: string; dot: string; bg: string; tone: string }
> = {
  production: {
    label: "Production",
    dot: "bg-[#10b981]",
    bg: "bg-success-container",
    tone: "text-[#1f7a4d]",
  },
  canary: {
    label: "Canary",
    dot: "bg-[#f59e0b]",
    bg: "bg-[#fff5d6]",
    tone: "text-[#b95000]",
  },
  staging: {
    label: "Staging",
    dot: "bg-primary",
    bg: "bg-primary/10",
    tone: "text-primary",
  },
  sandbox: {
    label: "Sandbox",
    dot: "bg-[#94a3b8]",
    bg: "bg-surface-container-low",
    tone: "text-on-surface-variant",
  },
};

// ============================================================================
// Page
// ============================================================================

export default function AISettingsPage() {
  const reduce = useReducedMotion();
  const [env, setEnv] = useState<Env>("production");
  const [preset, setPreset] = useState("balanced");
  const [signals, setSignals] = useState<Signal[]>(SIGNAL_DEFAULTS);
  const [guards, setGuards] = useState(GUARDS);
  const [shadow, setShadow] = useState(false);
  const [trafficPct, setTrafficPct] = useState(12);
  const [deployOpen, setDeployOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const updateSignal = (id: string, value: number) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value } : s)),
    );
    setDirty(true);
  };

  const toggleGuard = (id: string) => {
    setGuards((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)),
    );
    setDirty(true);
  };

  const resetSignals = () => {
    setSignals(SIGNAL_DEFAULTS);
    setDirty(false);
  };

  // Aggregate projected impact
  const projected = useMemo(() => {
    const sum = signals.reduce(
      (acc, s) => {
        const factor = (s.value - s.default) / 100;
        acc.match += s.impact.match * factor;
        acc.repeat += s.impact.repeat * factor;
        acc.diversity += s.impact.diversity * factor;
        return acc;
      },
      { match: 0, repeat: 0, diversity: 0 },
    );
    return {
      match: Number(sum.match.toFixed(1)),
      repeat: Number(sum.repeat.toFixed(1)),
      diversity: Number(sum.diversity.toFixed(1)),
    };
  }, [signals]);

  return (
    <AppShell role="admin" title="AI Ops Control Center">
      <div className="max-w-[1500px] mx-auto pb-24 space-y-4">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10.5px] font-semibold border border-primary/15">
                <Brain size={10} />
                AI Ops Control Center
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#1f7a4d]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                All systems operational
              </span>
              <span className="text-[10.5px] text-on-surface-variant">·</span>
              <span className="text-[10.5px] text-on-surface-variant tabular-nums">
                Model v3.2.1 · region us-east-1
              </span>
            </div>
            <h1 className="text-[26px] sm:text-[30px] leading-[1.1] font-bold tracking-tight">
              Intelligence &amp; Models
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Tune, simulate, deploy, and govern platform-wide ML.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <EnvSwitcher env={env} setEnv={setEnv} reduce={reduce ?? false} />
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-semibold transition-colors">
              <History size={12} />
              Audit log
            </button>
            <button
              onClick={resetSignals}
              disabled={!dirty}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12px] font-semibold transition-colors disabled:opacity-50"
            >
              <Undo2 size={12} />
              Reset
            </button>
            <button
              onClick={() => setDeployOpen(true)}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary text-[12px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.35)] hover:bg-[#3a2db5] transition-colors"
            >
              <Play size={11} strokeWidth={2.5} />
              Deploy
            </button>
          </div>
        </motion.header>

        {/* ============ LIVE TELEMETRY STRIP ============ */}
        <TelemetryStrip />

        {/* ============ 3-COLUMN OPS LAYOUT ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr_340px] gap-4">
          {/* ============ LEFT: Model config ============ */}
          <div className="space-y-3 min-w-0">
            <ActiveModelCard env={env} />
            <PresetCard preset={preset} setPreset={setPreset} dirty={() => setDirty(true)} />
            <FeatureImportance signals={signals} reduce={reduce ?? false} />
            <DeploymentTargeting trafficPct={trafficPct} setTrafficPct={setTrafficPct} />
          </div>

          {/* ============ CENTER: Tuning + Simulation ============ */}
          <div className="space-y-3 min-w-0">
            {/* Projected impact strip */}
            <ProjectedImpact projected={projected} />

            {/* Signal weights with explainability */}
            <SignalsPanel
              signals={signals}
              updateSignal={updateSignal}
              reduce={reduce ?? false}
            />

            {/* Simulation: ranking before/after */}
            <SimulationPanel
              signals={signals}
              shadow={shadow}
              setShadow={(v) => {
                setShadow(v);
                setDirty(true);
              }}
              reduce={reduce ?? false}
            />

            {/* Experiment tracking */}
            <ExperimentTracker reduce={reduce ?? false} />
          </div>

          {/* ============ RIGHT: Observability + Governance ============ */}
          <aside className="space-y-3">
            <RiskCenter reduce={reduce ?? false} />
            <Governance guards={guards} toggleGuard={toggleGuard} />
            <ActivityFeed />
            <DeployHistory />
          </aside>
        </div>
      </div>

      {/* ============ DEPLOY MODAL ============ */}
      <AnimatePresence>
        {deployOpen && (
          <DeployModal
            env={env}
            onClose={() => setDeployOpen(false)}
            onConfirm={() => {
              setDeployOpen(false);
              setDirty(false);
            }}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>

      {/* ============ STICKY SAVE BAR ============ */}
      <AnimatePresence>
        {dirty && (
          <SaveBar
            onDiscard={resetSignals}
            onDeploy={() => setDeployOpen(true)}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ============================================================================
// Env switcher
// ============================================================================

function EnvSwitcher({
  env,
  setEnv,
  reduce,
}: {
  env: Env;
  setEnv: (e: Env) => void;
  reduce: boolean;
}) {
  const ENVS: Env[] = ["production", "canary", "staging", "sandbox"];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-container-low rounded-md border border-[var(--color-border-soft)]">
      {ENVS.map((e) => {
        const meta = ENV_META[e];
        return (
          <button
            key={e}
            onClick={() => setEnv(e)}
            className={cn(
              "relative inline-flex items-center gap-1 px-2 h-7 text-[11px] font-semibold rounded-[5px] transition-colors",
              env === e
                ? "text-on-surface"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {env === e && (
              <motion.span
                layoutId="envPill"
                className="absolute inset-0 bg-surface-container-lowest rounded-[5px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                transition={{
                  type: "spring",
                  duration: reduce ? 0 : 0.35,
                  bounce: 0.2,
                }}
              />
            )}
            <span className="relative inline-flex items-center gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Telemetry strip
// ============================================================================

const TELEMETRY = [
  {
    label: "Inference p95",
    value: "142ms",
    delta: "−4ms",
    deltaDir: "down" as const,
    spark: seedSpark(1, 140, 12),
    color: "#10b981",
    tone: "good" as const,
  },
  {
    label: "Throughput",
    value: "8.4K rps",
    delta: "+6%",
    deltaDir: "up" as const,
    spark: seedSpark(2, 8000, 600),
    color: "#4f46e5",
    tone: "neutral" as const,
  },
  {
    label: "Fallback rate",
    value: "2.1%",
    delta: "+0.3 pp",
    deltaDir: "up" as const,
    spark: seedSpark(3, 2.0, 0.4),
    color: "#f59e0b",
    tone: "warn" as const,
  },
  {
    label: "Drift (PSI)",
    value: "0.18",
    delta: "+0.04",
    deltaDir: "up" as const,
    spark: seedSpark(4, 0.16, 0.04),
    color: "#f59e0b",
    tone: "warn" as const,
  },
  {
    label: "Error rate",
    value: "0.06%",
    delta: "−0.02 pp",
    deltaDir: "down" as const,
    spark: seedSpark(5, 0.07, 0.02),
    color: "#10b981",
    tone: "good" as const,
  },
  {
    label: "Token spend",
    value: "$1.24K",
    delta: "+8%",
    deltaDir: "up" as const,
    spark: seedSpark(6, 1100, 80),
    color: "#4f46e5",
    tone: "neutral" as const,
  },
  {
    label: "Ranking stability",
    value: "0.94",
    delta: "−0.02",
    deltaDir: "down" as const,
    spark: seedSpark(7, 0.96, 0.04),
    color: "#94a3b8",
    tone: "neutral" as const,
  },
];

function TelemetryStrip() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-[var(--color-border-soft)] rounded-[10px] border border-[var(--color-border-soft)] overflow-hidden">
      {TELEMETRY.map((t, i) => (
        <TelemetryTile key={i} t={t} />
      ))}
    </section>
  );
}

function TelemetryTile({ t }: { t: (typeof TELEMETRY)[number] }) {
  const deltaColor =
    t.tone === "warn"
      ? "text-[#b95000]"
      : t.tone === "good"
        ? "text-[#1f7a4d]"
        : "text-on-surface-variant";
  return (
    <div className="bg-surface-container-lowest p-3 hover:bg-surface-container-low/40 transition-colors group">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9.5px] uppercase tracking-wider font-bold text-on-surface-variant">
          {t.label}
        </p>
        <CircleDot
          size={8}
          className={cn(
            "shrink-0",
            t.tone === "warn"
              ? "text-[#f59e0b]"
              : t.tone === "good"
                ? "text-[#10b981]"
                : "text-on-surface-variant/50",
          )}
        />
      </div>
      <p className="text-[16px] font-bold tabular-nums leading-none">
        {t.value}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <span
          className={cn(
            "text-[10px] font-bold tabular-nums",
            deltaColor,
          )}
        >
          {t.delta}
        </span>
        <div className="w-14 h-5 -mr-1">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={t.spark} margin={{ top: 1, right: 1, bottom: 0, left: 1 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={t.color}
                  strokeWidth={1.25}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Active model card
// ============================================================================

function ActiveModelCard({ env }: { env: Env }) {
  const meta = ENV_META[env];
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Cpu size={12} className="text-primary" />
          Active Model
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider",
            meta.bg,
            meta.tone,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>
      <div className="p-3 space-y-1.5 text-[11.5px]">
        <KV label="Version" value="v3.2.1" mono />
        <KV label="Architecture" value="Hybrid · ranker + LLM" />
        <KV label="Trained" value="2026-05-12 06:14" />
        <KV label="Samples" value="1.4M" />
        <KV label="Accuracy" value="94.2%" highlight />
        <KV label="Inference p95" value="142ms" />
        <KV label="Region" value="us-east-1, eu-west-1" mono />
      </div>
    </section>
  );
}

function KV({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn(
          "text-right font-semibold tabular-nums",
          mono && "font-mono text-[11px]",
          highlight ? "text-primary" : "text-on-surface",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Preset card
// ============================================================================

function PresetCard({
  preset,
  setPreset,
  dirty,
}: {
  preset: string;
  setPreset: (p: string) => void;
  dirty: () => void;
}) {
  const PRESETS = [
    {
      id: "accuracy",
      label: "Accuracy-first",
      desc: "Highest match quality",
      icon: ShieldCheck,
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "Recommended for prod",
      icon: Bot,
      recommended: true,
    },
    {
      id: "fresh",
      label: "Freshness-first",
      desc: "Bias toward new coaches",
      icon: Sparkles,
    },
    {
      id: "custom",
      label: "Custom",
      desc: "Your tuned weights",
      icon: Settings2,
    },
  ];
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <FlaskConical size={12} className="text-primary" />
          Model Preset
        </h3>
      </div>
      <div className="p-2 space-y-1">
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setPreset(p.id);
                dirty();
              }}
              className={cn(
                "w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors",
                active
                  ? "bg-primary/[0.06] border border-primary/20"
                  : "border border-transparent hover:bg-surface-container-low/40",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant",
                )}
              >
                <p.icon size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-bold flex items-center gap-1.5">
                  {p.label}
                  {p.recommended && (
                    <span className="text-[9px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">
                      Rec.
                    </span>
                  )}
                </p>
                <p className="text-[10.5px] text-on-surface-variant truncate">
                  {p.desc}
                </p>
              </div>
              {active && (
                <Check size={12} className="text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Feature importance
// ============================================================================

function FeatureImportance({
  signals,
  reduce,
}: {
  signals: Signal[];
  reduce: boolean;
}) {
  const data = [...signals]
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((s) => ({
      name: s.label.replace(/Weight| Match|Compatibility|Proximity|Engagement/g, "").trim(),
      v: s.value,
    }));
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <FileBarChart size={12} className="text-primary" />
          Feature Importance
        </h3>
        <p className="text-[10.5px] text-on-surface-variant mt-0.5">
          SHAP attribution · current model
        </p>
      </div>
      <div className="px-3 py-2 h-[170px]">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: -8, right: 8, top: 4, bottom: 0 }}
            >
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={70}
                stroke="#777587"
              />
              <Bar
                dataKey="v"
                radius={[0, 3, 3, 0]}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 700}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#4f46e5" : "#c7c4d8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ClientOnly>
      </div>
    </section>
  );
}

// ============================================================================
// Deployment targeting
// ============================================================================

function DeploymentTargeting({
  trafficPct,
  setTrafficPct,
}: {
  trafficPct: number;
  setTrafficPct: (v: number) => void;
}) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Radio size={12} className="text-primary" />
          Deployment Targeting
        </h3>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-on-surface-variant">
              Canary traffic
            </span>
            <span className="text-[12px] font-bold tabular-nums text-primary">
              {trafficPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={trafficPct}
            onChange={(e) => setTrafficPct(Number(e.target.value))}
            className="w-full h-1 bg-surface-container-low rounded-full appearance-none accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9.5px] text-on-surface-variant/60 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <KV label="Regions" value="us-east-1, eu-west-1" mono />
          <KV label="Cohort" value="Logged-in users" />
          <KV label="Holdout" value="5% control" />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Projected impact strip
// ============================================================================

function ProjectedImpact({
  projected,
}: {
  projected: { match: number; repeat: number; diversity: number };
}) {
  const items = [
    { label: "Match quality", value: projected.match, dir: projected.match >= 0 ? "up" : "down" },
    { label: "Repeat bookings", value: projected.repeat, dir: projected.repeat >= 0 ? "up" : "down" },
    {
      label: "Recommendation diversity",
      value: projected.diversity,
      dir: projected.diversity >= 0 ? "up" : "down",
    },
  ];
  return (
    <section className="rounded-[10px] border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-surface-container-lowest to-[#7d6dff]/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-primary inline-flex items-center gap-1.5">
          <Brain size={11} />
          Projected impact · simulated vs current production
        </p>
        <span className="text-[10px] text-on-surface-variant inline-flex items-center gap-1">
          <Info size={10} />
          AI-projected
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => {
          const color =
            it.dir === "up" && it.label !== "Recommendation diversity"
              ? "text-[#1f7a4d]"
              : it.dir === "down" && it.label !== "Recommendation diversity"
                ? "text-[#ba1a1a]"
                : it.dir === "up"
                  ? "text-[#1f7a4d]"
                  : "text-[#b95000]";
          const Icon = it.dir === "up" ? TrendingUp : TrendingDown;
          return (
            <div
              key={it.label}
              className="rounded-md bg-surface-container-lowest border border-[var(--color-border-soft)] p-2.5"
            >
              <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                {it.label}
              </p>
              <div className={cn("flex items-baseline gap-1 mt-1", color)}>
                <Icon size={13} />
                <span className="text-[18px] font-bold tabular-nums leading-none">
                  {it.value > 0 ? "+" : ""}
                  {it.value.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Signals panel
// ============================================================================

function SignalsPanel({
  signals,
  updateSignal,
  reduce,
}: {
  signals: Signal[];
  updateSignal: (id: string, v: number) => void;
  reduce: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(signals[0]?.id ?? null);
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <Settings2 size={12} className="text-primary" />
            Signal Weights &amp; Explainability
          </h3>
          <p className="text-[10.5px] text-on-surface-variant mt-0.5">
            Each adjustment shows expected impact, tradeoffs &amp; confidence
          </p>
        </div>
        <span className="text-[10.5px] text-on-surface-variant inline-flex items-center gap-1">
          <Lightbulb size={10} />
          Click row to expand
        </span>
      </div>

      <ul className="divide-y divide-[var(--color-border-soft)]">
        {signals.map((s) => {
          const isOpen = openId === s.id;
          const delta = s.value - s.default;
          return (
            <li key={s.id} className="px-3 py-2.5">
              <button
                onClick={() => setOpenId(isOpen ? null : s.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight
                      size={11}
                      className={cn(
                        "text-on-surface-variant transition-transform shrink-0",
                        isOpen && "rotate-90 text-primary",
                      )}
                    />
                    <p className="text-[12.5px] font-bold truncate">
                      {s.label}
                    </p>
                    {delta !== 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-bold tabular-nums px-1 py-0.5 rounded",
                          delta > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-[#fff5d6] text-[#b95000]",
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-bold tabular-nums text-primary tabular-nums shrink-0">
                    {s.value}%
                  </span>
                </div>
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={s.value}
                onChange={(e) =>
                  updateSignal(s.id, Number(e.target.value))
                }
                className="w-full mt-2 h-1 bg-surface-container-low rounded-full appearance-none accent-primary cursor-pointer"
              />

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 pl-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
                          Expected impact
                        </p>
                        <ul className="space-y-1 text-[11.5px]">
                          <ImpactLine
                            label="Match quality"
                            value={s.impact.match}
                            beneficial
                          />
                          <ImpactLine
                            label="Repeat bookings"
                            value={s.impact.repeat}
                            beneficial
                          />
                          <ImpactLine
                            label="Diversity"
                            value={s.impact.diversity}
                            inverse
                          />
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
                          Model confidence
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
                              style={{ width: `${s.confidence}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-bold tabular-nums">
                            {s.confidence}%
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed mt-2">
                          {s.desc} · Affects ranking position for{" "}
                          <span className="text-on-surface font-semibold">
                            ~82%
                          </span>{" "}
                          of queries.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ImpactLine({
  label,
  value,
  beneficial,
  inverse,
}: {
  label: string;
  value: number;
  beneficial?: boolean;
  inverse?: boolean;
}) {
  const positive = value > 0;
  const isGood = beneficial ? positive : inverse ? !positive : positive;
  const color = isGood ? "text-[#1f7a4d]" : "text-[#b95000]";
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn("font-bold tabular-nums inline-flex items-center gap-1", color)}
      >
        {positive ? (
          <TrendingUp size={11} />
        ) : (
          <TrendingDown size={11} />
        )}
        {positive ? "+" : ""}
        {value}%
      </span>
    </li>
  );
}

// ============================================================================
// Simulation panel
// ============================================================================

const SIM_LEARNERS = ["Tennis · Intermediate", "Strength · Beginner", "Recovery · All"];
const COACHES_BEFORE = [
  { name: "Sarah Jenkins", score: 94 },
  { name: "Elena Voss", score: 89 },
  { name: "Marcus Reed", score: 86 },
  { name: "Lila Bennett", score: 82 },
  { name: "Noah Park", score: 78 },
];
const COACHES_AFTER = [
  { name: "Sarah Jenkins", score: 97, change: 3 },
  { name: "Marcus Reed", score: 92, change: 4, up: true },
  { name: "Elena Voss", score: 88, change: -1 },
  { name: "Noah Park", score: 85, change: 7, up: true },
  { name: "Aiden Foster", score: 80, change: 0, isNew: true },
];

function SimulationPanel({
  signals,
  shadow,
  setShadow,
}: {
  signals: Signal[];
  shadow: boolean;
  setShadow: (v: boolean) => void;
  reduce: boolean;
}) {
  const [learner, setLearner] = useState(SIM_LEARNERS[0]);
  void signals;
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <Beaker size={12} className="text-primary" />
            Ranking Simulation
          </h3>
          <p className="text-[10.5px] text-on-surface-variant mt-0.5">
            Test before deploy · live model vs your config
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={learner}
            onChange={(e) => setLearner(e.target.value)}
            className="h-7 px-2.5 pr-6 appearance-none bg-surface-container-low border border-[var(--color-border-soft)] rounded-md text-[11px] font-semibold outline-none focus:border-primary/40 cursor-pointer"
          >
            {SIM_LEARNERS.map((l) => (
              <option key={l} value={l}>
                Sample learner: {l}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
            <Switch checked={shadow} onChange={() => setShadow(!shadow)} />
            <span className="font-semibold">Shadow test</span>
          </label>
          <button className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md bg-primary text-on-primary text-[11px] font-bold hover:bg-[#3a2db5] transition-colors">
            <Play size={10} />
            Run simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border-soft)]">
        {/* Before */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
              Current Model (v3.2.1)
            </p>
            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider bg-surface-container-low text-on-surface-variant px-1 py-0.5 rounded">
              Live
            </span>
          </div>
          <ol className="space-y-1.5">
            {COACHES_BEFORE.map((c, i) => (
              <RankRow key={c.name} rank={i + 1} name={c.name} score={c.score} />
            ))}
          </ol>
        </div>

        {/* After */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
              Proposed Config
            </p>
            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1 py-0.5 rounded">
              Simulated
            </span>
          </div>
          <ol className="space-y-1.5">
            {COACHES_AFTER.map((c, i) => (
              <RankRow
                key={c.name}
                rank={i + 1}
                name={c.name}
                score={c.score}
                change={c.change}
                isNew={c.isNew}
                up={c.up}
                accent
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function RankRow({
  rank,
  name,
  score,
  change,
  isNew,
  up,
  accent,
}: {
  rank: number;
  name: string;
  score: number;
  change?: number;
  isNew?: boolean;
  up?: boolean;
  accent?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        accent && up && "bg-success-container/40",
        accent && isNew && "bg-primary/[0.06]",
      )}
    >
      <span
        className={cn(
          "w-5 h-5 rounded text-[10px] font-bold tabular-nums flex items-center justify-center shrink-0",
          rank === 1
            ? "bg-gradient-to-br from-[#f59e0b] to-[#fb923c] text-white"
            : "bg-surface-container-low text-on-surface-variant",
        )}
      >
        {rank}
      </span>
      <p className="text-[11.5px] font-semibold truncate flex-1">
        {name}
        {isNew && (
          <span className="ml-1.5 text-[9.5px] uppercase tracking-wider font-bold text-primary">
            New
          </span>
        )}
      </p>
      {change !== undefined && change !== 0 && (
        <span
          className={cn(
            "text-[10px] font-bold tabular-nums inline-flex items-center gap-0.5",
            change > 0 ? "text-[#1f7a4d]" : "text-[#ba1a1a]",
          )}
        >
          {change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change > 0 ? "+" : ""}
          {change}
        </span>
      )}
      <span className="text-[11px] font-bold tabular-nums w-9 text-right">
        {score}
      </span>
    </li>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      className={cn(
        "relative w-7 h-4 rounded-full transition-colors shrink-0",
        checked ? "bg-primary" : "bg-surface-container-highest",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 inline-block w-3 h-3 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ============================================================================
// Experiment tracker
// ============================================================================

const EXPERIMENTS = [
  {
    id: "exp-2046",
    name: "rating_v2 shadow",
    status: "running" as const,
    traffic: "12%",
    progress: 64,
    lift: "+3.2%",
    age: "2d",
  },
  {
    id: "exp-2042",
    name: "intent_classifier_v4",
    status: "running" as const,
    traffic: "5%",
    progress: 28,
    lift: "+0.8%",
    age: "8h",
  },
  {
    id: "exp-2038",
    name: "diversity_boost",
    status: "promoted" as const,
    traffic: "100%",
    progress: 100,
    lift: "+1.4%",
    age: "Promoted 1d ago",
  },
  {
    id: "exp-2035",
    name: "freshness_decay_v3",
    status: "rolled-back" as const,
    traffic: "0%",
    progress: 100,
    lift: "−0.6%",
    age: "Rolled back 3d ago",
  },
];

function ExperimentTracker({ reduce }: { reduce: boolean }) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <FlaskConical size={12} className="text-primary" />
            Active Experiments
          </h3>
          <p className="text-[10.5px] text-on-surface-variant mt-0.5">
            Shadow tests &amp; A/B variants on live traffic
          </p>
        </div>
        <button className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[11px] font-semibold transition-colors">
          <Sparkles size={11} />
          New experiment
        </button>
      </div>
      <table className="w-full text-left">
        <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[9.5px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="px-3 py-2 font-bold">Experiment</th>
            <th className="px-2 py-2 font-bold">Status</th>
            <th className="px-2 py-2 font-bold">Traffic</th>
            <th className="px-2 py-2 font-bold">Progress</th>
            <th className="px-2 py-2 font-bold text-right">Lift</th>
            <th className="px-3 py-2 font-bold text-right">Age</th>
          </tr>
        </thead>
        <tbody>
          {EXPERIMENTS.map((e, i) => {
            const tone =
              e.status === "running"
                ? "bg-primary/10 text-primary"
                : e.status === "promoted"
                  ? "bg-success-container text-[#1f7a4d]"
                  : "bg-[#ffdad6] text-[#ba1a1a]";
            const liftPositive = !e.lift.startsWith("−");
            return (
              <motion.tr
                key={e.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduce ? 0 : 0.3,
                  delay: reduce ? 0 : i * 0.04,
                  ease: EASE,
                }}
                className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low/30 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2">
                  <p className="text-[12px] font-bold">{e.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">
                    {e.id}
                  </p>
                </td>
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider",
                      tone,
                    )}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-[11px] font-bold tabular-nums">
                  {e.traffic}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5 w-[100px]">
                    <div className="flex-1 h-1 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          e.status === "rolled-back"
                            ? "bg-[#ef4444]"
                            : "bg-gradient-to-r from-primary to-[#7d6dff]",
                        )}
                        style={{ width: `${e.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-on-surface-variant w-7 text-right">
                      {e.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <span
                    className={cn(
                      "text-[11.5px] font-bold tabular-nums",
                      liftPositive ? "text-[#1f7a4d]" : "text-[#ba1a1a]",
                    )}
                  >
                    {e.lift}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-[10.5px] text-on-surface-variant tabular-nums whitespace-nowrap">
                  {e.age}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ============================================================================
// Risk Center
// ============================================================================

function RiskCenter({ reduce }: { reduce: boolean }) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <div>
          <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
            <ShieldAlert size={12} className="text-primary" />
            AI Risk Center
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-0.5">
            Live anomalies · scanned 2m ago
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ffdad6] text-[9.5px] font-bold text-[#ba1a1a]">
          {RISK_ALERTS.filter((a) => a.severity === "high").length} high
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {RISK_ALERTS.map((a, i) => {
          const tone =
            a.severity === "high"
              ? { dot: "bg-[#ef4444]", text: "text-[#ba1a1a]" }
              : a.severity === "med"
                ? { dot: "bg-[#f59e0b]", text: "text-[#b95000]" }
                : { dot: "bg-primary", text: "text-primary" };
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduce ? 0 : 0.3,
                delay: reduce ? 0 : i * 0.05,
                ease: EASE,
              }}
              className="group px-3 py-2 hover:bg-surface-container-low/40 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                    tone.dot,
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11.5px] font-bold truncate">
                      {a.title}
                    </p>
                    <span className="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">
                      {a.age}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-on-surface-variant leading-snug mt-0.5">
                    {a.body}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold font-mono tabular-nums",
                        tone.text,
                      )}
                    >
                      {a.metric}
                    </span>
                    <button
                      className={cn(
                        "text-[10px] font-bold inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                        tone.text,
                      )}
                    >
                      Investigate
                      <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Governance
// ============================================================================

function Governance({
  guards,
  toggleGuard,
}: {
  guards: typeof GUARDS;
  toggleGuard: (id: string) => void;
}) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)]">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Lock size={12} className="text-primary" />
          Governance &amp; Guardrails
        </h3>
        <p className="text-[10px] text-on-surface-variant mt-0.5">
          Changes audited &amp; logged
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {guards.map((g) => {
          const sev =
            g.severity === "critical"
              ? { label: "CRIT", color: "bg-[#ef4444] text-white" }
              : g.severity === "high"
                ? { label: "HIGH", color: "bg-[#fff5d6] text-[#b95000]" }
                : g.severity === "med"
                  ? { label: "MED", color: "bg-primary/10 text-primary" }
                  : { label: "LOW", color: "bg-surface-container-low text-on-surface-variant" };
          return (
            <li
              key={g.id}
              className={cn(
                "p-2.5 transition-colors",
                !g.enabled && g.severity === "critical" && "bg-[#ffdad6]/30",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0",
                      sev.color,
                    )}
                  >
                    {sev.label}
                  </span>
                  <p className="text-[11.5px] font-bold truncate">{g.label}</p>
                </div>
                <Switch checked={g.enabled} onChange={() => toggleGuard(g.id)} />
              </div>
              <p className="text-[10.5px] text-on-surface-variant leading-snug">
                {g.desc}
              </p>
              {g.compliance && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-on-surface-variant">
                  <FileText size={10} />
                  <span className="font-mono">{g.compliance}</span>
                </div>
              )}
              {!g.enabled && g.severity === "critical" && (
                <div className="mt-1.5 flex items-start gap-1 text-[10px] text-[#ba1a1a] bg-[#ffdad6]/60 border border-[#ffbbb3] rounded px-1.5 py-1">
                  <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                  <span>
                    Disabling this may violate{" "}
                    <span className="font-bold">{g.compliance}</span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Activity feed
// ============================================================================

function ActivityFeed() {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <Activity size={12} className="text-primary" />
          Activity Feed
        </h3>
        <button className="text-[10px] font-medium text-primary hover:underline inline-flex items-center gap-0.5">
          Audit log
          <ChevronRight size={10} />
        </button>
      </div>
      <ul className="px-2 py-1.5 space-y-0.5">
        {ACTIVITY_FEED.map((it, i) => {
          const tone =
            it.tone === "good"
              ? "text-[#1f7a4d] bg-success-container"
              : "text-primary bg-primary/10";
          return (
            <li
              key={i}
              className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container-low/40 transition-colors"
            >
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5",
                  tone,
                )}
              >
                <it.icon size={10} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">
                  {it.label}
                </p>
                <p className="text-[10px] text-on-surface-variant truncate">
                  {it.meta}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Deploy History
// ============================================================================

function DeployHistory() {
  return (
    <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="px-3 py-2.5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold tracking-tight inline-flex items-center gap-1.5">
          <GitBranch size={12} className="text-primary" />
          Deploy History
        </h3>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {DEPLOY_HISTORY.map((d) => {
          const status =
            d.status === "active"
              ? { label: "Active", tone: "bg-success-container text-[#1f7a4d]" }
              : d.status === "rolled-back"
                ? { label: "Rolled back", tone: "bg-[#ffdad6] text-[#ba1a1a]" }
                : { label: "Archived", tone: "bg-surface-container-low text-on-surface-variant" };
          return (
            <li key={d.version} className="p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[11.5px] font-bold">
                  {d.version}
                </p>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider",
                    status.tone,
                  )}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                {d.time} · {d.samples} samples · {d.accuracy}% acc
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button className="h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] font-semibold hover:bg-surface-container-low text-on-surface-variant transition-colors">
                  <RotateCcw size={9} />
                  Rollback
                </button>
                <button className="h-6 px-2 inline-flex items-center gap-1 rounded text-[10px] font-semibold hover:bg-surface-container-low text-on-surface-variant transition-colors">
                  <FileText size={9} />
                  Diff
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Deploy Modal
// ============================================================================

function DeployModal({
  env,
  onClose,
  onConfirm,
  reduce,
}: {
  env: Env;
  onClose: () => void;
  onConfirm: () => void;
  reduce: boolean;
}) {
  const [target, setTarget] = useState<Env>(env === "production" ? "canary" : env);
  const [requireApproval, setRequireApproval] = useState(true);
  const [step, setStep] = useState<"review" | "deploying">("review");

  const confirm = () => {
    setStep("deploying");
    setTimeout(onConfirm, 1600);
  };

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 6 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 6 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[14px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Play size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold tracking-tight">
              Deploy model configuration
            </h3>
            <p className="text-[12px] text-on-surface-variant mt-0.5">
              Review impact and target environment before promoting v3.2.2.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-md hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        {step === "review" && (
          <div className="p-5 space-y-4">
            {/* Environment */}
            <div>
              <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                Target environment
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["sandbox", "staging", "canary", "production"] as Env[]).map(
                  (e) => {
                    const meta = ENV_META[e];
                    const active = target === e;
                    return (
                      <button
                        key={e}
                        onClick={() => setTarget(e)}
                        className={cn(
                          "text-left rounded-md border p-2.5 transition-colors",
                          active
                            ? "border-primary bg-primary/[0.04]"
                            : "border-[var(--color-border-soft)] hover:bg-surface-container-low/40",
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                          <p className="text-[11.5px] font-bold">{meta.label}</p>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-snug">
                          {e === "production"
                            ? "100% live traffic"
                            : e === "canary"
                              ? "Gradual rollout · 5–25%"
                              : e === "staging"
                                ? "Internal QA"
                                : "Isolated sandbox"}
                        </p>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Estimates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Estimate icon={Clock} label="Train time" value="~6m" />
              <Estimate icon={Cpu} label="GPU usage" value="8 × A100" />
              <Estimate icon={Database} label="Cost" value="~$42" />
              <Estimate
                icon={Zap}
                label="Affected services"
                value="3 services"
              />
            </div>

            {/* Safety checks */}
            <div className="rounded-md border border-[var(--color-border-soft)] divide-y divide-[var(--color-border-soft)]">
              <SafetyCheck label="Pre-deployment tests" status="passed" />
              <SafetyCheck label="Bias audit" status="passed" />
              <SafetyCheck
                label="Diversity threshold"
                status="warn"
                note="Projected −4% diversity"
              />
              <SafetyCheck label="Rollback plan ready" status="passed" />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={() => setRequireApproval(!requireApproval)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-[11.5px] font-bold">
                    Require additional approval
                  </p>
                  <p className="text-[10.5px] text-on-surface-variant">
                    Send to ops@ for sign-off before promoting beyond canary.
                  </p>
                </div>
              </label>

              {target === "production" && (
                <div className="rounded-md bg-[#ffdad6]/40 border border-[#ffbbb3] p-2.5 flex items-start gap-2">
                  <AlertTriangle
                    size={12}
                    className="text-[#ba1a1a] mt-0.5 shrink-0"
                  />
                  <p className="text-[11px] text-[#ba1a1a] leading-relaxed">
                    <span className="font-bold">High-stakes deploy.</span>{" "}
                    Production receives 100% traffic. Recommend deploying to
                    canary first.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "deploying" && (
          <div className="p-10 flex flex-col items-center text-center">
            <Loader2
              size={32}
              className="animate-spin text-primary mb-3"
            />
            <p className="text-[14px] font-bold">Promoting to {target}…</p>
            <p className="text-[12px] text-on-surface-variant mt-1">
              Running pre-deployment checks &amp; warming caches.
            </p>
          </div>
        )}

        {/* Footer */}
        {step === "review" && (
          <div className="px-5 py-3 border-t border-[var(--color-border-soft)] bg-surface-container-low/40 flex items-center justify-between">
            <span className="text-[10.5px] text-on-surface-variant inline-flex items-center gap-1">
              <Info size={10} />
              Esc to cancel · auto rollback if health checks fail
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-8 px-3 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[11.5px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="h-8 px-4 inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary text-[11.5px] font-bold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.4)] hover:bg-[#3a2db5] transition-colors"
              >
                <Play size={11} strokeWidth={2.5} />
                Deploy to {ENV_META[target].label}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Estimate({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border-soft)] p-2.5">
      <div className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider font-bold text-on-surface-variant">
        <Icon size={10} />
        {label}
      </div>
      <p className="text-[14px] font-bold tabular-nums mt-1 leading-none">
        {value}
      </p>
    </div>
  );
}

function SafetyCheck({
  label,
  status,
  note,
}: {
  label: string;
  status: "passed" | "warn" | "failed";
  note?: string;
}) {
  const meta =
    status === "passed"
      ? { icon: Check, tone: "text-[#1f7a4d]", label: "Passed" }
      : status === "warn"
        ? { icon: AlertTriangle, tone: "text-[#b95000]", label: "Warning" }
        : { icon: X, tone: "text-[#ba1a1a]", label: "Failed" };
  return (
    <div className="px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <meta.icon size={12} className={meta.tone} />
        <p className="text-[11.5px] font-semibold truncate">{label}</p>
        {note && (
          <span className="text-[10.5px] text-on-surface-variant truncate">
            · {note}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[9.5px] uppercase tracking-wider font-bold",
          meta.tone,
        )}
      >
        {meta.label}
      </span>
    </div>
  );
}

// ============================================================================
// Save bar
// ============================================================================

function SaveBar({
  onDiscard,
  onDeploy,
  reduce,
}: {
  onDiscard: () => void;
  onDeploy: () => void;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{
        type: "spring",
        duration: reduce ? 0 : 0.4,
        bounce: 0.15,
      }}
      className="fixed bottom-4 left-4 right-4 lg:left-[calc(16rem+1rem)] lg:right-6 z-30"
    >
      <div className="max-w-[1500px] mx-auto rounded-[12px] border border-[var(--color-border-soft)] bg-on-surface/95 backdrop-blur-md text-white py-2 pl-4 pr-2 flex items-center justify-between gap-3 shadow-[0_12px_32px_-8px_rgba(15,15,30,0.4)]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
          <p className="text-[12.5px] font-semibold">
            Unsaved configuration changes
          </p>
          <span className="text-[10.5px] text-white/60">
            · Deploy to apply
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDiscard}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/15 text-[11.5px] font-bold transition-colors"
          >
            <Undo2 size={11} />
            Discard
          </button>
          <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/15 text-[11.5px] font-bold transition-colors">
            <Save size={11} />
            Save draft
          </button>
          <button
            onClick={onDeploy}
            className="h-8 px-4 inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary text-[11.5px] font-bold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.5)] hover:bg-[#3a2db5] transition-colors"
          >
            <Play size={11} strokeWidth={2.5} />
            Deploy
            <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Silence unused imports for reserved widgets
void Area;
void AreaChart;
void LogOut;
