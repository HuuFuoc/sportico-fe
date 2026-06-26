"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Command,
  FileText,
  Globe,
  Landmark,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Search,
  ShieldCheck,
  Star,
  Tag,
  Target,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, formatCurrency, relativeDay } from "@/lib/utils";
import {
  levelLabel,
  goalTypeLabel,
  sessionStatusLabel,
} from "@/lib/training-package-api";
import { api, type VerificationKind } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showError } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, VerificationRequest } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = "pending" | "approved" | "rejected" | "all";

// ---------------------------------------------------------------------------
// Kind metadata — every label/icon maps to a real backend moderation queue.
// ---------------------------------------------------------------------------

type Kind = NonNullable<VerificationRequest["kind"]>;

const KIND_META: Record<
  Kind,
  { label: string; short: string; icon: typeof Package; pill: string }
> = {
  "training-package": {
    label: "Gói huấn luyện",
    short: "Gói tập",
    icon: Package,
    pill: "bg-primary/10 text-primary border-primary/15",
  },
  post: {
    label: "Bài đăng",
    short: "Bài đăng",
    icon: Megaphone,
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
  },
  "payout-account": {
    label: "Tài khoản nhận tiền",
    short: "Tài khoản",
    icon: Landmark,
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
  },
};

function kindOf(v: VerificationRequest): Kind {
  const k = v.kind ?? v.documents[0]?.type;
  if (k === "training-package" || k === "post" || k === "payout-account") {
    return k;
  }
  return "training-package";
}

function vndOrDash(price?: number): string {
  if (price == null) return "—";
  return formatCurrency(price, "VND");
}

/** ISO datetime → compact "dd/MM HH:mm" for the fixed-schedule list. */
function fmtScheduleTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO date → "dd/MM/yyyy". */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
  const [activeId, setActiveId] = useState<string>("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // Optimistic moderation results — the fetched queue is read-only, so we overlay
  // approved/rejected ids locally and roll back on API failure (no refetch flicker).
  const [statusOverride, setStatusOverride] = useState<
    Record<string, VerificationRequest["status"]>
  >({});

  // Apply local status overrides + resolve the real coach name from the public
  // directory when available (the moderation DTOs carry only a coachId).
  // Only show training-package and post kinds — payout-account is handled
  // by /admin/bank-verifications.
  const items = useMemo<VerificationRequest[]>(
    () =>
      verificationsData
        .filter((v) => {
          const k = kindOf(v);
          return k === "training-package" || k === "post";
        })
        .map((v) => {
          const coach = coachById.get(v.coachId);
          return {
            ...v,
            status: statusOverride[v.id] ?? v.status,
            coachName: coach?.name ?? v.coachName,
            coachAvatar: coach?.avatarUrl ?? v.coachAvatar,
          };
        }),
    [verificationsData, coachById, statusOverride],
  );

  const filtered = useMemo(() => {
    let list =
      filter === "all" ? items : items.filter((v) => v.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) =>
          v.coachName.toLowerCase().includes(q) ||
          v.sport.toLowerCase().includes(q) ||
          (v.title ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, query]);

  const active = filtered.find((v) => v.id === activeId) ?? filtered[0] ?? null;
  const coach = active ? (coachById.get(active.coachId) ?? null) : null;

  const navigate = (dir: 1 | -1) => {
    if (!active || filtered.length === 0) return;
    const i = filtered.findIndex((v) => v.id === active.id);
    const next = (i + dir + filtered.length) % filtered.length;
    setActiveId(filtered[next]?.id ?? active.id);
  };

  const moderate = (
    item: VerificationRequest,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    const id = item.id;
    const kind = kindOf(item) as VerificationKind;
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
      showError(
        `Không thể ${status === "approved" ? "duyệt" : "từ chối"} mục của ${item.coachName}`,
      );
    });
  };

  const handleApprove = () => {
    if (!active) return;
    moderate(active, "approved");
    showSuccess(`Đã duyệt mục của ${active.coachName}`);
    navigate(1);
  };
  const openReject = () => {
    if (active) setRejectOpen(true);
  };
  const confirmReject = () => {
    setRejectOpen(false);
    if (active) {
      moderate(active, "rejected", rejectReason);
      showSuccess(`Đã từ chối mục của ${active.coachName}`);
    }
    setRejectReason("");
    navigate(1);
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
      <AppShell role="admin" title="Duyệt gói tập & bài đăng">
        <LoadingState label="Đang tải hàng chờ kiểm duyệt…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="admin" title="Duyệt gói tập & bài đăng">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin" title="Duyệt gói tập & bài đăng">
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
              <span className="text-[12px] text-on-surface-variant tabular-nums">
                {filtered.length} mục trong hàng chờ
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[32px] leading-[1.05] font-bold tracking-tight">
              Duyệt gói tập & bài đăng
            </h1>
            <p className="text-[13px] text-on-surface-variant mt-1">
              Kiểm tra & phê duyệt gói huấn luyện và bài đăng do huấn luyện viên gửi lên.
            </p>
          </div>
          <KeyboardHint />
        </motion.header>

        {/* ============ 3-COLUMN LAYOUT ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_340px] gap-4 h-[calc(100vh-12rem)]">
          {/* LEFT: QUEUE */}
          <QueueColumn
            items={filtered}
            allItems={items}
            activeId={active?.id ?? ""}
            setActiveId={setActiveId}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            reduce={reduce ?? false}
          />

          {/* CENTER: REVIEW */}
          {active ? (
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

          {/* RIGHT: SUBMISSION INFO */}
          {active && <InfoPanel v={active} reduce={reduce ?? false} />}
        </div>
      </div>

      {/* REJECT MODAL */}
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

    </AppShell>
  );
}

// ============================================================================
// Keyboard hint
// ============================================================================

function KeyboardHint() {
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 h-10 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest text-[11px] text-on-surface-variant shrink-0">
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
  items: VerificationRequest[];
  allItems: VerificationRequest[];
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
        <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-3">
          Hàng chờ
        </p>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, môn, tiêu đề…"
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
            <p className="text-[12.5px] font-semibold">Hàng chờ trống</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Không có mục nào phù hợp với bộ lọc.
            </p>
          </li>
        )}
        {items.map((v) => {
          const isActive = v.id === activeId;
          const meta = KIND_META[kindOf(v)];
          const Icon = meta.icon;
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
                    {v.title ?? meta.label}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold border",
                        meta.pill,
                      )}
                    >
                      <Icon size={9} />
                      {meta.short}
                    </span>
                    {v.price != null && (
                      <span className="text-[10px] font-bold tabular-nums text-on-surface">
                        {vndOrDash(v.price)}
                      </span>
                    )}
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

function ReviewPanel({
  v,
  coach,
  onApprove,
  onReject,
  onNext,
  onPrev,
  reduce,
}: {
  v: VerificationRequest;
  coach: Coach | null;
  onApprove: () => void;
  onReject: () => void;
  onNext: () => void;
  onPrev: () => void;
  reduce: boolean;
}) {
  const meta = KIND_META[kindOf(v)];
  const KindIcon = meta.icon;
  const location = coach?.location ?? v.location;

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
            aria-label="Trước"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={onNext}
            aria-label="Tiếp"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <ArrowDown size={14} />
          </button>
          <span className="text-[11px] text-on-surface-variant ml-1 hidden sm:inline">
            <Kbd>J</Kbd> <Kbd>K</Kbd> để điều hướng
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
            meta.pill,
          )}
        >
          <KindIcon size={12} />
          {meta.label}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Identity */}
        <header className="flex items-start gap-4">
          <img
            src={v.coachAvatar}
            alt={v.coachName}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-surface-container-lowest shadow-[0_8px_20px_-4px_rgba(15,15,30,0.18)] shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-tight">
                {v.coachName}
              </h2>
              {coach?.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border bg-success-container text-[#1f7a4d] border-[#bce8c8]">
                  <BadgeCheck size={11} />
                  Đã xác minh
                </span>
              )}
            </div>
            <p className="text-[13px] text-on-surface-variant mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-on-surface">{v.sport}</span>
              {location && (
                <>
                  <span>·</span>
                  <MapPin size={12} />
                  {location}
                </>
              )}
              <span>·</span>
              <Clock size={12} />
              Gửi {relativeDay(new Date(v.submittedAt))}
            </p>

            {/* Coach quick stats — only what the directory really returns */}
            {coach && (
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
                  value={coach.rating > 0 ? `${coach.rating.toFixed(1)} ★` : "Chưa có"}
                />
                <Mini
                  icon={Globe}
                  label="Địa điểm"
                  value={coach.location.split(",").pop()?.trim() || "—"}
                />
              </div>
            )}
          </div>
        </header>

        {/* Submission detail — REAL backend fields */}
        <SubmissionDetail v={v} />

        {/* Description */}
        {v.notes && (
          <section>
            <h3 className="text-[15px] font-semibold tracking-tight mb-2 inline-flex items-center gap-1.5">
              <FileText size={14} className="text-on-surface-variant" />
              {kindOf(v) === "payout-account" ? "Chủ tài khoản" : "Mô tả"}
            </h3>
            <p className="text-[13.5px] leading-relaxed text-on-surface whitespace-pre-wrap rounded-[12px] bg-surface-container-low/40 border border-[var(--color-border-soft)] p-4">
              {v.notes}
            </p>
          </section>
        )}
      </div>

      {/* Sticky action footer */}
      <div className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest/95 backdrop-blur-md px-5 sm:px-6 py-3 flex items-center justify-end gap-2">
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
// Submission detail — real fields, varies by kind
// ============================================================================

function SubmissionDetail({ v }: { v: VerificationRequest }) {
  const kind = kindOf(v);
  const facts: { icon: typeof Tag; label: string; value: string }[] = [];

  if (v.title) facts.push({ icon: Tag, label: "Tiêu đề", value: v.title });
  if (v.price != null)
    facts.push({ icon: Tag, label: "Giá", value: vndOrDash(v.price) });
  if (v.sessionCount != null)
    facts.push({ icon: Layers, label: "Số buổi", value: `${v.sessionCount} buổi` });
  if (v.startDate || v.endDate)
    facts.push({
      icon: CalendarClock,
      label: "Thời gian",
      value: `${fmtDate(v.startDate)} – ${fmtDate(v.endDate)}`,
    });
  else if (v.durationDays != null)
    facts.push({ icon: Timer, label: "Thời hạn", value: `${v.durationDays} ngày` });
  if (v.level)
    facts.push({ icon: BadgeCheck, label: "Cấp độ", value: levelLabel(v.level) });
  if (v.goalType)
    facts.push({ icon: Target, label: "Mục tiêu", value: goalTypeLabel(v.goalType) });
  if (v.isOnline != null)
    facts.push({
      icon: Globe,
      label: "Hình thức",
      value: v.isOnline ? "Trực tuyến" : "Trực tiếp",
    });
  if (v.location)
    facts.push({ icon: MapPin, label: "Địa điểm", value: v.location });

  const heading =
    kind === "post"
      ? "Chi tiết bài đăng"
      : kind === "payout-account"
        ? "Chi tiết tài khoản"
        : "Chi tiết gói tập";

  const sessions = v.sessions ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight mb-3">{heading}</h3>
        {facts.length === 0 ? (
          <p className="text-[12.5px] text-on-surface-variant rounded-[12px] bg-surface-container-low/40 border border-[var(--color-border-soft)] p-4">
            Mục này không kèm thông tin chi tiết.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {facts.map((f) => (
              <div
                key={f.label}
                className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3"
              >
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                  <f.icon size={11} />
                  {f.label}
                </div>
                <p className="text-[13px] font-semibold mt-1 tabular-nums break-words">
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed schedule — the heart of the new package model. Admin reviews the
          exact lessons before approving. */}
      {kind === "training-package" && sessions.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight mb-3 inline-flex items-center gap-1.5">
            <CalendarClock size={14} className="text-on-surface-variant" />
            Lịch học cố định
            <span className="text-[12px] font-normal text-on-surface-variant tabular-nums">
              ({sessions.length} buổi)
            </span>
          </h3>
          <ul className="space-y-2">
            {sessions.map((s) => {
              const statusVi = sessionStatusLabel(s.status);
              return (
                <li
                  key={s.sessionNumber}
                  className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center tabular-nums">
                        {s.sessionNumber}
                      </span>
                      {fmtScheduleTime(s.startTime)} – {fmtScheduleTime(s.endTime)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-on-surface-variant">
                      {s.isOnline ? <Globe size={12} /> : <MapPin size={12} />}
                      {s.isOnline ? "Trực tuyến" : "Trực tiếp"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-on-surface-variant">
                    {s.maxParticipants != null && (
                      <span className="inline-flex items-center gap-1">
                        <Layers size={11} />
                        Tối đa {s.maxParticipants} học viên
                      </span>
                    )}
                    {s.isOnline
                      ? s.meetingUrl && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                            <Globe size={11} />
                            {s.meetingUrl}
                          </span>
                        )
                      : s.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} />
                            {s.location}
                          </span>
                        )}
                    {statusVi && (
                      <span className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-0.5 text-[10.5px] font-medium">
                        {statusVi}
                      </span>
                    )}
                  </div>
                  {s.note && (
                    <p className="mt-1.5 text-[11.5px] text-on-surface-variant italic">
                      {s.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Info panel (right) — real submission recap + completeness checklist
// ============================================================================

function InfoPanel({ v, reduce }: { v: VerificationRequest; reduce: boolean }) {
  const kind = kindOf(v);
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;

  // Real completeness checks — purely from the fields the backend returned.
  const checks: { label: string; done: boolean }[] = [
    { label: "Có tiêu đề", done: Boolean(v.title) },
    { label: "Có mô tả", done: Boolean(v.notes) },
  ];
  if (kind !== "payout-account") {
    checks.push({ label: "Giá hợp lệ", done: (v.price ?? 0) > 0 });
  }
  if (kind === "training-package") {
    checks.push({ label: "Có số buổi", done: (v.sessionCount ?? 0) > 0 });
    checks.push({ label: "Có thời hạn", done: (v.durationDays ?? 0) > 0 });
    checks.push({ label: "Đã chọn cấp độ", done: Boolean(v.level) });
  }
  const done = checks.filter((c) => c.done).length;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_22px_-14px_rgba(15,15,30,0.08)] flex flex-col min-h-0 overflow-hidden"
    >
      <div className="overflow-y-auto p-5 space-y-5">
        {/* Kind + meta */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <KindIcon size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight">
                {meta.label}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Cần admin kiểm duyệt
              </p>
            </div>
          </div>

          <dl className="space-y-1.5 text-[12px]">
            <InfoRow icon={Tag} label="Mã" value={v.id} mono />
            <InfoRow
              icon={CalendarClock}
              label="Ngày gửi"
              value={new Date(v.submittedAt).toLocaleDateString("vi-VN")}
            />
            {v.price != null && (
              <InfoRow icon={Tag} label="Giá" value={vndOrDash(v.price)} />
            )}
          </dl>
        </section>

        {/* Completeness checklist — derived from real fields only */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5">
              <CheckCircle2 size={11} />
              Mức độ đầy đủ
            </p>
            <span className="text-[10.5px] font-bold text-on-surface-variant tabular-nums">
              {done}/{checks.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {checks.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-[12px]">
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
                    it.done ? "text-on-surface" : "text-on-surface-variant",
                  )}
                >
                  {it.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-on-surface-variant leading-relaxed mt-3">
            Danh sách này tổng hợp từ dữ liệu HLV đã gửi — quyết định duyệt vẫn do
            admin xem xét.
          </p>
        </section>
      </div>
    </motion.aside>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
        <Icon size={11} />
        {label}
      </span>
      <span
        className={cn(
          "text-on-surface font-semibold text-right truncate max-w-[170px]",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Reject Modal
// ============================================================================

const REJECT_REASONS = [
  "Mô tả không rõ ràng hoặc thiếu thông tin",
  "Mức giá không hợp lý so với thị trường",
  "Số buổi hoặc thời hạn không cân đối",
  "Nội dung vi phạm quy định nền tảng",
  "Thông tin chưa được xác minh",
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
    }, 400);
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
            <h3 className="text-[16px] font-bold tracking-tight">Từ chối mục</h3>
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              {coachName} sẽ được thông báo với lý do đã chọn.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
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
        <h3 className="text-[16px] font-semibold">Không có mục nào cần duyệt</h3>
        <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-sm">
          Chọn một mục từ danh sách bên trái để bắt đầu kiểm duyệt.
        </p>
      </div>
    </section>
  );
}
