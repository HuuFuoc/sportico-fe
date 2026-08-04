"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, WarningTriangle } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { RowSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { PostStatusBadge } from "@/components/social/community/PostStatusBadge";
import { useAdminCommunityPosts } from "@/lib/social/hooks/useAdminCommunity";
import { POST_TYPE_LABELS } from "@/lib/social/labels";
import { COMMUNITY_POST_TYPES } from "@/lib/social/validation/community";
import { formatDateVn } from "@/lib/social/datetime";
import type { AdminCommunityPostFilters } from "@/lib/social/types";

export default function AdminCommunityPage() {
  const [filters, setFilters] = useState<AdminCommunityPostFilters>({ pageNumber: 1, pageSize: 20 });
  const { data, isLoading, isError, refetch } = useAdminCommunityPosts(filters);

  return (
    <AppShell role="admin" title="Kiểm duyệt cộng đồng">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-[19px] font-bold text-on-surface">Kiểm duyệt bài đăng cộng đồng</h1>
        <p className="mt-0.5 text-[12.5px] text-on-surface-variant">
          Danh sách rút gọn — mở chi tiết để xem nội dung, media và bình luận đầy đủ.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search width={14} height={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={filters.keyword ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value || null, pageNumber: 1 }))}
              placeholder="Tìm theo tiêu đề…"
              className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest py-2 pl-8 pr-3 text-[12.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || null) as AdminCommunityPostFilters["status"], pageNumber: 1 }))}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] focus:border-primary focus:outline-none"
          >
            <option value="">Mọi trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đang mở</option>
            <option value="closed">Đã đóng</option>
            <option value="expired">Đã hết hạn</option>
            <option value="hidden">Đã ẩn</option>
            <option value="deleted">Đã xoá</option>
          </select>
          <select
            value={filters.postType ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, postType: (e.target.value || null) as AdminCommunityPostFilters["postType"], pageNumber: 1 }))}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] focus:border-primary focus:outline-none"
          >
            <option value="">Mọi loại</option>
            {COMMUNITY_POST_TYPES.map((type) => (
              <option key={type} value={type}>
                {POST_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] text-on-surface-variant">
            <input
              type="checkbox"
              checked={Boolean(filters.reportedOnly)}
              onChange={(e) => setFilters((f) => ({ ...f, reportedOnly: e.target.checked || null, pageNumber: 1 }))}
              className="h-3.5 w-3.5 accent-primary"
            />
            Có báo cáo
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
          <div className="grid grid-cols-[2fr_1fr_0.8fr_0.6fr_0.6fr_0.6fr_0.9fr] gap-2 border-b border-[var(--color-border-soft)] bg-surface-container-high px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <span>Tiêu đề</span>
            <span>Tác giả</span>
            <span>Loại</span>
            <span>Báo cáo</span>
            <span>Bình luận</span>
            <span>Trạng thái</span>
            <span>Ngày tạo</span>
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
            <EmptyState icon="verified" title="Không có bài đăng phù hợp" className="border-0" />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <div className="divide-y divide-[var(--color-border-soft)]">
              {data.items.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/community/posts/${p.id}`}
                  className="grid grid-cols-[2fr_1fr_0.8fr_0.6fr_0.6fr_0.6fr_0.9fr] items-center gap-2 px-4 py-3 text-[12.5px] hover:bg-surface-container-high"
                >
                  <span className="truncate font-medium text-on-surface">{p.title}</span>
                  <span className="truncate text-on-surface-variant">{p.author?.fullName || "—"}</span>
                  <span className="text-on-surface-variant">{POST_TYPE_LABELS[p.postType ?? ""] ?? p.postType}</span>
                  <span className={p.reportCount > 0 ? "flex items-center gap-1 font-semibold text-rose-600" : "text-on-surface-variant"}>
                    {p.reportCount > 0 && <WarningTriangle width={12} height={12} />}
                    {p.reportCount}
                  </span>
                  <span className="tabular-nums text-on-surface-variant">{p.commentCount}</span>
                  <PostStatusBadge status={p.status} />
                  <span className="text-on-surface-variant">{formatDateVn(p.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <Pagination pageNumber={data.pageNumber} totalPages={data.totalPages} onChange={(page) => setFilters((f) => ({ ...f, pageNumber: page }))} className="mt-4" />
        )}
      </div>
    </AppShell>
  );
}
