"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Command,
  Download,
  Eye,
  FileText,
  Filter,
  Fingerprint,
  Flag,
  Globe,
  IdCard,
  Info,
  Keyboard,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  PencilLine,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, relativeDay } from "@/lib/utils";
import { api, type VerificationKind } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, VerificationRequest } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type Risk = "low" | "med" | "high";
type Filter = "pending" | "approved" | "rejected" | "all";

const RISK_META: Record<
  Risk,
  {
    label: string;
    pill: string;
    dot: string;
    bar: string;
    tone: string;
  }
> = {
  low: {
    label: "Low risk",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
    bar: "bg-gradient-to-b from-[#10b981] to-[#34d399]",
    tone: "text-[#1f7a4d]",
  },
  med: {
    label: "Medium risk",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
    bar: "bg-gradient-to-b from-[#f59e0b] to-[#fb923c]",
    tone: "text-[#b95000]",
  },
  high: {
    label: "High risk",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
    bar: "bg-gradient-to-b from-[#ef4444] to-[#fb7185]",
    tone: "text-[#ba1a1a]",
  },
};

type EnrichedVerification = VerificationRequest & {
  risk: Risk;
  trustScore: number;
  progress: number;
};

function deterministicRisk(i: number): Risk {
  if (i % 5 === 0) return "high";
  if (i % 3 === 0) return "med";
  return "low";
}

export default function VerificationsPage() {
  const { data, loading, error, refetch } = useApiResource(
    () => Promise.all([api.fetchVerifications(), api.fetchCoaches()]),
    [],
  );
  const verificationsData = useMemo(() => data?.[0] ?? [], [data]);
  const coachById = useMemo(
    () => new Map((data?.[1] ?? []).map((c) => [c.id, c])),
    [data],
  );

  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  // Empty initial id is fine — `active` below falls back to the first item.
  const [activeId, setActiveId] = useState<string>("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // Optimistic moderation results — the fetched queue is read-only, so we overlay
  // approved/rejected ids locally and roll back on API failure (no refetch flicker).
  const [statusOverride, setStatusOverride] = useState<
    Record<string, VerificationRequest["status"]>
  >({});

  // Enrich verifications with synthetic risk + trust score
  const enriched = useMemo<EnrichedVerification[]>(
    () =>
      verificationsData.map((v, i) => {
        const risk = deterministicRisk(i);
        const trustScore =
          risk === "low" ? 92 - i * 2 : risk === "med" ? 72 - i : 48 - i;
        const progress = Math.min(100, 40 + i * 12);
        return {
          ...v,
          status: statusOverride[v.id] ?? v.status,
          risk,
          trustScore: Math.max(20, trustScore),
          progress,
        };
      }),
    [verificationsData, statusOverride],
  );

  const filtered = useMemo(() => {
    let list =
      filter === "all" ? enriched : enriched.filter((v) => v.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) =>
          v.coachName.toLowerCase().includes(q) ||
          v.sport.toLowerCase().includes(q),
      );
    }
    return list;
  }, [enriched, filter, query]);

  const active =
    filtered.find((v) => v.id === activeId) ?? filtered[0] ?? null;
  const coach = active ? (coachById.get(active.coachId) ?? null) : null;

  const navigate = (dir: 1 | -1) => {
    if (!active) return;
    const i = filtered.findIndex((v) => v.id === active.id);
    const next = (i + dir + filtered.length) % filtered.length;
    setActiveId(filtered[next]?.id ?? active.id);
  };

  const moderate = (
    item: EnrichedVerification,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    const id = item.id;
    const kind = (item.documents[0]?.type ?? "post") as VerificationKind;
    const prev = statusOverride[id];
    setStatusOverride((o) => ({ ...o, [id]: status }));
    const action =
      status === "approved"
        ? api.approveVerification(id, kind)
        : api.rejectVerification(id, kind, reason ?? "");
    void action.catch(() => {
      // Roll back to the prior override (or remove it entirely).
      setStatusOverride((o) => {
        const next = { ...o };
        if (prev === undefined) delete next[id];
        else next[id] = prev;
        return next;
      });
      showToast(`Không thể ${status === "approved" ? "duyệt" : "từ chối"} gói tập của ${item.coachName}`);
    });
  };

  const handleApprove = () => {
    if (!active) return;
    moderate(active, "approved");
    showToast(`Đã duyệt gói tập của ${active.coachName}`);
    navigate(1);
  };
  const openReject = () => setRejectOpen(true);
  const confirmReject = () => {
    setRejectOpen(false);
    if (active) {
      moderate(active, "rejected", rejectReason);
      showToast(`Đã từ chối gói tập của ${active.coachName}`);
    }
    setRejectReason("");
    navigate(1);
  };
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (rejectOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "a") {
        e.preventDefault();
        handleApprove();
      } else if (e.key === "r") {
        e.preventDefault();
        openReject();
      } else if (e.key === "j") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "k") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, filtered.length, rejectOpen]);

  if (loading) {
    return (
      <AppShell role="admin" title="Duyệt gói tập HLV">
        <LoadingState label="Đang tải hàng chờ duyệt gói tập…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="admin" title="Duyệt gói tập HLV">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin" title="Duyệt gói tập HLV">
      <div className="max-w-[1500px] mx-auto">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                <ShieldCheck size={11} />
                Kiểm duyệt nội dung
              </span>
              <span className="text-[12px] text-on-surface-variant">
                {filtered.length} gói trong hàng chờ
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[32px] leading-[1.05] font-bold tracking-tight">
              Duyệt gói tập HLV
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Kiểm tra, phê duyệt hoặc từ chối các gói tập do huấn luyện viên gửi lên.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <KeyboardHint />
            <button className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors">
              <CheckCircle2 size={13} />
              Duyệt hàng loạt
            </button>
          </div>
        </motion.header>

        {/* ============ 3-COLUMN LAYOUT ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_360px] gap-4 h-[calc(100vh-12rem)]">
          {/* ============ LEFT: QUEUE ============ */}
          <QueueColumn
            items={filtered}
            allItems={enriched}
            activeId={active?.id ?? ""}
            setActiveId={setActiveId}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            reduce={reduce ?? false}
          />

          {/* ============ CENTER: REVIEW ============ */}
          {active && coach ? (
            <ReviewPanel
              v={active}
              coach={coach}
              onApprove={handleApprove}
              onReject={openReject}
              onNext={() => navigate(1)}
              onPrev={() => navigate(-1)}
              reduce={reduce ?? false}
            />
          ) : (
            <EmptyCenter />
          )}

          {/* ============ RIGHT: AI TRUST PANEL ============ */}
          {active && (
            <TrustPanel v={active} reduce={reduce ?? false} />
          )}
        </div>
      </div>

      {/* ============ REJECT MODAL ============ */}
      <AnimatePresence>
        {rejectOpen && (
          <RejectModal
            coachName={active?.coachName ?? ""}
            reason={rejectReason}
            setReason={setRejectReason}
            onClose={() => setRejectOpen(false)}
            onConfirm={confirmReject}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>

      {/* ============ TOAST ============ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-on-surface text-white text-[13px] font-medium shadow-[0_8px_24px_-6px_rgba(15,15,30,0.4)]"
          >
            <CheckCircle2 size={14} className="text-[#34d399]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ============================================================================
// Keyboard hint
// ============================================================================

function KeyboardHint() {
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 h-10 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest text-[11px] text-on-surface-variant">
      <Keyboard size={12} />
      <Kbd>A</Kbd>
      duyệt
      <span className="text-on-surface-variant/40">·</span>
      <Kbd>R</Kbd>
      từ chối
      <span className="text-on-surface-variant/40">·</span>
      <Kbd>J</Kbd>
      <Kbd>K</Kbd>
      tiếp/trước
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md bg-surface-container-low border border-[var(--color-border-soft)] text-[10px] font-mono font-semibold text-on-surface">
      {children}
    </kbd>
  );
}

// ============================================================================
// Queue (left)
// ============================================================================

function QueueColumn({
  items,
  allItems,
  activeId,
  setActiveId,
  filter,
  setFilter,
  query,
  setQuery,
  reduce,
}: {
  items: EnrichedVerification[];
  allItems: EnrichedVerification[];
  activeId: string;
  setActiveId: (id: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  query: string;
  setQuery: (q: string) => void;
  reduce: boolean;
}) {
  const pending = allItems.filter((v) => v.status === "pending").length;
  const approved = allItems.filter((v) => v.status === "approved").length;
  const rejected = allItems.filter((v) => v.status === "rejected").length;
  const TABS: { id: Filter; label: string; count: number }[] = [
    { id: "pending", label: "Chờ duyệt", count: pending },
    { id: "approved", label: "Đã duyệt", count: approved },
    { id: "rejected", label: "Đã từ chối", count: rejected },
    { id: "all", label: "Tất cả", count: allItems.length },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_22px_-14px_rgba(15,15,30,0.08)] flex flex-col min-h-0 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
            Hàng chờ
          </p>
          <button className="text-[11px] text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1">
            <Filter size={11} />
            Sort
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên hoặc môn thể thao…"
            className="w-full h-9 pl-9 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[12.5px] placeholder:text-on-surface-variant transition-all"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 p-0.5 bg-surface-container-low rounded-[10px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "relative flex-1 inline-flex items-center justify-center gap-1 h-7 text-[11.5px] font-semibold rounded-[7px] transition-colors",
                filter === t.id
                  ? "text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {filter === t.id && (
                <motion.span
                  layoutId="verifTabPill"
                  className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                  transition={{
                    type: "spring",
                    duration: reduce ? 0 : 0.4,
                    bounce: 0.2,
                  }}
                />
              )}
              <span className="relative">{t.label}</span>
              <span
                className={cn(
                  "relative inline-flex items-center justify-center min-w-[16px] h-3.5 px-1 rounded-full text-[9px] font-bold tabular-nums",
                  filter === t.id
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto py-1.5">
        {items.length === 0 && (
          <li className="px-4 py-10 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-container-low flex items-center justify-center">
              <CheckCircle2 size={16} className="text-[#10b981]" />
            </div>
            <p className="text-[12.5px] font-semibold">Không có gói tập nào cần duyệt</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Không có mục nào phù hợp với bộ lọc.
            </p>
          </li>
        )}
        {items.map((v) => {
          const isActive = v.id === activeId;
          const risk = RISK_META[v.risk];
          return (
            <li key={v.id} className="px-1.5">
              <button
                onClick={() => setActiveId(v.id)}
                className={cn(
                  "relative w-full text-left px-2.5 py-2.5 rounded-[12px] transition-all flex items-start gap-2.5",
                  isActive
                    ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.02]"
                    : "hover:bg-surface-container-low/60",
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.span
                    layoutId="activeQueueBar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-primary"
                    transition={{
                      type: "spring",
                      duration: reduce ? 0 : 0.4,
                      bounce: 0.2,
                    }}
                  />
                )}

                {/* Risk bar */}
                <span
                  className={cn(
                    "w-[3px] rounded-full self-stretch shrink-0",
                    risk.bar,
                  )}
                />

                <img
                  src={v.coachAvatar}
                  alt={v.coachName}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-[12.5px] truncate",
                        isActive ? "font-bold" : "font-semibold",
                      )}
                    >
                      {v.coachName}
                    </p>
                    <span className="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">
                      {relativeDay(new Date(v.submittedAt))}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                    {v.sport} · {v.documents[0]?.name ?? "Gói tập"}
                  </p>

                  {/* Progress */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
                        style={{ width: `${v.progress}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] font-semibold tabular-nums text-on-surface-variant w-7 text-right">
                      {v.progress}%
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.aside>
  );
}

// ============================================================================
// Center review panel
// ============================================================================

type CoachLite = Coach;

function ReviewPanel({
  v,
  coach,
  onApprove,
  onReject,
  onNext,
  onPrev,
  reduce,
}: {
  v: EnrichedVerification;
  coach: CoachLite;
  onApprove: () => void;
  onReject: () => void;
  onNext: () => void;
  onPrev: () => void;
  reduce: boolean;
}) {
  return (
    <motion.section
      key={v.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      className="relative rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_22px_-14px_rgba(15,15,30,0.08)] flex flex-col min-h-0 overflow-hidden"
    >
      {/* Nav header */}
      <div className="px-5 sm:px-6 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between bg-surface-container-lowest/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={onNext}
            aria-label="Next"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <ArrowDown size={14} />
          </button>
          <span className="text-[11px] text-on-surface-variant ml-1 hidden sm:inline">
            <Kbd>J</Kbd> <Kbd>K</Kbd> để điều hướng
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Flag"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <Flag size={14} />
          </button>
          <button
            aria-label="More"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Identity */}
        <header className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-[#7d6dff] blur-lg opacity-25" />
            <img
              src={v.coachAvatar}
              alt={v.coachName}
              className="relative w-20 h-20 rounded-2xl object-cover ring-4 ring-surface-container-lowest shadow-[0_8px_20px_-4px_rgba(15,15,30,0.18)]"
            />
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface-container-lowest border-[3px] border-surface-container-lowest flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(15,15,30,0.15)]">
              <span
                className={cn(
                  "w-full h-full rounded-full flex items-center justify-center",
                  RISK_META[v.risk].bar,
                )}
              >
                {v.risk === "low" ? (
                  <ShieldCheck size={12} className="text-white" />
                ) : v.risk === "med" ? (
                  <AlertTriangle size={12} className="text-white" />
                ) : (
                  <ShieldAlert size={12} className="text-white" />
                )}
              </span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-tight">
                {v.coachName}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                  RISK_META[v.risk].pill,
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    RISK_META[v.risk].dot,
                  )}
                />
                {RISK_META[v.risk].label}
              </span>
            </div>
            <p className="text-[13px] text-on-surface-variant mt-1 inline-flex items-center gap-1.5">
              <span className="font-semibold text-on-surface">{v.sport}</span>
              <span>·</span>
              <MapPin size={12} />
              {coach.location}
              <span>·</span>
              <Clock size={12} />
              Submitted {relativeDay(new Date(v.submittedAt))}
            </p>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <Mini icon={Mail} label="Email" value={coach.email} />
              <Mini
                icon={BadgeCheck}
                label="Kinh nghiệm"
                value={`${coach.yearsExperience} năm`}
              />
              <Mini
                icon={Star}
                label="Đánh giá"
                value={coach.rating > 0 ? `${coach.rating.toFixed(1)} ★` : "—"}
              />
              <Mini
                icon={Globe}
                label="Địa điểm"
                value={coach.location.split(",").pop()?.trim() ?? "—"}
              />
            </div>
          </div>
        </header>

        {/* AI summary */}
        <AISummary v={v} />

        {/* Documents */}
        <DocumentsSection v={v} />

        {/* Timeline */}
        <TimelineSection v={v} />

        {/* Notes */}
        <NotesSection />
      </div>

      {/* Sticky action footer */}
      <div className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest/95 backdrop-blur-md px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-on-surface-variant">
          <Brain size={13} className="text-primary" />
          Đề xuất AI:{" "}
          <span
            className={cn(
              "font-bold",
              v.risk === "low"
                ? "text-[#1f7a4d]"
                : v.risk === "med"
                  ? "text-[#b95000]"
                  : "text-[#ba1a1a]",
            )}
          >
            {v.risk === "low"
              ? "Duyệt"
              : v.risk === "med"
                ? "Xem xét kỹ"
                : "Từ chối"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[#ffbbb3] bg-[#ffdad6]/30 hover:bg-[#ffdad6]/60 text-[#ba1a1a] text-[13px] font-semibold transition-colors"
          >
            <XCircle size={14} />
            Từ chối
            <Kbd>R</Kbd>
          </button>
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-br from-[#10b981] to-[#34d399] text-white text-[13px] font-semibold shadow-[0_4px_14px_-2px_rgba(16,185,129,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <CheckCircle2 size={14} strokeWidth={2.5} />
            Duyệt
            <Kbd>A</Kbd>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] bg-surface-container-low/50 p-3">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
        <Icon size={11} />
        {label}
      </div>
      <p className="text-[12.5px] font-semibold truncate mt-1">{value}</p>
    </div>
  );
}

// ============================================================================
// AI Summary banner
// ============================================================================

function AISummary({ v }: { v: EnrichedVerification }) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-4">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-2xl pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-[#7d6dff] blur-md opacity-40" />
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)]">
            <Sparkles size={16} className="text-on-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary">
              Phân tích AI
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
              {v.trustScore}% confidence
            </span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-on-surface">
            {v.risk === "low" ? (
              <>
                Gói tập có thông tin rõ ràng, đầy đủ.{" "}
                <span className="font-semibold">Mức giá và nội dung hợp lý</span>,
                không có dấu hiệu bất thường. Có thể duyệt.
              </>
            ) : v.risk === "med" ? (
              <>
                <span className="font-semibold">Một số điểm cần kiểm tra</span>{" "}
                — mô tả gói tập chưa đủ chi tiết hoặc mức giá chênh lệch so với thị trường. Nên xem xét kỹ trước khi duyệt.
              </>
            ) : (
              <>
                <span className="font-semibold text-[#ba1a1a]">
                  Phát hiện vấn đề nghiêm trọng
                </span>{" "}
                — thông tin không nhất quán, mức giá bất thường hoặc nội dung vi phạm quy định nền tảng.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Documents
// ============================================================================

const DOC_ICON: Record<string, typeof FileText> = {
  identity: IdCard,
  insurance: ShieldCheck,
  credential: BadgeCheck,
};

function DocumentsSection({ v }: { v: EnrichedVerification }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold tracking-tight">
          Thông tin gói tập{" "}
          <span className="text-on-surface-variant font-medium">
            ({v.documents.length})
          </span>
        </h3>
        <button className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
          <Download size={12} />
          Tải xuống
        </button>
      </div>
      <div className="space-y-2.5">
        {v.documents.map((d, i) => (
          <DocumentCard key={d.id} doc={d} index={i} risk={v.risk} />
        ))}
      </div>
    </section>
  );
}

function DocumentCard({
  doc,
  index,
  risk,
}: {
  doc: VerificationRequest["documents"][number];
  index: number;
  risk: Risk;
}) {
  const Icon = DOC_ICON[doc.type] ?? FileText;
  const validated = risk === "low" || index === 0;
  return (
    <article className="group rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest transition-colors overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        {/* Document thumbnail */}
        <div className="relative shrink-0 w-16 h-20 rounded-[10px] bg-gradient-to-br from-surface-container-low to-surface-container-high border border-[var(--color-border-soft)] overflow-hidden flex items-center justify-center">
          <Icon size={22} className="text-primary/70" />
          <span className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-primary/15 to-transparent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold truncate">{doc.name}</p>
              <p className="text-[11px] text-on-surface-variant capitalize mt-0.5">
                {doc.type === "training-package" ? "Gói tập" : doc.type}
              </p>
            </div>

            {/* Status pill */}
            {validated ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d] border border-[#bce8c8]">
                <CheckCircle2 size={10} />
                Hợp lệ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff5d6] text-[10px] font-semibold text-[#b95000] border border-[#f4d68a]/60">
                <AlertTriangle size={10} />
                Cần xem lại
              </span>
            )}
          </div>

          {/* OCR extracted */}
          <div className="mt-2.5 rounded-[10px] bg-surface-container-low/40 border border-[var(--color-border-soft)] p-2.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-1.5 inline-flex items-center gap-1">
              <Brain size={10} />
              Phân tích AI
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
              <OCRField label="Tên gói" value={doc.name} match />
              <OCRField label="Gửi lúc" value="Vừa gửi" />
              {doc.type === "training-package" && (
                <OCRField label="Loại" value="Gói tập" match />
              )}
              {doc.type !== "training-package" && (
                <OCRField label="Loại" value={doc.type} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md hover:bg-surface-container-low text-[11.5px] font-medium text-on-surface-variant hover:text-primary transition-colors">
              <Eye size={11} />
              Xem chi tiết
            </button>
            <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md hover:bg-surface-container-low text-[11.5px] font-medium text-on-surface-variant hover:text-primary transition-colors">
              <Download size={11} />
              Tải xuống
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function OCRField({
  label,
  value,
  match,
  warn,
  warnText,
}: {
  label: string;
  value: string;
  match?: boolean;
  warn?: boolean;
  warnText?: string;
}) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-on-surface-variant whitespace-nowrap">
        {label}:
      </span>
      <span
        className={cn(
          "font-semibold truncate",
          warn ? "text-[#b95000]" : "text-on-surface",
        )}
      >
        {value}
      </span>
      {match && (
        <CheckCircle2
          size={10}
          className="text-[#1f7a4d] shrink-0"
        />
      )}
      {warn && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#b95000] font-semibold shrink-0">
          <AlertTriangle size={9} />
          {warnText}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Timeline
// ============================================================================

function TimelineSection({ v }: { v: EnrichedVerification }) {
  const events = [
    {
      icon: Send,
      label: "HLV gửi gói tập",
      meta: relativeDay(new Date(v.submittedAt)),
      tone: "neutral" as const,
    },
    {
      icon: Brain,
      label: "AI phân tích nội dung",
      meta: "Tự động · ~5s",
      tone: "primary" as const,
    },
    {
      icon: Fingerprint,
      label: "Kiểm tra thông tin HLV",
      meta: "Tự động",
      tone: "good" as const,
    },
    {
      icon: BadgeCheck,
      label: "Kiểm tra mức giá thị trường",
      meta:
        v.risk === "high"
          ? "Bất thường"
          : "Trong khoảng phổ biến",
      tone: v.risk === "high" ? ("danger" as const) : ("good" as const),
    },
    {
      icon: Clock,
      label: "Chờ admin kiểm duyệt",
      meta: "Hiện tại",
      tone: "warn" as const,
      active: true,
    },
  ];
  return (
    <section>
      <h3 className="text-[15px] font-semibold tracking-tight mb-3">
        Lịch sử duyệt
      </h3>
      <div className="relative pl-5">
        <span className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--color-border-soft)]" />
        <div className="space-y-3.5">
          {events.map((e, i) => {
            const tone =
              e.tone === "good"
                ? "text-[#1f7a4d] bg-success-container"
                : e.tone === "warn"
                  ? "text-[#b95000] bg-[#fff5d6]"
                  : e.tone === "danger"
                    ? "text-[#ba1a1a] bg-[#ffdad6]"
                    : e.tone === "primary"
                      ? "text-primary bg-primary/10"
                      : "text-on-surface-variant bg-surface-container-low";
            return (
              <div
                key={i}
                className={cn(
                  "relative flex items-center gap-3",
                  e.active && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "absolute -left-[18px] w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest flex items-center justify-center",
                    e.active
                      ? "bg-primary shadow-[0_0_0_4px_rgba(53,37,205,0.12)]"
                      : "bg-surface-container-high",
                  )}
                />
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    tone,
                  )}
                >
                  <e.icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] truncate">{e.label}</p>
                </div>
                <span className="text-[11px] text-on-surface-variant whitespace-nowrap">
                  {e.meta}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Notes
// ============================================================================

function NotesSection() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <PencilLine size={13} className="text-on-surface-variant" />
        <h3 className="text-[15px] font-semibold tracking-tight">
          Ghi chú nội bộ
        </h3>
      </div>
      <textarea
        rows={3}
        placeholder="Thêm ghi chú nội bộ — chỉ admin thấy…"
        className="w-full px-4 py-3 bg-surface-container-low/40 border border-[var(--color-border-soft)] hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[12px] outline-none text-[13px] leading-relaxed resize-none transition-all"
      />
    </section>
  );
}

// ============================================================================
// Trust panel (right)
// ============================================================================

function TrustPanel({
  v,
  reduce,
}: {
  v: EnrichedVerification;
  reduce: boolean;
}) {
  const score = v.trustScore;
  const tone =
    score >= 80 ? "good" : score >= 60 ? "warn" : "danger";

  return (
    <motion.aside
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_22px_-14px_rgba(15,15,30,0.08)] flex flex-col min-h-0 overflow-hidden"
    >
      <div className="overflow-y-auto p-5 space-y-5">
        {/* Trust score gauge */}
        <TrustScore score={score} tone={tone} risk={v.risk} reduce={reduce} />

        {/* Fraud signals */}
        <FraudSignals risk={v.risk} />

        {/* AI reasoning */}
        <AIReasoning risk={v.risk} />

        {/* Verification checklist */}
        <VerificationChecklist risk={v.risk} />

        {/* Recommendation */}
        <Recommendation risk={v.risk} />
      </div>
    </motion.aside>
  );
}

function TrustScore({
  score,
  tone,
  risk,
  reduce,
}: {
  score: number;
  tone: "good" | "warn" | "danger";
  risk: Risk;
  reduce: boolean;
}) {
  const color =
    tone === "good" ? "#10b981" : tone === "warn" ? "#f59e0b" : "#ef4444";
  const trackColor = "var(--color-border-soft)";
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - score / 100);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-primary" />
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant">
          Điểm chất lượng AI
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={trackColor}
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p
              className="text-[28px] font-bold leading-none tabular-nums"
              style={{ color }}
            >
              {score}
            </p>
            <p className="text-[9.5px] uppercase tracking-wider font-semibold text-on-surface-variant mt-1">
              out of 100
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] font-bold border",
              RISK_META[risk].pill,
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                RISK_META[risk].dot,
              )}
            />
            {RISK_META[risk].label.toUpperCase()}
          </span>
          <p className="text-[11.5px] text-on-surface-variant leading-relaxed mt-2">
            {tone === "good"
              ? "Gói tập đạt tiêu chuẩn. Có thể duyệt."
              : tone === "warn"
                ? "Cần kiểm tra thêm trước khi duyệt."
                : "Phát hiện vấn đề nghiêm trọng. Nên từ chối."}
          </p>
        </div>
      </div>
    </section>
  );
}

function FraudSignals({ risk }: { risk: Risk }) {
  const signals =
    risk === "high"
      ? [
          { label: "Mức giá bất thường so với thị trường", level: "high" as const },
          { label: "Mô tả không rõ ràng / trùng lặp", level: "high" as const },
          { label: "Nội dung có thể vi phạm quy định", level: "med" as const },
        ]
      : risk === "med"
        ? [
            { label: "Số buổi / thời hạn chưa cân đối", level: "med" as const },
            { label: "Mô tả ngắn, thiếu chi tiết", level: "low" as const },
          ]
        : [];
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5">
          <ShieldAlert size={11} />
          Vấn đề phát hiện
        </p>
        <span
          className={cn(
            "text-[10.5px] font-bold tabular-nums",
            signals.length === 0 ? "text-[#1f7a4d]" : "text-[#ba1a1a]",
          )}
        >
          {signals.length}
        </span>
      </div>
      {signals.length === 0 ? (
        <div className="rounded-[12px] bg-success-container/30 border border-[#bce8c8] p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[#1f7a4d]" />
          <p className="text-[12px] font-semibold text-[#1f7a4d]">
            Không phát hiện vấn đề
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {signals.map((s) => {
            const tone =
              s.level === "high"
                ? "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]"
                : s.level === "med"
                  ? "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60"
                  : "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]";
            return (
              <li
                key={s.label}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border text-[11.5px]",
                  tone,
                )}
              >
                <span className="inline-flex items-center gap-1.5 truncate font-medium">
                  <AlertTriangle size={11} />
                  {s.label}
                </span>
                <span className="text-[9.5px] uppercase tracking-wider font-bold shrink-0">
                  {s.level}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AIReasoning({ risk }: { risk: Risk }) {
  const reasons =
    risk === "low"
      ? [
          { label: "Chất lượng nội dung", score: 98 },
          { label: "Mức giá phù hợp", score: 94 },
          { label: "Thông tin HLV hợp lệ", score: 90 },
          { label: "Tuân thủ quy định", score: 96 },
        ]
      : risk === "med"
        ? [
            { label: "Chất lượng nội dung", score: 88 },
            { label: "Mức giá phù hợp", score: 76 },
            { label: "Thông tin HLV hợp lệ", score: 70 },
            { label: "Tuân thủ quy định", score: 54 },
          ]
        : [
            { label: "Chất lượng nội dung", score: 42 },
            { label: "Mức giá phù hợp", score: 38 },
            { label: "Thông tin HLV hợp lệ", score: 30 },
            { label: "Tuân thủ quy định", score: 18 },
          ];
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5">
          <Brain size={11} />
          Phân tích chi tiết AI
        </p>
        <button className="text-[10.5px] text-on-surface-variant hover:text-primary inline-flex items-center gap-0.5 transition-colors">
          <Info size={10} />
          Why?
        </button>
      </div>
      <ul className="space-y-2">
        {reasons.map((r) => {
          const color =
            r.score >= 80 ? "#10b981" : r.score >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <li key={r.label}>
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span className="text-on-surface-variant truncate">
                  {r.label}
                </span>
                <span className="font-bold tabular-nums" style={{ color }}>
                  {r.score}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-container-low overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.score}%` }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VerificationChecklist({ risk }: { risk: Risk }) {
  const items = [
    { label: "HLV đã xác minh tài khoản", done: true },
    { label: "Tên gói tập rõ ràng", done: true },
    { label: "Mô tả đầy đủ", done: risk !== "high" },
    {
      label: "Mức giá hợp lý",
      done: risk !== "high",
    },
    {
      label: "Số buổi & thời hạn hợp lệ",
      done: risk === "low",
    },
    {
      label: "Không vi phạm quy định",
      done: risk === "low",
    },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5">
          <CheckCircle2 size={11} />
          Tiêu chí duyệt
        </p>
        <span className="text-[10.5px] font-bold text-on-surface-variant">
          {done}/{items.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-2 text-[12px]"
          >
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                it.done
                  ? "bg-gradient-to-br from-[#10b981] to-[#34d399] text-white"
                  : "bg-surface-container-low border border-dashed border-[var(--color-border-soft)]",
              )}
            >
              {it.done && <Check size={9} strokeWidth={3} />}
            </span>
            <span
              className={cn(
                it.done
                  ? "text-on-surface line-through decoration-on-surface-variant/40"
                  : "text-on-surface-variant",
              )}
            >
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Recommendation({ risk }: { risk: Risk }) {
  const text =
    risk === "low"
      ? "Gói tập đạt tiêu chuẩn nền tảng. Có thể duyệt ngay — nội dung rõ ràng, mức giá hợp lý."
      : risk === "med"
        ? "Có một số điểm chưa rõ ràng. Nên liên hệ HLV để làm rõ trước khi duyệt."
        : "Phát hiện vấn đề nghiêm trọng. Nên từ chối và yêu cầu HLV chỉnh sửa hoặc escalate nếu cần.";
  const tone =
    risk === "low"
      ? "from-[#10b981]/10 to-[#34d399]/5 border-[#10b981]/20"
      : risk === "med"
        ? "from-[#f59e0b]/10 to-[#fb923c]/5 border-[#f59e0b]/20"
        : "from-[#ef4444]/10 to-[#fb7185]/5 border-[#ef4444]/20";
  return (
    <section
      className={cn(
        "rounded-[14px] border bg-gradient-to-br p-3.5",
        tone,
      )}
    >
      <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5 mb-1.5">
        <Lightbulb size={11} className="text-primary" />
        Khuyến nghị
      </p>
      <p className="text-[12px] leading-relaxed text-on-surface">{text}</p>
    </section>
  );
}

// ============================================================================
// Reject Modal
// ============================================================================

const REJECT_REASONS = [
  "Mô tả gói tập không rõ ràng hoặc thiếu thông tin",
  "Mức giá không hợp lý so với thị trường",
  "Số buổi hoặc thời hạn không cân đối",
  "Nội dung vi phạm quy định nền tảng",
  "Thông tin HLV chưa được xác minh",
  "Lý do khác",
];

function RejectModal({
  coachName,
  reason,
  setReason,
  onClose,
  onConfirm,
  reduce,
}: {
  coachName: string;
  reason: string;
  setReason: (r: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  reduce: boolean;
}) {
  const [sending, setSending] = useState(false);
  const handleConfirm = () => {
    if (!reason) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onConfirm();
    }, 600);
  };
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
        className="w-full max-w-md rounded-[20px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
      >
        <div className="p-5 border-b border-[var(--color-border-soft)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#fb7185] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(239,68,68,0.45)]">
            <XCircle size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold tracking-tight">
              Từ chối gói tập
            </h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              {coachName} sẽ được thông báo với lý do đã chọn.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[11.5px] uppercase tracking-wider font-bold text-on-surface-variant">
            Lý do từ chối
          </p>
          <ul className="space-y-1.5">
            {REJECT_REASONS.map((r) => (
              <li key={r}>
                <button
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[10px] border transition-colors text-[12.5px]",
                    reason === r
                      ? "border-[#ef4444]/40 bg-[#ffdad6]/40 text-on-surface"
                      : "border-[var(--color-border-soft)] hover:bg-surface-container-low",
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                      reason === r
                        ? "border-[#ef4444]"
                        : "border-[var(--color-outline-variant)]",
                    )}
                  >
                    {reason === r && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                    )}
                  </span>
                  <span className="flex-1 truncate">{r}</span>
                </button>
              </li>
            ))}
          </ul>

          {reason === "Other" && (
            <textarea
              autoFocus
              rows={3}
              placeholder="Mô tả lý do từ chối…"
              className="w-full px-3 py-2 bg-surface-container-low/40 border border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13px] resize-none transition-all"
            />
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border-soft)] bg-surface-container-low/40 flex items-center justify-between gap-2">
          <span className="text-[11px] text-on-surface-variant inline-flex items-center gap-1">
            <Command size={11} />
            Nhấn Esc để hủy
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason || sending}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#fb7185] text-white text-[12.5px] font-semibold shadow-[0_4px_14px_-2px_rgba(239,68,68,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(239,68,68,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {sending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Đang gửi…
                </>
              ) : (
                <>
                  <XCircle size={13} />
                  Xác nhận từ chối
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Empty center
// ============================================================================

function EmptyCenter() {
  return (
    <section className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest flex items-center justify-center min-h-[400px]">
      <div className="text-center px-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(16,185,129,0.4)]">
          <CheckCircle2 size={24} className="text-white" />
        </div>
        <h3 className="text-[16px] font-semibold">Không có gói tập nào cần duyệt</h3>
        <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-sm">
          Chọn một gói tập từ danh sách bên trái để bắt đầu kiểm duyệt.
        </p>
      </div>
    </section>
  );
}
