"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  EyeOff,
  Flag,
  Loader2,
  MessageSquare,
  Star,
  User,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";
import { messageForApiError } from "@/lib/errors-vi";
import type { Review, ReviewReport } from "@/types";
import type { ResolveReviewReportRequest } from "@/lib/backend/dto";

const EASE = [0.16, 1, 0.3, 1] as const;

type StatusFilter = "pending" | "reviewing" | "resolved" | "rejected";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Chờ xử lý" },
  { key: "reviewing", label: "Đang xem xét" },
  { key: "resolved", label: "Đã giải quyết" },
  { key: "rejected", label: "Đã từ chối" },
];

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  reviewing: "bg-blue-50 text-blue-700 border-blue-200",
  resolved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
};

const ACTION_BADGE: Record<string, string> = {
  none:           "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
  review_hidden:  "bg-amber-50 text-amber-700 border-amber-200",
  review_deleted: "bg-red-50 text-red-600 border-red-200",
};

const PAGE_SIZE = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-on-surface-variant/20"}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status.toLowerCase()] ?? STATUS_BADGE.pending;
  const labels: Record<string, string> = {
    pending: "Chờ xử lý",
    reviewing: "Đang xem xét",
    resolved: "Đã giải quyết",
    rejected: "Đã từ chối",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {labels[status.toLowerCase()] ?? status}
    </span>
  );
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

function ResolveModal({
  report,
  resolveName,
  onClose,
  onResolved,
}: {
  report: ReviewReport;
  resolveName: (id?: string) => string | undefined;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [action, setAction] = useState<"reject" | "resolve_keep" | "resolve_hide">("resolve_keep");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSettled =
    report.status === "resolved" || report.status === "rejected";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: ResolveReviewReportRequest = {
        isValid: action !== "reject",
        hideOrDeleteReview: action === "resolve_hide",
        resolutionNote: note.trim() || undefined,
      };
      await api.resolveReviewReport(report.id, body);
      showSuccess("Đã xử lý báo cáo.");
      onResolved();
    } catch (e) {
      showError(messageForApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const snap = report.reviewSnapshot;
  const reporterName = resolveName(report.reporterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="relative z-10 w-full max-w-[520px] rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_24px_60px_-12px_rgba(15,15,30,0.25)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary/[0.08]">
              <Flag size={15} className="text-primary" />
            </div>
            <p className="text-[14px] font-semibold text-on-surface">Giải quyết báo cáo</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[7px] p-1.5 text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Review snapshot */}
          {snap && (
            <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-on-surface truncate">
                  {resolveName(snap.learnerId) ??
                    snap.learnerName ??
                    `Học viên ${snap.learnerId.slice(0, 8)}`}
                </p>
                <StarRow rating={snap.rating} />
              </div>
              {snap.comment && (
                <p className="text-[12px] text-on-surface-variant line-clamp-3">
                  {snap.comment}
                </p>
              )}
              <p className="text-[11px] text-on-surface-variant/60">
                {new Date(snap.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          )}

          {/* Report reason */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
              Lý do báo cáo
            </p>
            <p className="text-[13px] text-on-surface">{report.reason}</p>
            {report.description && (
              <p className="text-[12px] text-on-surface-variant">{report.description}</p>
            )}
          </div>

          {/* Reporter (the coach who filed the report) */}
          {report.reporterId && (
            <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
              <User size={13} className="shrink-0 text-primary" />
              <span>
                Người báo cáo:{" "}
                <span className="font-medium text-on-surface">
                  {reporterName ?? `HLV ${report.reporterId.slice(0, 8)}`}
                </span>{" "}
                · Huấn luyện viên
              </span>
            </div>
          )}

          {isSettled ? (
            <div className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-2 text-[12px] text-on-surface-variant">
              Báo cáo này đã được xử lý.
              {report.resolutionNote && (
                <span> Ghi chú: {report.resolutionNote}</span>
              )}
            </div>
          ) : (
            <>
              {/* Action choice */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
                  Hành động
                </p>
                {([
                  ["reject", <XCircle key="xc" size={14} className="text-on-surface-variant" />, "Từ chối báo cáo", "Báo cáo không hợp lệ — review giữ nguyên"],
                  ["resolve_keep", <CheckCircle2 key="ck" size={14} className="text-emerald-600" />, "Xác nhận hợp lệ, giữ review", "Review vẫn hiển thị công khai"],
                  ["resolve_hide", <EyeOff key="eo" size={14} className="text-amber-600" />, "Xác nhận hợp lệ, ẩn review", "Review bị ẩn, rating được tính lại"],
                ] as const).map(([val, icon, label, desc]) => (
                  <button
                    key={val}
                    onClick={() => setAction(val)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[8px] border px-3 py-2.5 text-left transition-colors",
                      action === val
                        ? "border-primary/30 bg-primary/[0.05]"
                        : "border-[var(--color-border-soft)] hover:bg-surface-container-low",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-on-surface">{label}</p>
                      <p className="text-[11px] text-on-surface-variant">{desc}</p>
                    </div>
                    {action === val && (
                      <CheckCircle2 size={14} className="ml-auto mt-0.5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Resolution note */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[13px] outline-none focus:border-primary"
                  placeholder="Lý do giải quyết…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Confirm — hide review requires extra warning */}
              {action === "resolve_hide" && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">
                  Hành động này sẽ ẩn review và tính lại rating của coach.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary disabled:opacity-60"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Xác nhận
                </button>
                <button
                  onClick={onClose}
                  className="rounded-[8px] px-4 py-2 text-[13px] text-on-surface-variant hover:bg-surface-container-low"
                >
                  Huỷ
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Report row ────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  resolveName,
  onAction,
}: {
  report: ReviewReport;
  resolveName: (id?: string) => string | undefined;
  onAction: (r: ReviewReport) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const snap: Review | undefined = report.reviewSnapshot;
  const isSettled = report.status === "resolved" || report.status === "rejected";
  const reporterName = resolveName(report.reporterId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden"
    >
      {/* Row header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-container-low transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-50">
          <Flag size={14} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-on-surface truncate">
              {report.reason || "Không có lý do"}
            </p>
            <StatusBadge status={report.status} />
            {report.actionTaken && report.actionTaken !== "none" && (
              <span className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                ACTION_BADGE[report.actionTaken] ?? ACTION_BADGE.none,
              )}>
                {report.actionTaken === "review_hidden" ? (
                  <><EyeOff size={10} className="mr-1" />Đã ẩn review</>
                ) : report.actionTaken === "review_deleted" ? (
                  "Đã xoá review"
                ) : report.actionTaken}
              </span>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant tabular-nums">
            {new Date(report.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
        {!isSettled && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(report); }}
            className="shrink-0 rounded-[7px] border border-primary/25 bg-primary/[0.06] px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary/[0.1] transition-colors"
          >
            Giải quyết
          </button>
        )}
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-on-surface-variant transition-transform", expanded && "rotate-180")}
        />
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border-soft)] px-4 pb-4 pt-3 space-y-3">
              {/* Description */}
              {report.description && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">Mô tả</p>
                  <p className="text-[13px] text-on-surface-variant">{report.description}</p>
                </div>
              )}

              {/* Reporter (the coach who filed the report) */}
              {report.reporterId && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">Người báo cáo</p>
                  <div className="flex items-center gap-2 text-[13px] text-on-surface">
                    <User size={13} className="shrink-0 text-primary" />
                    {reporterName ?? `HLV ${report.reporterId.slice(0, 8)}`}
                    <span className="text-[12px] text-on-surface-variant">· Huấn luyện viên</span>
                  </div>
                </div>
              )}

              {/* Review snapshot */}
              {snap ? (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">Review bị báo cáo</p>
                  <div className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-on-surface">
                        {resolveName(snap.learnerId) ??
                          snap.learnerName ??
                          `Học viên ${snap.learnerId.slice(0, 8)}`}
                      </p>
                      <StarRow rating={snap.rating} />
                    </div>
                    {snap.comment && (
                      <p className="text-[12px] text-on-surface-variant">{snap.comment}</p>
                    )}
                    <p className="text-[11px] text-on-surface-variant/60">
                      {new Date(snap.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-on-surface-variant italic">Không có snapshot review.</p>
              )}

              {/* Resolution info */}
              {isSettled && (
                <div className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-2 space-y-1">
                  <p className="text-[11px] font-semibold text-on-surface-variant">Kết quả xử lý</p>
                  {report.resolutionNote && (
                    <p className="text-[12px] text-on-surface">{report.resolutionNote}</p>
                  )}
                  {report.handledAt && (
                    <p className="text-[11px] text-on-surface-variant tabular-nums">
                      {new Date(report.handledAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resolving, setResolving] = useState<ReviewReport | null>(null);

  const { data, loading, error } = useApiResource(
    () => api.fetchReviewReports({ status: statusFilter, pageNumber: page, pageSize: PAGE_SIZE }),
    [statusFilter, page, refreshKey],
  );

  const reports = data?.items ?? [];
  const hasNext = data?.hasNext ?? false;
  const totalCount = data?.totalCount ?? 0;

  // Resolve reviewer (learner) + reporter (coach) display names by id.
  // The report payload only carries ids; GET /api/users/{id} is cached so the
  // lookups are cheap and de-duped across reports.
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = [
      ...new Set(
        reports
          .flatMap((r) => [r.reporterId, r.reviewSnapshot?.learnerId])
          .filter((x): x is string => !!x),
      ),
    ];
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(
      ids.map(
        async (id) => [id, (await api.fetchUserProfile(id))?.name ?? ""] as const,
      ),
    ).then((entries) => {
      if (cancelled) return;
      setUserNames((prev) => {
        const next = { ...prev };
        for (const [id, name] of entries) next[id] = name;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reports]);

  const resolveName = useCallback(
    (id?: string): string | undefined => (id && userNames[id]) || undefined,
    [userNames],
  );

  const handleTabChange = useCallback((tab: StatusFilter) => {
    setStatusFilter(tab);
    setPage(1);
  }, []);

  const handleResolved = useCallback(() => {
    setResolving(null);
    setRefreshKey((k) => k + 1);
    setPage(1);
  }, []);

  return (
    <AppShell role="admin" title="Báo cáo đánh giá">
      <div className="mx-auto max-w-[900px] space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-on-surface">Báo cáo đánh giá</h1>
              <p className="text-[12px] text-on-surface-variant">
                Xem xét và xử lý báo cáo từ huấn luyện viên
              </p>
            </div>
          </div>
          {totalCount > 0 && (
            <span className="rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-1 text-[12px] tabular-nums text-on-surface-variant">
              {totalCount} báo cáo
            </span>
          )}
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex-1 rounded-[7px] py-2 text-[13px] font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && <LoadingState label="Đang tải báo cáo…" />}
        {!loading && error && (
          <ErrorState message="Không tải được danh sách báo cáo." onRetry={() => setRefreshKey((k) => k + 1)} />
        )}
        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--color-border-soft)] py-16 text-center">
            <Flag size={28} className="mb-3 text-on-surface-variant/30" />
            <p className="text-[14px] font-semibold text-on-surface-variant">
              Không có báo cáo nào
            </p>
            <p className="mt-1 text-[12px] text-on-surface-variant/60">
              Không có báo cáo nào ở trạng thái này.
            </p>
          </div>
        )}
        {!loading && !error && reports.length > 0 && (
          <div className="space-y-2">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                resolveName={resolveName}
                onAction={setResolving}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && (hasNext || page > 1) && (
          <div className="flex justify-center gap-3">
            {page > 1 && (
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-2 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                ← Trang trước
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-2 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Trang tiếp →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resolve modal */}
      <AnimatePresence>
        {resolving && (
          <ResolveModal
            report={resolving}
            resolveName={resolveName}
            onClose={() => setResolving(null)}
            onResolved={handleResolved}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
