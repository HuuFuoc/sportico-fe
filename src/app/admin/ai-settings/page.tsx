"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
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
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  Info,
  Loader2,
  Lock,
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
  impact: { match: number; repeat: number; diversity: number };
  confidence: number;
}

const SIGNAL_DEFAULTS: Signal[] = [
  {
    id: "rating",
    label: "Coach Rating",
    desc: "Ưu tiên huấn luyện viên có đánh giá cao",
    value: 85,
    default: 85,
    impact: { match: 12, repeat: 9, diversity: -4 },
    confidence: 92,
  },
  {
    id: "availability",
    label: "Khớp lịch trống",
    desc: "Ưu tiên coach có slot mở trong 7 ngày tới",
    value: 40,
    default: 40,
    impact: { match: 5, repeat: 7, diversity: 2 },
    confidence: 88,
  },
  {
    id: "price",
    label: "Phù hợp ngân sách",
    desc: "Khớp coach với khoảng giá của learner",
    value: 60,
    default: 60,
    impact: { match: 8, repeat: 4, diversity: -2 },
    confidence: 84,
  },
  {
    id: "experience",
    label: "Kinh nghiệm",
    desc: "Trọng số dựa trên số năm huấn luyện",
    value: 55,
    default: 55,
    impact: { match: 7, repeat: 3, diversity: -1 },
    confidence: 86,
  },
  {
    id: "location",
    label: "Khoảng cách địa lý",
    desc: "Ưu tiên coach ở gần learner",
    value: 30,
    default: 30,
    impact: { match: 3, repeat: 2, diversity: 4 },
    confidence: 78,
  },
  {
    id: "history",
    label: "Lịch sử tương tác",
    desc: "Boost coach có lịch sử tích cực với learner",
    value: 70,
    default: 70,
    impact: { match: 10, repeat: 14, diversity: -7 },
    confidence: 94,
  },
];

const GUARDS = [
  {
    id: "g1",
    label: "Lọc coach chưa xác minh",
    desc: "Không hiển thị coach còn trong hàng đợi xác minh.",
    enabled: true,
    severity: "low" as const,
    compliance: null,
    locked: false,
  },
  {
    id: "g2",
    label: "Chặn tự động xác nhận buổi học có phí",
    desc: "Yêu cầu admin phê duyệt trước khi tính phí learner.",
    enabled: true,
    severity: "high" as const,
    compliance: "PCI DSS · §4.2",
    locked: false,
  },
  {
    id: "g3",
    label: "Ẩn danh PII trong log huấn luyện",
    desc: "Loại bỏ tên, email, địa chỉ trước khi retrain mô hình.",
    enabled: true,
    severity: "critical" as const,
    compliance: "GDPR Art. 25",
    locked: true,
  },
  {
    id: "g4",
    label: "Ghi log mọi gợi ý AI",
    desc: "Bắt buộc để phục vụ kiểm toán compliance.",
    enabled: false,
    severity: "med" as const,
    compliance: "SOC 2 CC7.3",
    locked: false,
  },
  {
    id: "g5",
    label: "Hallucination guard cho chat",
    desc: "Chặn phản hồi của trợ lý có độ tin cậy thấp.",
    enabled: true,
    severity: "high" as const,
    compliance: "Internal AUP",
    locked: false,
  },
  {
    id: "g6",
    label: "Bias drift detection",
    desc: "Tự động cảnh báo khi ranking thiên lệch theo demographic.",
    enabled: true,
    severity: "high" as const,
    compliance: "EU AI Act Art. 9",
    locked: true,
  },
];

const RISK_ALERTS = [
  {
    id: "r1",
    severity: "high" as const,
    title: "Diversity gợi ý đang giảm",
    body: "Top-10 kết quả giảm 18% diversity so với baseline 7 ngày.",
    metric: "Diversity 0.71 → 0.58",
    age: "12 phút",
    action: "Xem xét hạ Coach Rating weight 5–8 điểm.",
  },
  {
    id: "r2",
    severity: "med" as const,
    title: "Fallback rate tăng bất thường",
    body: "Tỉ lệ trợ lý chuyển sang human escalation tăng 2.4 pp.",
    metric: "2.1% → 4.5%",
    age: "1 giờ",
    action: "Kiểm tra prompt thay đổi gần nhất trên canary.",
  },
  {
    id: "r3",
    severity: "med" as const,
    title: "Inference latency spike",
    body: "p99 vượt 380ms tại us-east-1 trong 14 phút.",
    metric: "p99 380ms",
    age: "14 phút",
    action: "Theo dõi auto-scaling · cân nhắc mở thêm replica.",
  },
  {
    id: "r4",
    severity: "info" as const,
    title: "Model drift đang tăng nhẹ",
    body: "Population Stability Index có xu hướng tăng dần.",
    metric: "PSI 0.18",
    age: "6 giờ",
    action: "Lên lịch retrain trong 7 ngày tới.",
  },
];

const ACTIVITY_FEED = [
  {
    icon: GitBranch,
    label: "v3.2.1 triển khai sang production",
    meta: "ops@ · 2 giờ trước",
    tone: "good" as const,
  },
  {
    icon: Beaker,
    label: "Shadow test mới: rating_v2",
    meta: "Đang chạy trên 12% lưu lượng",
    tone: "info" as const,
  },
  {
    icon: ShieldAlert,
    label: "Bật guardrail: Hallucination guard",
    meta: "compliance@ · 3 giờ trước",
    tone: "info" as const,
  },
  {
    icon: AlertTriangle,
    label: "Cảnh báo latency đã được resolve",
    meta: "us-east-1 · 38 phút trước",
    tone: "good" as const,
  },
  {
    icon: GitBranch,
    label: "Canary v3.2.2 promote lên 25%",
    meta: "auto · health-check passed",
    tone: "info" as const,
  },
];

const DEPLOY_HISTORY = [
  {
    version: "v3.2.1",
    env: "production",
    time: "Hôm nay · 06:14",
    samples: "1.4M",
    accuracy: 94.2,
    by: "ops@",
    status: "active" as const,
  },
  {
    version: "v3.2.0",
    env: "production",
    time: "08/05 · 11:30",
    samples: "1.3M",
    accuracy: 93.4,
    by: "ops@",
    status: "rolled-back" as const,
  },
  {
    version: "v3.1.8",
    env: "production",
    time: "02/05 · 09:12",
    samples: "1.3M",
    accuracy: 92.9,
    by: "auto",
    status: "archived" as const,
  },
];

const EXPERIMENTS = [
  {
    id: "exp-2046",
    name: "rating_v2 shadow",
    status: "running" as const,
    traffic: "12%",
    progress: 64,
    lift: "+3.2%",
    age: "2 ngày",
  },
  {
    id: "exp-2042",
    name: "intent_classifier_v4",
    status: "running" as const,
    traffic: "5%",
    progress: 28,
    lift: "+0.8%",
    age: "8 giờ",
  },
  {
    id: "exp-2038",
    name: "diversity_boost",
    status: "promoted" as const,
    traffic: "100%",
    progress: 100,
    lift: "+1.4%",
    age: "Phát hành 1 ngày trước",
  },
  {
    id: "exp-2035",
    name: "freshness_decay_v3",
    status: "rolled-back" as const,
    traffic: "0%",
    progress: 100,
    lift: "−0.6%",
    age: "Hoàn tác 3 ngày trước",
  },
];

const ENV_META: Record<
  Env,
  { label: string; dot: string; chipBg: string; chipText: string; desc: string }
> = {
  production: {
    label: "Production",
    dot: "bg-[#0c8a4d]",
    chipBg: "bg-[#0c8a4d]/10",
    chipText: "text-[#0c6b3c]",
    desc: "100% lưu lượng live",
  },
  canary: {
    label: "Canary",
    dot: "bg-[#d97706]",
    chipBg: "bg-[#d97706]/10",
    chipText: "text-[#a3530a]",
    desc: "Rollout 5–25%",
  },
  staging: {
    label: "Staging",
    dot: "bg-primary",
    chipBg: "bg-primary/10",
    chipText: "text-primary",
    desc: "QA nội bộ",
  },
  sandbox: {
    label: "Sandbox",
    dot: "bg-[#64748b]",
    chipBg: "bg-[#64748b]/10",
    chipText: "text-[#475569]",
    desc: "Sandbox cô lập",
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
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
    setDirty(true);
  };

  const toggleGuard = (id: string) => {
    setGuards((prev) =>
      prev.map((g) =>
        g.id === id && !g.locked ? { ...g, enabled: !g.enabled } : g,
      ),
    );
    setDirty(true);
  };

  const resetSignals = () => {
    setSignals(SIGNAL_DEFAULTS);
    setDirty(false);
  };

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

  const highRisks = RISK_ALERTS.filter((r) => r.severity === "high").length;
  const medRisks = RISK_ALERTS.filter((r) => r.severity === "med").length;
  const runningExperiments = EXPERIMENTS.filter((e) => e.status === "running")
    .length;

  return (
    <AppShell role="admin" title="AI Model Control Center">
      <div className="mx-auto w-full max-w-[1440px] pb-24">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0c6b3c]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0c8a4d] animate-pulse" />
                Hệ thống ổn định
              </span>
              <span className="text-[12px] text-on-surface-variant">·</span>
              <span className="text-[12px] text-on-surface-variant tabular-nums">
                v3.2.1 · us-east-1
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[30px] leading-[1.15] font-semibold tracking-tight text-on-surface">
              AI Model Control Center
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5 max-w-2xl leading-relaxed">
              Quản lý cấu hình mô hình, triển khai an toàn theo môi trường, thí
              nghiệm và hành vi ranking trên toàn nền tảng.
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2.5 lg:shrink-0">
            <EnvSwitcher env={env} setEnv={setEnv} reduce={reduce ?? false} />
            <div className="flex items-center gap-2">
              <button
                onClick={resetSignals}
                disabled={!dirty}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low/60 text-[13px] font-medium text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 size={14} />
                Đặt lại
              </button>
              <button className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low/60 text-[13px] font-medium text-on-surface transition-colors">
                <Play size={13} />
                Chạy mô phỏng
              </button>
              <button
                onClick={() => setDeployOpen(true)}
                className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold shadow-[0_1px_2px_rgba(53,37,205,0.18),0_4px_12px_-4px_rgba(53,37,205,0.32)] hover:bg-[#2c1eaa] transition-colors"
              >
                Xem & Triển khai
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.header>

        {/* ============ KPI OVERVIEW ============ */}
        <section className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Mô hình đang chạy"
            value="v3.2.1"
            helper="Hybrid ranker + LLM"
            status="success"
            statusLabel="Production"
            tabular={false}
          />
          <KpiCard
            label="Chất lượng ghép cặp"
            value="94.2%"
            helper="+0.4 pp so với tuần trước"
            delta="up"
            status="success"
          />
          <KpiCard
            label="Inference p95"
            value="142ms"
            helper="−4ms vs baseline"
            delta="down"
            status="success"
          />
          <KpiCard
            label="Mức rủi ro"
            value={`${highRisks} cao · ${medRisks} vừa`}
            helper="Quét cách đây 2 phút"
            status={highRisks > 0 ? "danger" : "warning"}
            tabular={false}
          />
          <KpiCard
            label="Thí nghiệm đang chạy"
            value={String(runningExperiments)}
            helper="1 chờ phát hành"
            status="neutral"
          />
        </section>

        {/* ============ MODEL CONFIGURATION ============ */}
        <SectionHeader
          title="Cấu hình mô hình"
          subtitle="Phiên bản đang phục vụ production và chế độ tuning áp dụng."
          className="mt-8"
        />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ActiveModelCard env={env} className="lg:col-span-2" />
          <PresetCard
            preset={preset}
            setPreset={(p) => {
              setPreset(p);
              setDirty(true);
            }}
          />
        </div>

        {/* ============ DEPLOYMENT TARGETING ============ */}
        <SectionHeader
          title="Triển khai có mục tiêu"
          subtitle="Phạm vi lưu lượng, vùng địa lý và nhóm đối chứng cho lần phát hành kế tiếp."
          className="mt-8"
        />
        <DeploymentTargeting
          trafficPct={trafficPct}
          setTrafficPct={(v) => {
            setTrafficPct(v);
            setDirty(true);
          }}
          className="mt-4"
        />

        {/* ============ PERFORMANCE & EXPLAINABILITY ============ */}
        <SectionHeader
          title="Hiệu năng & Giải thích"
          subtitle="Tầm quan trọng của các tín hiệu và trọng số ranking có thể điều chỉnh."
          className="mt-8"
        />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <FeatureImportanceCard
            signals={signals}
            reduce={reduce ?? false}
            className="lg:col-span-2"
          />
          <SignalWeightsCard
            signals={signals}
            updateSignal={updateSignal}
            projected={projected}
            reduce={reduce ?? false}
            className="lg:col-span-3"
          />
        </div>

        {/* ============ RANKING SIMULATION ============ */}
        <SectionHeader
          title="Mô phỏng xếp hạng"
          subtitle="So sánh ranking mô hình hiện tại với cấu hình đề xuất trước khi deploy."
          className="mt-8"
        />
        <SimulationCard
          shadow={shadow}
          setShadow={(v) => {
            setShadow(v);
            setDirty(true);
          }}
          className="mt-4"
        />

        {/* ============ EXPERIMENTS ============ */}
        <SectionHeader
          title="Thí nghiệm đang chạy"
          subtitle="Shadow test và A/B variant trên lưu lượng thật."
          className="mt-8"
          action={
            <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low/60 text-[12.5px] font-medium transition-colors">
              <Sparkles size={12} />
              Tạo thí nghiệm
            </button>
          }
        />
        <ExperimentTable reduce={reduce ?? false} className="mt-4" />

        {/* ============ RISK & GUARDRAILS ============ */}
        <SectionHeader
          title="Trung tâm rủi ro & Guardrails"
          subtitle="Các bất thường đang theo dõi và chính sách an toàn đang được thực thi."
          className="mt-8"
        />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <RiskCenter reduce={reduce ?? false} className="lg:col-span-3" />
          <GuardrailsCard
            guards={guards}
            toggleGuard={toggleGuard}
            className="lg:col-span-2"
          />
        </div>

        {/* ============ ACTIVITY + DEPLOY HISTORY ============ */}
        <SectionHeader
          title="Nhật ký & Lịch sử triển khai"
          subtitle="Theo dõi mọi thay đổi cấu hình và mọi lần phát hành mô hình."
          className="mt-8"
        />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <ActivityFeedCard className="lg:col-span-2" />
          <DeployHistoryCard className="lg:col-span-3" />
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
// Section header
// ============================================================================

function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3 flex-wrap",
        className,
      )}
    >
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
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
    <div className="inline-flex items-center gap-0.5 p-1 bg-surface-container-low rounded-lg border border-[var(--color-border-soft)]">
      {ENVS.map((e) => {
        const meta = ENV_META[e];
        const active = env === e;
        return (
          <button
            key={e}
            onClick={() => setEnv(e)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium rounded-md transition-colors",
              active
                ? "text-on-surface"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {active && (
              <motion.span
                layoutId="envPill"
                className="absolute inset-0 bg-surface-container-lowest rounded-md shadow-[0_1px_2px_rgba(15,15,30,0.08)]"
                transition={{
                  type: "spring",
                  duration: reduce ? 0 : 0.35,
                  bounce: 0.2,
                }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
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
// KPI Card
// ============================================================================

type KpiStatus = "success" | "warning" | "danger" | "neutral";

function KpiCard({
  label,
  value,
  helper,
  status = "neutral",
  statusLabel,
  delta,
  tabular = true,
}: {
  label: string;
  value: string;
  helper?: string;
  status?: KpiStatus;
  statusLabel?: string;
  delta?: "up" | "down";
  tabular?: boolean;
}) {
  const statusColor =
    status === "success"
      ? "text-[#0c6b3c] bg-[#0c8a4d]/10"
      : status === "warning"
        ? "text-[#a3530a] bg-[#d97706]/10"
        : status === "danger"
          ? "text-[#9d1414] bg-[#dc2626]/10"
          : "text-on-surface-variant bg-surface-container-low";

  const dotColor =
    status === "success"
      ? "bg-[#0c8a4d]"
      : status === "warning"
        ? "bg-[#d97706]"
        : status === "danger"
          ? "bg-[#dc2626]"
          : "bg-on-surface-variant/60";

  const helperColor =
    delta === "up"
      ? "text-[#0c6b3c]"
      : delta === "down"
        ? "text-[#0c6b3c]" /* lower latency = good */
        : "text-on-surface-variant";

  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-on-surface-variant leading-tight">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10.5px] font-semibold",
            statusColor,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
          {statusLabel ?? statusDot(status)}
        </span>
      </div>
      <p
        className={cn(
          "text-[24px] sm:text-[26px] font-semibold leading-none text-on-surface",
          tabular && "tabular-nums",
        )}
      >
        {value}
      </p>
      {helper && (
        <p className={cn("text-[12.5px] leading-snug", helperColor)}>
          {helper}
        </p>
      )}
    </div>
  );
}

function statusDot(s: KpiStatus) {
  return s === "success"
    ? "Ổn định"
    : s === "warning"
      ? "Theo dõi"
      : s === "danger"
        ? "Cảnh báo"
        : "Neutral";
}

// ============================================================================
// Active model
// ============================================================================

function ActiveModelCard({ env, className }: { env: Env; className?: string }) {
  const meta = ENV_META[env];
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Phiên bản", value: "v3.2.1", mono: true },
    { label: "Kiến trúc", value: "Hybrid · ranker + LLM" },
    { label: "Huấn luyện", value: "12/05/2026 · 06:14" },
    { label: "Mẫu huấn luyện", value: "1.4M" },
    { label: "Độ chính xác", value: "94.2%" },
    { label: "Inference p95", value: "142ms" },
    { label: "Vùng phục vụ", value: "us-east-1, eu-west-1", mono: true },
    { label: "Cập nhật bởi", value: "ops@sportico.ai" },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04)] overflow-hidden",
        className,
      )}
    >
      <div className="p-6 flex items-start justify-between gap-4 border-b border-[var(--color-border-soft)]">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cpu size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
              Mô hình đang chạy
            </p>
            <h3 className="text-[20px] font-semibold tracking-tight mt-1 font-mono">
              recommender_v3.2.1
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11.5px] font-semibold",
                  meta.chipBg,
                  meta.chipText,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
              <span className="text-[12px] text-on-surface-variant">
                ·
              </span>
              <span className="text-[12px] text-on-surface-variant">
                Cập nhật 2 giờ trước
              </span>
            </div>
          </div>
        </div>
        <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low/60 text-[12.5px] font-medium text-on-surface transition-colors shrink-0">
          <FileText size={13} />
          Xem cấu hình
        </button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border-soft)]">
        <div className="grid grid-cols-2 gap-y-3 p-6 sm:border-b border-[var(--color-border-soft)]">
          {rows.slice(0, 4).map((r) => (
            <KV key={r.label} {...r} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-y-3 p-6 sm:border-b border-[var(--color-border-soft)]">
          {rows.slice(4).map((r) => (
            <KV key={r.label} {...r} />
          ))}
        </div>
      </dl>
    </section>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[12px] text-on-surface-variant leading-tight">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[14px] font-medium text-on-surface mt-0.5 leading-snug",
          mono && "font-mono text-[13px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ============================================================================
// Preset
// ============================================================================

function PresetCard({
  preset,
  setPreset,
}: {
  preset: string;
  setPreset: (p: string) => void;
}) {
  const PRESETS = [
    {
      id: "accuracy",
      label: "Accuracy-first",
      desc: "Tối ưu chất lượng match tối đa.",
      icon: ShieldCheck,
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "Khuyến nghị cho production.",
      icon: Bot,
      recommended: true,
    },
    {
      id: "fresh",
      label: "Freshness-first",
      desc: "Ưu tiên coach mới và slot mới mở.",
      icon: Sparkles,
    },
    {
      id: "custom",
      label: "Custom",
      desc: "Trọng số được điều chỉnh thủ công.",
      icon: Settings2,
    },
  ];
  return (
    <section className="rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">
            Chế độ mô hình
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Mặc định nhanh cho từng tình huống.
          </p>
        </div>
        <FlaskConical size={16} className="text-on-surface-variant shrink-0" />
      </div>
      <div className="space-y-2">
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              aria-pressed={active}
              className={cn(
                "w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors",
                active
                  ? "bg-primary/[0.05] border-primary/40"
                  : "border-[var(--color-border-soft)] hover:bg-surface-container-low/40",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant",
                )}
              >
                <p.icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13.5px] font-semibold text-on-surface">
                    {p.label}
                  </p>
                  {p.recommended && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Đề xuất
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-on-surface-variant mt-0.5 leading-snug">
                  {p.desc}
                </p>
              </div>
              {active && (
                <Check size={14} className="text-primary shrink-0 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================================
// Deployment Targeting
// ============================================================================

function DeploymentTargeting({
  trafficPct,
  setTrafficPct,
  className,
}: {
  trafficPct: number;
  setTrafficPct: (v: number) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Radio size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              Phạm vi triển khai
            </h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              Các thay đổi sẽ được áp dụng cho lần phát hành kế tiếp.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low/60 text-[12.5px] font-medium transition-colors">
            Huỷ thay đổi
          </button>
          <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-on-surface text-white hover:bg-on-surface/90 text-[12.5px] font-semibold transition-colors">
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-on-surface">
              Lưu lượng canary
            </p>
            <span className="text-[18px] font-semibold tabular-nums text-on-surface">
              {trafficPct}
              <span className="text-on-surface-variant">%</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={trafficPct}
            onChange={(e) => setTrafficPct(Number(e.target.value))}
            aria-label="Tỉ lệ lưu lượng canary"
            className="w-full h-1.5 bg-surface-container rounded-full appearance-none accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-on-surface-variant mt-2 tabular-nums">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <TargetField label="Vùng triển khai" value="us-east-1, eu-west-1" mono />
        <TargetField label="Nhóm người dùng" value="Logged-in users" />
        <TargetField label="Nhóm đối chứng" value="5% holdout" />
        <TargetField label="Rollback tự động" value="Bật · 8 phút" />
      </div>
    </section>
  );
}

function TargetField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-low/30 p-4">
      <p className="text-[12px] text-on-surface-variant">{label}</p>
      <p
        className={cn(
          "mt-1 text-[14px] font-medium text-on-surface",
          mono && "font-mono text-[13px]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Feature Importance
// ============================================================================

function FeatureImportanceCard({
  signals,
  reduce,
  className,
}: {
  signals: Signal[];
  reduce: boolean;
  className?: string;
}) {
  const data = [...signals]
    .sort((a, b) => b.value - a.value)
    .map((s) => ({ name: s.label, v: s.value, id: s.id }));

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-5 gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">
            Tầm quan trọng tín hiệu
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5 leading-snug">
            SHAP attribution của mô hình hiện tại. Cao hơn = ảnh hưởng nhiều hơn
            đến ranking.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
          <Info size={11} />
          v3.2.1
        </span>
      </div>
      <div className="h-[260px]">
        <ClientOnly fallback={<div className="h-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={130}
                stroke="#5b5a6a"
              />
              <Bar
                dataKey="v"
                radius={[0, 6, 6, 0]}
                barSize={18}
                isAnimationActive={!reduce}
                animationDuration={reduce ? 0 : 700}
                label={{
                  position: "right",
                  fill: "#1a1c1c",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.id}
                    fill={i === 0 ? "#3525cd" : i < 3 ? "#7064e6" : "#cbc7e8"}
                  />
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
// Signal Weights
// ============================================================================

function SignalWeightsCard({
  signals,
  updateSignal,
  projected,
  reduce,
  className,
}: {
  signals: Signal[];
  updateSignal: (id: string, v: number) => void;
  projected: { match: number; repeat: number; diversity: number };
  reduce: boolean;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">
            Trọng số tín hiệu
          </h3>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Điều chỉnh có ảnh hưởng tới ranking. Mở rộng từng dòng để xem tác
            động dự kiến.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-on-surface-variant flex-wrap">
          <ProjectedPill
            label="Match"
            value={projected.match}
            beneficial
          />
          <ProjectedPill
            label="Repeat"
            value={projected.repeat}
            beneficial
          />
          <ProjectedPill
            label="Diversity"
            value={projected.diversity}
            inverse
          />
        </div>
      </div>

      <ul className="divide-y divide-[var(--color-border-soft)]">
        {signals.map((s) => {
          const isOpen = openId === s.id;
          const delta = s.value - s.default;
          return (
            <li key={s.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setOpenId(isOpen ? null : s.id)}
                  className="flex-1 text-left flex items-center gap-2 min-w-0"
                  aria-expanded={isOpen}
                >
                  <ChevronRight
                    size={13}
                    className={cn(
                      "text-on-surface-variant transition-transform shrink-0",
                      isOpen && "rotate-90 text-primary",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-on-surface truncate">
                      {s.label}
                    </p>
                    <p className="text-[12px] text-on-surface-variant truncate mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  {delta !== 0 && (
                    <span
                      className={cn(
                        "text-[11.5px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
                        delta > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-[#d97706]/10 text-[#a3530a]",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  )}
                  <span className="text-[15px] font-semibold tabular-nums text-on-surface w-10 text-right">
                    {s.value}
                  </span>
                </div>
              </div>

              <div className="mt-3 pl-5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={s.value}
                  onChange={(e) => updateSignal(s.id, Number(e.target.value))}
                  aria-label={`${s.label} weight`}
                  className="w-full h-1 bg-surface-container rounded-full appearance-none accent-primary cursor-pointer"
                />
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pl-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                          Tác động dự kiến
                        </p>
                        <ul className="space-y-1.5 text-[13px]">
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
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                          Độ tin cậy mô hình
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${s.confidence}%` }}
                            />
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums">
                            {s.confidence}%
                          </span>
                        </div>
                        <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-3">
                          {s.desc}. Ảnh hưởng vị trí ranking của{" "}
                          <span className="text-on-surface font-semibold">
                            ~82%
                          </span>{" "}
                          truy vấn matching.
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

function ProjectedPill({
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
  const color =
    value === 0
      ? "text-on-surface-variant"
      : isGood
        ? "text-[#0c6b3c]"
        : "text-[#a3530a]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider font-semibold">
        {label}
      </span>
      <span className={cn("text-[12.5px] font-semibold tabular-nums", color)}>
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    </span>
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
  const color = isGood ? "text-[#0c6b3c]" : "text-[#a3530a]";
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums inline-flex items-center gap-1",
          color,
        )}
      >
        {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {positive ? "+" : ""}
        {value}%
      </span>
    </li>
  );
}

// ============================================================================
// Simulation
// ============================================================================

const SIM_LEARNERS = [
  "Tennis · Trung cấp",
  "Strength · Mới bắt đầu",
  "Recovery · Tất cả cấp độ",
];
const COACHES_BEFORE = [
  { name: "Sarah Jenkins", score: 94 },
  { name: "Elena Voss", score: 89 },
  { name: "Marcus Reed", score: 86 },
  { name: "Lila Bennett", score: 82 },
  { name: "Noah Park", score: 78 },
];
const COACHES_AFTER = [
  { name: "Sarah Jenkins", score: 97, change: 0 },
  { name: "Marcus Reed", score: 92, change: 1 },
  { name: "Elena Voss", score: 88, change: -1 },
  { name: "Noah Park", score: 85, change: 1 },
  { name: "Aiden Foster", score: 80, isNew: true, change: 0 },
];

function SimulationCard({
  shadow,
  setShadow,
  className,
}: {
  shadow: boolean;
  setShadow: (v: boolean) => void;
  className?: string;
}) {
  const [learner, setLearner] = useState(SIM_LEARNERS[0]);
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Beaker size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              So sánh ranking
            </h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              Mô hình hiện tại vs cấu hình đề xuất.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={learner}
              onChange={(e) => setLearner(e.target.value)}
              className="h-9 pl-3 pr-9 appearance-none bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-lg text-[13px] font-medium outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
              aria-label="Sample learner"
            >
              {SIM_LEARNERS.map((l) => (
                <option key={l} value={l}>
                  Learner mẫu: {l}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--color-border-soft)] bg-surface-container-lowest text-[13px] cursor-pointer">
            <Switch checked={shadow} onChange={() => setShadow(!shadow)} />
            <span className="font-medium">Shadow test</span>
          </label>
          <button className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-[#2c1eaa] transition-colors">
            <Play size={12} />
            Chạy mô phỏng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border-soft)]">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] uppercase tracking-wider font-semibold text-on-surface-variant">
              Mô hình hiện tại
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0c8a4d]" />
              Live · v3.2.1
            </span>
          </div>
          <ol className="space-y-1">
            {COACHES_BEFORE.map((c, i) => (
              <RankRow key={c.name} rank={i + 1} name={c.name} score={c.score} />
            ))}
          </ol>
        </div>
        <div className="p-5 bg-primary/[0.015]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] uppercase tracking-wider font-semibold text-primary">
              Cấu hình đề xuất
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Simulated
            </span>
          </div>
          <ol className="space-y-1">
            {COACHES_AFTER.map((c, i) => (
              <RankRow
                key={c.name}
                rank={i + 1}
                name={c.name}
                score={c.score}
                change={c.change}
                isNew={c.isNew}
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
}: {
  rank: number;
  name: string;
  score: number;
  change?: number;
  isNew?: boolean;
}) {
  const moveLabel =
    isNew
      ? { text: "Mới", tone: "bg-primary/10 text-primary" }
      : change && change > 0
        ? { text: `↑ ${change}`, tone: "bg-[#0c8a4d]/10 text-[#0c6b3c]" }
        : change && change < 0
          ? { text: `↓ ${Math.abs(change)}`, tone: "bg-[#d97706]/10 text-[#a3530a]" }
          : null;
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low/40 transition-colors">
      <span className="w-6 h-6 rounded-md text-[12px] font-semibold tabular-nums flex items-center justify-center shrink-0 bg-surface-container-low text-on-surface-variant">
        {rank}
      </span>
      <p className="text-[13.5px] font-medium truncate flex-1">{name}</p>
      {moveLabel && (
        <span
          className={cn(
            "text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
            moveLabel.tone,
          )}
        >
          {moveLabel.text}
        </span>
      )}
      <span className="text-[13.5px] font-semibold tabular-nums w-10 text-right">
        {score}
      </span>
    </li>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative w-8 h-[18px] rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        checked ? "bg-primary" : "bg-surface-container-high",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 inline-block w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[16px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ============================================================================
// Experiments
// ============================================================================

function ExperimentTable({
  reduce,
  className,
}: {
  reduce: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[11.5px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-semibold">Thí nghiệm</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold text-right">Lưu lượng</th>
              <th className="px-4 py-3 font-semibold">Tiến độ</th>
              <th className="px-4 py-3 font-semibold text-right">Lift</th>
              <th className="px-5 py-3 font-semibold text-right">Tuổi</th>
            </tr>
          </thead>
          <tbody>
            {EXPERIMENTS.map((e, i) => {
              const status = experimentStatus(e.status);
              const liftPositive = !e.lift.startsWith("−");
              return (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduce ? 0 : 0.3,
                    delay: reduce ? 0 : i * 0.04,
                    ease: EASE,
                  }}
                  className="border-b last:border-b-0 border-[var(--color-border-soft)] hover:bg-surface-container-low/30 transition-colors"
                >
                  <td className="px-5 py-4 align-middle">
                    <p className="text-[13.5px] font-semibold text-on-surface">
                      {e.name}
                    </p>
                    <p className="text-[11.5px] text-on-surface-variant font-mono mt-0.5">
                      {e.id}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <StatusBadge tone={status.tone} label={status.label} />
                  </td>
                  <td className="px-4 py-4 align-middle text-right text-[13px] font-semibold tabular-nums text-on-surface">
                    {e.traffic}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-2 max-w-[160px]">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            e.status === "rolled-back"
                              ? "bg-[#dc2626]"
                              : e.status === "promoted"
                                ? "bg-[#0c8a4d]"
                                : "bg-primary",
                          )}
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                      <span className="text-[11.5px] font-semibold tabular-nums text-on-surface-variant w-8 text-right">
                        {e.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle text-right">
                    <span
                      className={cn(
                        "text-[13px] font-semibold tabular-nums",
                        liftPositive ? "text-[#0c6b3c]" : "text-[#9d1414]",
                      )}
                    >
                      {e.lift}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle text-right text-[12.5px] text-on-surface-variant whitespace-nowrap">
                    {e.age}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function experimentStatus(s: (typeof EXPERIMENTS)[number]["status"]) {
  if (s === "running") return { label: "Đang chạy", tone: "info" as const };
  if (s === "promoted") return { label: "Phát hành", tone: "success" as const };
  return { label: "Hoàn tác", tone: "danger" as const };
}

function StatusBadge({
  tone,
  label,
}: {
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  label: string;
}) {
  const tones: Record<typeof tone, string> = {
    success: "bg-[#0c8a4d]/10 text-[#0c6b3c]",
    info: "bg-primary/10 text-primary",
    warning: "bg-[#d97706]/10 text-[#a3530a]",
    danger: "bg-[#dc2626]/10 text-[#9d1414]",
    neutral: "bg-surface-container-low text-on-surface-variant",
  };
  const dots: Record<typeof tone, string> = {
    success: "bg-[#0c8a4d]",
    info: "bg-primary",
    warning: "bg-[#d97706]",
    danger: "bg-[#dc2626]",
    neutral: "bg-on-surface-variant/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11.5px] font-semibold",
        tones[tone],
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dots[tone])} />
      {label}
    </span>
  );
}

// ============================================================================
// Risk Center
// ============================================================================

function RiskCenter({
  reduce,
  className,
}: {
  reduce: boolean;
  className?: string;
}) {
  const groups: { key: "high" | "med" | "info"; label: string }[] = [
    { key: "high", label: "Rủi ro cao" },
    { key: "med", label: "Cảnh báo" },
    { key: "info", label: "Thông tin" },
  ];
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#dc2626]/10 text-[#9d1414] flex items-center justify-center shrink-0">
            <ShieldAlert size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              Trung tâm rủi ro
            </h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              Quét tự động · cập nhật 2 phút trước.
            </p>
          </div>
        </div>
        <button className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-0.5">
          Xem tất cả
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="divide-y divide-[var(--color-border-soft)]">
        {groups.map((g) => {
          const items = RISK_ALERTS.filter((r) => r.severity === g.key);
          if (items.length === 0) return null;
          return (
            <div key={g.key}>
              <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
                  {g.label} ({items.length})
                </p>
              </div>
              <ul className="pb-2">
                {items.map((a, i) => (
                  <RiskItem
                    key={a.id}
                    alert={a}
                    delay={reduce ? 0 : i * 0.04}
                    reduce={reduce}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RiskItem({
  alert,
  delay,
  reduce,
}: {
  alert: (typeof RISK_ALERTS)[number];
  delay: number;
  reduce: boolean;
}) {
  const tone =
    alert.severity === "high"
      ? { dot: "bg-[#dc2626]", text: "text-[#9d1414]", iconBg: "bg-[#dc2626]/10" }
      : alert.severity === "med"
        ? {
            dot: "bg-[#d97706]",
            text: "text-[#a3530a]",
            iconBg: "bg-[#d97706]/10",
          }
        : { dot: "bg-primary", text: "text-primary", iconBg: "bg-primary/10" };
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, delay, ease: EASE }}
      className="group px-5 py-3 hover:bg-surface-container-low/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            tone.iconBg,
          )}
        >
          <AlertTriangle size={14} className={tone.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13.5px] font-semibold text-on-surface">
              {alert.title}
            </p>
            <span className="text-[12px] text-on-surface-variant whitespace-nowrap shrink-0">
              {alert.age}
            </span>
          </div>
          <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
            {alert.body}
          </p>
          <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
            <span
              className={cn(
                "text-[12px] font-semibold font-mono tabular-nums",
                tone.text,
              )}
            >
              {alert.metric}
            </span>
            <button
              className={cn(
                "text-[12px] font-semibold inline-flex items-center gap-0.5 hover:underline",
                tone.text,
              )}
            >
              Điều tra
              <ChevronRight size={12} />
            </button>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1.5 leading-relaxed">
            <span className="font-semibold text-on-surface">Đề xuất:</span>{" "}
            {alert.action}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

// ============================================================================
// Guardrails
// ============================================================================

function GuardrailsCard({
  guards,
  toggleGuard,
  className,
}: {
  guards: typeof GUARDS;
  toggleGuard: (id: string) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lock size={15} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              Chính sách & Guardrails
            </h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              Mọi thay đổi được audit và log.
            </p>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {guards.map((g) => {
          const sev =
            g.severity === "critical"
              ? { label: "Critical", tone: "bg-[#dc2626]/10 text-[#9d1414]" }
              : g.severity === "high"
                ? { label: "High", tone: "bg-[#d97706]/10 text-[#a3530a]" }
                : g.severity === "med"
                  ? { label: "Med", tone: "bg-primary/10 text-primary" }
                  : {
                      label: "Low",
                      tone: "bg-surface-container-low text-on-surface-variant",
                    };
          return (
            <li key={g.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        sev.tone,
                      )}
                    >
                      {sev.label}
                    </span>
                    <p className="text-[13.5px] font-semibold text-on-surface">
                      {g.label}
                    </p>
                    {g.locked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                        <Lock size={10} />
                        Khoá
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-on-surface-variant leading-relaxed mt-1">
                    {g.desc}
                  </p>
                  {g.compliance && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">
                      <FileText size={11} />
                      <span className="font-mono">{g.compliance}</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={g.enabled}
                  onChange={() => toggleGuard(g.id)}
                  disabled={g.locked}
                />
              </div>
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

function ActivityFeedCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <Activity size={15} className="text-on-surface-variant" />
          <h3 className="text-[15px] font-semibold tracking-tight">
            Nhật ký hoạt động
          </h3>
        </div>
        <button className="text-[12.5px] font-medium text-primary hover:underline inline-flex items-center gap-0.5">
          Audit log
          <ChevronRight size={12} />
        </button>
      </div>
      <ul className="px-2 py-2">
        {ACTIVITY_FEED.map((it, i) => {
          const tone =
            it.tone === "good"
              ? "text-[#0c6b3c] bg-[#0c8a4d]/10"
              : "text-primary bg-primary/10";
          return (
            <li
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low/30 transition-colors"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  tone,
                )}
              >
                <it.icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-on-surface leading-snug">
                  {it.label}
                </p>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
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

function DeployHistoryCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <GitBranch size={15} className="text-on-surface-variant" />
          <h3 className="text-[15px] font-semibold tracking-tight">
            Lịch sử triển khai
          </h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[11.5px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-semibold">Phiên bản</th>
              <th className="px-4 py-3 font-semibold">Thời gian</th>
              <th className="px-4 py-3 font-semibold text-right">Accuracy</th>
              <th className="px-4 py-3 font-semibold">Người triển khai</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-5 py-3 font-semibold text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {DEPLOY_HISTORY.map((d) => {
              const status =
                d.status === "active"
                  ? { label: "Đang chạy", tone: "success" as const }
                  : d.status === "rolled-back"
                    ? { label: "Đã hoàn tác", tone: "danger" as const }
                    : { label: "Lưu trữ", tone: "neutral" as const };
              return (
                <tr
                  key={d.version}
                  className="border-b last:border-b-0 border-[var(--color-border-soft)] hover:bg-surface-container-low/30 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-[13px] font-semibold">
                    {d.version}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-on-surface-variant whitespace-nowrap">
                    {d.time}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums">
                    {d.accuracy}%
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-mono text-on-surface-variant">
                    {d.by}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge tone={status.tone} label={status.label} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="h-7 px-2 inline-flex items-center gap-1 rounded text-[12px] font-medium hover:bg-surface-container-low text-on-surface-variant transition-colors"
                        title="Xem diff"
                      >
                        <FileText size={11} />
                        Diff
                      </button>
                      {d.status !== "rolled-back" && (
                        <button
                          className="h-7 px-2 inline-flex items-center gap-1 rounded text-[12px] font-medium hover:bg-[#dc2626]/10 text-[#9d1414] transition-colors"
                          title="Hoàn tác phiên bản này"
                        >
                          <RotateCcw size={11} />
                          Hoàn tác
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deploy-modal-title"
        className="w-full max-w-2xl rounded-2xl bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-[var(--color-border-soft)] flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Brain size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="deploy-modal-title"
              className="text-[18px] font-semibold tracking-tight"
            >
              Xem & triển khai cấu hình mô hình
            </h3>
            <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
              Kiểm tra môi trường, ảnh hưởng và các kiểm tra an toàn trước khi
              promote v3.2.2.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {step === "review" && (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <p className="text-[12px] uppercase tracking-wider font-semibold text-on-surface-variant mb-3">
                Môi trường đích
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
                        aria-pressed={active}
                        className={cn(
                          "text-left rounded-xl border p-3 transition-colors",
                          active
                            ? "border-primary bg-primary/[0.05]"
                            : "border-[var(--color-border-soft)] hover:bg-surface-container-low/40",
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full", meta.dot)}
                          />
                          <p className="text-[13px] font-semibold">
                            {meta.label}
                          </p>
                        </div>
                        <p className="text-[12px] text-on-surface-variant leading-snug">
                          {meta.desc}
                        </p>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Estimate icon={Clock} label="Train time" value="~6m" />
              <Estimate icon={Cpu} label="GPU usage" value="8 × A100" />
              <Estimate icon={Database} label="Chi phí ước tính" value="~$42" />
              <Estimate icon={Zap} label="Dịch vụ ảnh hưởng" value="3" />
            </div>

            <div className="rounded-xl border border-[var(--color-border-soft)] divide-y divide-[var(--color-border-soft)]">
              <SafetyCheck label="Pre-deployment tests" status="passed" />
              <SafetyCheck label="Bias audit" status="passed" />
              <SafetyCheck
                label="Diversity threshold"
                status="warn"
                note="Dự kiến −4% diversity"
              />
              <SafetyCheck label="Rollback plan sẵn sàng" status="passed" />
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={() => setRequireApproval(!requireApproval)}
                  className="mt-1 accent-primary"
                />
                <div>
                  <p className="text-[13px] font-semibold">
                    Yêu cầu phê duyệt bổ sung
                  </p>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed mt-0.5">
                    Gửi sign-off đến ops@ trước khi promote ra ngoài canary.
                  </p>
                </div>
              </label>

              {target === "production" && (
                <div className="rounded-xl bg-[#dc2626]/[0.05] border border-[#dc2626]/20 p-3.5 flex items-start gap-2.5">
                  <AlertTriangle
                    size={14}
                    className="text-[#9d1414] mt-0.5 shrink-0"
                  />
                  <p className="text-[12.5px] text-[#9d1414] leading-relaxed">
                    <span className="font-semibold">
                      Đây là deploy có rủi ro cao.
                    </span>{" "}
                    Production nhận 100% lưu lượng. Đề xuất triển khai sang
                    canary trước.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "deploying" && (
          <div className="p-10 flex flex-col items-center text-center">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <p className="text-[15px] font-semibold">
              Đang promote sang {ENV_META[target].label}…
            </p>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Chạy pre-deployment checks và làm nóng cache.
            </p>
          </div>
        )}

        {step === "review" && (
          <div className="px-6 py-4 border-t border-[var(--color-border-soft)] bg-surface-container-low/40 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[12px] text-on-surface-variant inline-flex items-center gap-1.5">
              <Info size={11} />
              Esc để huỷ · auto rollback nếu health check fail
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-lg border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={confirm}
                className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold shadow-[0_1px_2px_rgba(53,37,205,0.2),0_4px_12px_-4px_rgba(53,37,205,0.32)] hover:bg-[#2c1eaa] transition-colors"
              >
                Xác nhận triển khai
                <ArrowRight size={13} />
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
    <div className="rounded-xl border border-[var(--color-border-soft)] p-3">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
        <Icon size={11} />
        {label}
      </div>
      <p className="text-[15px] font-semibold tabular-nums mt-1 leading-none">
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
      ? { icon: Check, tone: "text-[#0c6b3c]", label: "Passed" }
      : status === "warn"
        ? { icon: AlertTriangle, tone: "text-[#a3530a]", label: "Warning" }
        : { icon: X, tone: "text-[#9d1414]", label: "Failed" };
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <meta.icon size={13} className={meta.tone} />
        <p className="text-[13px] font-semibold truncate">{label}</p>
        {note && (
          <span className="text-[12px] text-on-surface-variant truncate">
            · {note}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[11px] uppercase tracking-wider font-semibold",
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
      <div className="mx-auto max-w-[1400px] rounded-xl border border-on-surface/10 bg-on-surface/95 backdrop-blur-md text-white py-2.5 pl-4 pr-2 flex items-center justify-between gap-3 shadow-[0_12px_32px_-8px_rgba(15,15,30,0.4)] flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#fbbf24] animate-pulse" />
          <p className="text-[13px] font-semibold">
            Có thay đổi cấu hình chưa lưu
          </p>
          <span className="text-[12px] text-white/60">
            · Triển khai để áp dụng
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDiscard}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors"
          >
            <Undo2 size={12} />
            Huỷ thay đổi
          </button>
          <button className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors">
            <Save size={12} />
            Lưu nháp
          </button>
          <button
            onClick={onDeploy}
            className="h-8 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary text-[12.5px] font-semibold shadow-[0_2px_8px_-2px_rgba(53,37,205,0.5)] hover:bg-[#2c1eaa] transition-colors"
          >
            Xem & Triển khai
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

