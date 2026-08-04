"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { RowSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { useVoucherCampaigns } from "@/lib/social/hooks/useAdminVouchers";
import { derivedCampaignBadge, DERIVED_BADGE_CLASS, DERIVED_BADGE_LABELS } from "@/lib/social/voucher-campaign-status";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateVn } from "@/lib/social/datetime";
import { VOUCHER_CAMPAIGN_STATUS_LABELS } from "@/lib/social/labels";
import { cn } from "@/lib/utils";
import type { AdminVoucherCampaignFilters } from "@/lib/social/api/admin-vouchers";

export default function AdminVouchersPage() {
  const [filters, setFilters] = useState<AdminVoucherCampaignFilters>({ pageNumber: 1, pageSize: 20 });
  const { data, isLoading, isError, refetch } = useVoucherCampaigns(filters);

  return (
    <AppShell role="admin" title="Chương trình voucher">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold text-on-surface">Chương trình voucher</h1>
            <p className="mt-0.5 text-[12.5px] text-on-surface-variant">Quản lý mã giảm giá và ngân sách khuyến mãi.</p>
          </div>
          <Link
            href="/admin/vouchers/create"
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
          >
            <Plus width={15} height={15} />
            Tạo chương trình
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search width={14} height={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={filters.keyword ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value || null, pageNumber: 1 }))}
              placeholder="Tìm theo mã hoặc tên…"
              className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest py-2 pl-8 pr-3 text-[12.5px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || null, pageNumber: 1 }))}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-2 text-[12.5px] focus:border-primary focus:outline-none"
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(VOUCHER_CAMPAIGN_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr] gap-2 border-b border-[var(--color-border-soft)] bg-surface-container-high px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <span>Mã / Tên</span>
            <span>Giảm giá</span>
            <span>Lượt dùng</span>
            <span>Ngân sách</span>
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
            <EmptyState icon="local_offer" title="Chưa có chương trình voucher nào" className="border-0" />
          )}

          {!isLoading && !isError && data && data.items.length > 0 && (
            <div className="divide-y divide-[var(--color-border-soft)]">
              {data.items.map((c) => {
                const badge = derivedCampaignBadge(c);
                return (
                  <Link
                    key={c.id}
                    href={`/admin/vouchers/${c.id}`}
                    className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.9fr] items-center gap-2 px-4 py-3 text-[12.5px] hover:bg-surface-container-high"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono font-semibold text-on-surface">{c.code}</p>
                      <p className="truncate text-[11.5px] text-on-surface-variant">{c.name}</p>
                    </div>
                    <span className="tabular-nums text-on-surface">
                      {c.discountType === "percentage" ? `${c.discountValue}%` : formatCurrencyVnd(c.discountValue)}
                    </span>
                    <span className="tabular-nums text-on-surface-variant">
                      {c.reservedCount + c.usedCount}
                      {c.maxUsesTotal != null ? ` / ${c.maxUsesTotal}` : ""}
                    </span>
                    <span className="tabular-nums text-on-surface-variant">
                      {c.budgetAmount != null
                        ? `${formatCurrencyVnd(c.reservedDiscountAmount + c.usedDiscountAmount)} / ${formatCurrencyVnd(c.budgetAmount)}`
                        : "—"}
                    </span>
                    <span className={cn("w-fit rounded-[6px] px-2 py-0.5 text-[11px] font-semibold", DERIVED_BADGE_CLASS[badge])}>
                      {DERIVED_BADGE_LABELS[badge]}
                    </span>
                    <span className="text-on-surface-variant">{formatDateVn(c.createdAt)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <Pagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onChange={(page) => setFilters((f) => ({ ...f, pageNumber: page }))}
            className="mt-4"
          />
        )}
      </div>
    </AppShell>
  );
}
