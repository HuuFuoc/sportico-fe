"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Xmark } from "iconoir-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { RowSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { useCommunityPost } from "@/lib/social/hooks/useCommunity";
import { useAcceptApplication, useApplications, useRejectApplication } from "@/lib/social/hooks/useApplications";
import { APPLICATION_STATUS_BADGE_CLASS, APPLICATION_STATUS_LABELS } from "@/lib/social/labels";
import { formatDateTimeVn } from "@/lib/social/datetime";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CommunityApplicationStatus } from "@/lib/social/types";

const TABS: { value: CommunityApplicationStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Đang chờ" },
  { value: "accepted", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "cancelled", label: "Đã huỷ" },
];

export function ApplicationsManagerClient({ postId }: { postId: string }) {
  return (
    <AuthGuard>
      <ApplicationsManager postId={postId} />
    </AuthGuard>
  );
}

function ApplicationsManager({ postId }: { postId: string }) {
  const { data: post } = useCommunityPost(postId);
  const [status, setStatus] = useState<CommunityApplicationStatus | "">("");
  const [pageNumber, setPageNumber] = useState(1);

  const { data, isLoading, isError, refetch } = useApplications(postId, {
    status: status || null,
    pageNumber,
    pageSize: 20,
  });

  const acceptMutation = useAcceptApplication(postId);
  const rejectMutation = useRejectApplication(postId);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function handleAccept(applicationId: string) {
    setActingOn(applicationId);
    try {
      await acceptMutation.mutateAsync(applicationId);
      showSuccess("Đã duyệt đơn đăng ký.");
    } catch (err) {
      showApiError(err);
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(applicationId: string) {
    setActingOn(applicationId);
    try {
      await rejectMutation.mutateAsync(applicationId);
      showSuccess("Đã từ chối đơn đăng ký.");
    } catch (err) {
      showApiError(err);
    } finally {
      setActingOn(null);
    }
  }

  if (post && !post.canEdit) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <ErrorState title="Không có quyền truy cập" message="Chỉ chủ bài đăng mới có thể quản lý đơn đăng ký." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/community/posts/${postId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft width={16} height={16} />
        Quay lại bài đăng
      </Link>

      <h1 className="text-[20px] font-bold text-on-surface">Quản lý đơn đăng ký</h1>
      {post && (
        <p className="mt-1 text-[13px] text-on-surface-variant">
          {post.title} · {post.acceptedParticipants}/{post.maxParticipants ?? "∞"} người tham gia
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPageNumber(1);
            }}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              status === tab.value ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
        {isLoading && (
          <div className="divide-y divide-[var(--color-border-soft)]">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <EmptyState icon="inbox" title="Chưa có đơn đăng ký nào" className="border-0" />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="divide-y divide-[var(--color-border-soft)]">
            {data.items.map((app) => (
              <div key={app.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
                  {(app.applicant?.fullName ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-on-surface">
                    {app.applicant?.fullName || "Người dùng"}
                  </p>
                  {app.message && (
                    <p className="mt-0.5 truncate text-[12.5px] text-on-surface-variant">{app.message}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">{formatDateTimeVn(app.createdAt)}</p>
                </div>
                {app.status === "pending" ? (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleAccept(app.id)}
                      disabled={actingOn === app.id}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                      aria-label="Duyệt"
                    >
                      <Check width={16} height={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(app.id)}
                      disabled={actingOn === app.id}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                      aria-label="Từ chối"
                    >
                      <Xmark width={16} height={16} />
                    </button>
                  </div>
                ) : (
                  <span className={cn("shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold", APPLICATION_STATUS_BADGE_CLASS[app.status ?? ""])}>
                    {APPLICATION_STATUS_LABELS[app.status ?? ""] ?? app.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination pageNumber={data.pageNumber} totalPages={data.totalPages} onChange={setPageNumber} className="mt-4" />
      )}
    </div>
  );
}
