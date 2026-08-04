"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, XmarkCircle } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { RowSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { Modal } from "@/components/social/Modal";
import { useAdminReports, useResolveReport } from "@/lib/social/hooks/useAdminReports";
import {
  REPORT_ACTIONS_BY_TARGET,
  REPORT_STATUS_BADGE_CLASS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_TYPE_LABELS,
} from "@/lib/social/labels";
import { formatDateTimeVn } from "@/lib/social/datetime";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AdminReportFilters, ReportAction, ReportResponse, ReportTargetType } from "@/lib/social/types";

export default function AdminReportsPage() {
  const [filters, setFilters] = useState<AdminReportFilters>({ pageNumber: 1, pageSize: 20 });
  const { data, isLoading, isError, refetch } = useAdminReports(filters);
  const [resolving, setResolving] = useState<ReportResponse | null>(null);

  return (
    <AppShell role="admin" title="Báo cáo vi phạm">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-[19px] font-bold text-on-surface">Hàng đợi báo cáo</h1>
        <p className="mt-0.5 text-[12.5px] text-on-surface-variant">Xử lý báo cáo từ người dùng đối với bài đăng, bình luận và tin nhắn.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={filters.targetType ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, targetType: (e.target.value || null) as ReportTargetType | null, pageNumber: 1 }))}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] focus:border-primary focus:outline-none"
          >
            <option value="">Mọi loại nội dung</option>
            {Object.entries(REPORT_TARGET_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || null) as AdminReportFilters["status"], pageNumber: 1 }))}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] focus:border-primary focus:outline-none"
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
          <div className="grid grid-cols-[0.9fr_1fr_1.4fr_0.8fr_0.9fr_0.6fr] gap-2 border-b border-[var(--color-border-soft)] bg-surface-container-high px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <span>Loại</span>
            <span>Lý do</span>
            <span>Mô tả</span>
            <span>Trạng thái</span>
            <span>Ngày báo cáo</span>
            <span></span>
          </div>

          {isLoading && (
            <div className="divide-y divide-[var(--color-border-soft)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="p-6">
              <ErrorState title="Không tải được danh sách" onRetry={() => refetch()} />
            </div>
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <EmptyState icon="task_alt" title="Không có báo cáo nào" className="border-0" />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <div className="divide-y divide-[var(--color-border-soft)]">
              {data.items.map((r) => (
                <div key={r.id} className="grid grid-cols-[0.9fr_1fr_1.4fr_0.8fr_0.9fr_0.6fr] items-center gap-2 px-4 py-3 text-[12.5px]">
                  <div>
                    <span className="block text-on-surface-variant">{REPORT_TARGET_TYPE_LABELS[r.targetType ?? ""] ?? r.targetType}</span>
                    {r.targetType === "community_post" && r.targetId ? (
                      <Link href={`/admin/community/posts/${r.targetId}`} className="font-mono text-[10.5px] text-primary hover:underline">
                        {r.targetId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="font-mono text-[10.5px] text-on-surface-variant">{r.targetId?.slice(0, 8) ?? "—"}</span>
                    )}
                  </div>
                  <span className="text-on-surface">{r.reason}</span>
                  <span className="truncate text-on-surface-variant">{r.description || "—"}</span>
                  <span className={cn("w-fit rounded-[6px] px-2 py-0.5 text-[11px] font-semibold", REPORT_STATUS_BADGE_CLASS[r.status ?? ""])}>
                    {REPORT_STATUS_LABELS[r.status ?? ""] ?? r.status}
                  </span>
                  <span className="text-on-surface-variant">{formatDateTimeVn(r.createdAt)}</span>
                  <div>
                    {r.status === "pending" || r.status === "reviewing" ? (
                      <button type="button" onClick={() => setResolving(r)} className="rounded-[6px] bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-primary/15">
                        Xử lý
                      </button>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">{r.actionTaken && r.actionTaken !== "none" ? r.actionTaken : "—"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <Pagination pageNumber={data.pageNumber} totalPages={data.totalPages} onChange={(page) => setFilters((f) => ({ ...f, pageNumber: page }))} className="mt-4" />
        )}
      </div>

      {resolving && <ResolveReportModal report={resolving} onClose={() => setResolving(null)} />}
    </AppShell>
  );
}

function ResolveReportModal({ report, onClose }: { report: ReportResponse; onClose: () => void }) {
  const resolveMutation = useResolveReport();
  const [status, setStatus] = useState<"resolved" | "rejected">("resolved");
  const [action, setAction] = useState<string>("none");
  const [note, setNote] = useState("");

  const targetType = (report.targetType ?? "community_post") as keyof typeof REPORT_ACTIONS_BY_TARGET;
  const actionOptions = REPORT_ACTIONS_BY_TARGET[targetType] ?? REPORT_ACTIONS_BY_TARGET.community_post;

  async function handleSubmit() {
    try {
      await resolveMutation.mutateAsync({
        reportId: report.id,
        payload: {
          status,
          resolutionNote: note.trim() || undefined,
          actionTaken: (status === "resolved" ? (action as ReportAction) : "none") ?? "none",
        },
      });
      showSuccess("Đã xử lý báo cáo.");
      onClose();
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Xử lý báo cáo"
      description={`Lý do: ${report.reason ?? "—"}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={resolveMutation.isPending}
            className="rounded-[8px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8] disabled:opacity-60"
          >
            {resolveMutation.isPending ? "Đang xử lý…" : "Xác nhận"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus("resolved")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12.5px] font-semibold", status === "resolved" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-[var(--color-border-soft)] text-on-surface-variant")}
          >
            <CheckCircle width={14} height={14} /> Xác nhận vi phạm
          </button>
          <button
            type="button"
            onClick={() => setStatus("rejected")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12.5px] font-semibold", status === "rejected" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-[var(--color-border-soft)] text-on-surface-variant")}
          >
            <XmarkCircle width={14} height={14} /> Từ chối báo cáo
          </button>
        </div>

        {status === "resolved" && (
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-on-surface">Hành động xử lý</p>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
              {actionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-on-surface">Ghi chú xử lý</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Ghi chú nội bộ…"
            className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}
