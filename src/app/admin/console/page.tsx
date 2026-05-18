"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatNumber } from "@/lib/utils";

interface ServiceHealth {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  uptime: string;
  latency: string;
}

const SERVICES: ServiceHealth[] = [
  {
    id: "api",
    name: "API Gateway",
    status: "operational",
    uptime: "99.99%",
    latency: "42ms",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "operational",
    uptime: "99.98%",
    latency: "28ms",
  },
  {
    id: "match",
    name: "AI Matching",
    status: "operational",
    uptime: "99.95%",
    latency: "115ms",
  },
  {
    id: "pay",
    name: "Payments",
    status: "degraded",
    uptime: "99.82%",
    latency: "290ms",
  },
  {
    id: "video",
    name: "Video Sessions",
    status: "operational",
    uptime: "99.91%",
    latency: "65ms",
  },
  {
    id: "notif",
    name: "Notifications",
    status: "operational",
    uptime: "99.96%",
    latency: "38ms",
  },
];

const LOGS = [
  {
    id: 1,
    level: "info",
    time: "12:42:11",
    source: "auth",
    text: "OAuth handshake completed (google) user=u_82441",
  },
  {
    id: 2,
    level: "warn",
    time: "12:41:58",
    source: "payments",
    text: "Webhook retry attempt 2/5 for inv_3812 — stripe.errors.RateLimitError",
  },
  {
    id: 3,
    level: "info",
    time: "12:41:30",
    source: "match",
    text: "Reindex completed in 4.2s (1,204 coaches)",
  },
  {
    id: 4,
    level: "error",
    time: "12:39:14",
    source: "video",
    text: "TURN allocation failed for room r_9128 — fallback to relay east-2",
  },
  {
    id: 5,
    level: "info",
    time: "12:38:02",
    source: "api",
    text: "Cache invalidated: feed:home (variant=learner_v3)",
  },
  {
    id: 6,
    level: "warn",
    time: "12:36:44",
    source: "auth",
    text: "MFA challenge expired for user=u_71902 — re-issued",
  },
  {
    id: 7,
    level: "info",
    time: "12:35:11",
    source: "match",
    text: "Model v3.2.1 served 24,108 inferences in last hour",
  },
];

const FEATURE_FLAGS = [
  {
    id: "ai_chat",
    label: "AI Coach Chat",
    description: "Inline chat panel on dashboard.",
    enabled: true,
    rollout: 100,
  },
  {
    id: "auto_match",
    label: "Auto-confirm AI Matches",
    description: "Skip review for sub-90% matches.",
    enabled: false,
    rollout: 0,
  },
  {
    id: "video_v3",
    label: "Video Engine v3",
    description: "New WebRTC backend with HD recording.",
    enabled: true,
    rollout: 25,
  },
  {
    id: "marketplace_v2",
    label: "Coach Marketplace v2",
    description: "Redesigned discovery experience.",
    enabled: false,
    rollout: 5,
  },
];

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-[#d1f4dd] text-[#1f7a4d]",
  degraded: "bg-amber-50 text-amber-700",
  down: "bg-[#ffdad6] text-[#ba1a1a]",
};

const LOG_LEVEL: Record<string, string> = {
  info: "text-on-surface-variant",
  warn: "text-amber-700",
  error: "text-error",
};

export default function AdminConsolePage() {
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [filter, setFilter] = useState<string>("all");
  const filteredLogs =
    filter === "all" ? LOGS : LOGS.filter((l) => l.level === filter);

  const toggle = (id: string) =>
    setFlags((p) =>
      p.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );

  return (
    <AppShell role="admin" title="Console">
      <div className="max-w-[1500px] space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">Admin Console</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              System health, logs, feature flags and emergency actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low">
              <MaterialIcon name="refresh" size={16} />
              Refresh
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-error text-error rounded-[6px] text-body-sm font-medium hover:bg-error/5">
              <MaterialIcon name="warning" size={16} />
              Maintenance Mode
            </button>
          </div>
        </header>

        {/* Status overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Uptime (30d)" value="99.96%" trend="+0.02%" />
          <Stat
            label="Requests / min"
            value={formatNumber(18_420)}
            trend="+8%"
          />
          <Stat label="Error rate" value="0.18%" trend="-0.04%" />
          <Stat label="DB connections" value="142 / 200" trend="" tone="neutral" />
        </section>

        {/* Services + logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section className="lg:col-span-5 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-h3">Services</h3>
              <span className="text-body-sm text-on-surface-variant">
                {SERVICES.filter((s) => s.status === "operational").length} /{" "}
                {SERVICES.length} operational
              </span>
            </div>
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {SERVICES.map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0",
                      s.status === "operational"
                        ? "bg-[#d1f4dd]"
                        : s.status === "degraded"
                          ? "bg-amber-50"
                          : "bg-[#ffdad6]",
                    )}
                  >
                    <MaterialIcon
                      name={
                        s.status === "operational"
                          ? "check_circle"
                          : s.status === "degraded"
                            ? "warning"
                            : "error"
                      }
                      filled
                      size={18}
                      className={cn(
                        s.status === "operational"
                          ? "text-[#1f7a4d]"
                          : s.status === "degraded"
                            ? "text-amber-700"
                            : "text-error",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-medium">{s.name}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      Uptime {s.uptime} · Latency {s.latency}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium",
                      STATUS_STYLES[s.status],
                    )}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Logs */}
          <section className="lg:col-span-7 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-h3">Recent Logs</h3>
              <div className="inline-flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] p-0.5">
                {(["all", "info", "warn", "error"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilter(l)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] uppercase tracking-wider rounded capitalize",
                      filter === l
                        ? "bg-surface-container-lowest font-medium"
                        : "text-on-surface-variant",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="font-mono text-[12px] bg-on-surface text-inverse-on-surface p-4 max-h-[420px] overflow-y-auto">
              {filteredLogs.map((l) => (
                <div key={l.id} className="flex gap-3 py-0.5">
                  <span className="text-on-surface-variant w-20 shrink-0">
                    {l.time}
                  </span>
                  <span
                    className={cn(
                      "w-12 shrink-0 uppercase font-medium",
                      LOG_LEVEL[l.level],
                    )}
                  >
                    {l.level}
                  </span>
                  <span className="text-primary/80 w-16 shrink-0">
                    [{l.source}]
                  </span>
                  <span className="text-inverse-on-surface flex-1 break-all">
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Feature flags */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MaterialIcon
                name="toggle_on"
                size={20}
                className="text-primary"
              />
              <h2 className="text-h2">Feature Flags</h2>
            </div>
            <button className="text-body-sm text-primary hover:underline inline-flex items-center gap-1">
              <MaterialIcon name="add" size={16} />
              New flag
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {flags.map((f) => (
              <div
                key={f.id}
                className="p-4 border border-[var(--color-border-soft)] rounded-[8px]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-medium">{f.label}</p>
                    <p className="text-body-sm text-on-surface-variant mt-0.5">
                      {f.description}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(f.id)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                      f.enabled
                        ? "bg-primary"
                        : "bg-surface-container-highest",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                        f.enabled ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${f.rollout}%` }}
                    />
                  </div>
                  <span className="text-body-sm text-on-surface-variant w-12 text-right">
                    {f.rollout}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone?: "neutral";
}) {
  return (
    <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4">
      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
        {label}
      </p>
      <p
        className="text-h1 mt-1 text-on-surface"
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "text-body-sm mt-1 inline-flex items-center gap-1",
            tone === "neutral"
              ? "text-on-surface-variant"
              : trend.startsWith("-")
                ? "text-[#1f7a4d]"
                : "text-[#1f7a4d]",
          )}
        >
          <MaterialIcon
            name={trend.startsWith("-") ? "trending_down" : "trending_up"}
            size={14}
          />
          {trend}
        </p>
      )}
    </div>
  );
}
