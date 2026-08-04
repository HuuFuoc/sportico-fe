"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, EditPencil, OffTag, Pause, Play } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { Modal } from "@/components/social/Modal";
import { Pagination } from "@/components/social/Pagination";
import { RowSkeleton } from "@/components/social/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { VoucherCampaignForm } from "@/components/social/admin/VoucherCampaignForm";
import {
  useActivateVoucherCampaign,
  useEndVoucherCampaign,
  usePauseVoucherCampaign,
  useUpdateVoucherCampaign,
  useVoucherCampaign,
  useVoucherRedemptions,
} from "@/lib/social/hooks/useAdminVouchers";
import {
  allowedTransitions,
  derivedCampaignBadge,
  DERIVED_BADGE_CLASS,
  DERIVED_BADGE_LABELS,
  financialFieldsLocked,
} from "@/lib/social/voucher-campaign-status";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateTimeVn } from "@/lib/social/datetime";
import { showApiError, showSuccess } from "@/lib/toast";
import { ApiResultError } from "@/lib/api-result";
import type { VoucherCampaignFormValues } from "@/lib/social/validation/admin-voucher";

export function AdminVoucherDetailClient({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading, isError, refetch } = useVoucherCampaign(campaignId);
  const updateMutation = useUpdateVoucherCampaign(campaignId);
  const activateMutation = useActivateVoucherCampaign(campaignId);
  const pauseMutation = usePauseVoucherCampaign(campaignId);
  const endMutation = useEndVoucherCampaign(campaignId);

  const [editing, setEditing] = useState(false);
  const [forcedLocked, setForcedLocked] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [redemptionPage, setRedemptionPage] = useState(1);
  const [redemptionStatus, setRedemptionStatus] = useState("");

  const redemptions = useVoucherRedemptions(campaignId, {
    status: redemptionStatus || null,
    pageNumber: redemptionPage,
    pageSize: 20,
  });

  async function handleUpdate(values: VoucherCampaignFormValues) {
    if (!campaign) return;
    const locked = financialFieldsLocked(campaign, forcedLocked);
    try {
      await updateMutation.mutateAsync({
        name: values.name,
        description: values.description || null,
        // Locked campaigns never send the financial fields — the backend
        // would reject them anyway, but omitting is the documented contract.
        ...(locked
          ? {}
          : {
              discountType: values.discountType,
              discountValue: values.discountValue,
              maxDiscountAmount: values.discountType === "percentage" ? values.maxDiscountAmount ?? null : null,
              minOrderAmount: values.minOrderAmount ?? null,
            }),
        startAt: values.startAt ?? null,
        endAt: values.endAt ?? null,
        maxUsesTotal: values.maxUsesTotal ?? null,
        maxUsesPerLearner: values.maxUsesPerLearner ?? null,
        budgetAmount: values.budgetAmount ?? null,
      });
      showSuccess("Đã lưu thay đổi.");
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiResultError && err.code === "VOUCHER_CAMPAIGN_HAS_REDEMPTIONS") {
        setForcedLocked(true);
      }
      showApiError(err);
    }
  }

  if (isLoading) {
    return (
      <AppShell role="admin" title="Chi tiết voucher">
        <LoadingState label="Đang tải…" />
      </AppShell>
    );
  }

  if (isError || !campaign) {
    return (
      <AppShell role="admin" title="Chi tiết voucher">
        <ErrorState title="Không tải được chương trình" onRetry={() => refetch()} />
      </AppShell>
    );
  }

  const badge = derivedCampaignBadge(campaign);
  const transitions = allowedTransitions(campaign);
  const locked = financialFieldsLocked(campaign, forcedLocked);

  return (
    <AppShell role="admin" title={campaign.name ?? "Chi tiết voucher"}>
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/vouchers" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-on-surface-variant hover:text-primary">
          <ArrowLeft width={14} height={14} />
          Danh sách voucher
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-[18px] font-bold text-on-surface">{campaign.code}</h1>
              <span className={`rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${DERIVED_BADGE_CLASS[badge]}`}>
                {DERIVED_BADGE_LABELS[badge]}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-on-surface-variant">{campaign.name}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12.5px] font-medium hover:border-primary/40 hover:text-primary"
              >
                <EditPencil width={13} height={13} /> Chỉnh sửa
              </button>
            )}
            {transitions.includes("activate") && (
              <button
                type="button"
                onClick={() => activateMutation.mutate(undefined, { onSuccess: () => showSuccess("Đã kích hoạt."), onError: showApiError })}
                disabled={activateMutation.isPending}
                className="flex items-center gap-1.5 rounded-[8px] bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Play width={13} height={13} /> Kích hoạt
              </button>
            )}
            {transitions.includes("pause") && (
              <button
                type="button"
                onClick={() => pauseMutation.mutate(undefined, { onSuccess: () => showSuccess("Đã tạm dừng."), onError: showApiError })}
                disabled={pauseMutation.isPending}
                className="flex items-center gap-1.5 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                <Pause width={13} height={13} /> Tạm dừng
              </button>
            )}
            {transitions.includes("end") && (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className="flex items-center gap-1.5 rounded-[8px] border border-rose-300 bg-rose-50 px-3 py-1.5 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                <OffTag width={13} height={13} /> Kết thúc
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          {editing ? (
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
              <VoucherCampaignForm
                mode="edit"
                initial={campaign}
                financialLocked={locked}
                submitting={updateMutation.isPending}
                submitLabel="Lưu thay đổi"
                onSubmit={(values) => void handleUpdate(values)}
              />
              <button type="button" onClick={() => setEditing(false)} className="mt-3 text-[12.5px] font-medium text-on-surface-variant hover:text-on-surface">
                Huỷ chỉnh sửa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Giảm giá" value={campaign.discountType === "percentage" ? `${campaign.discountValue}%` : formatCurrencyVnd(campaign.discountValue)} />
              <StatCard label="Đã dùng / Tổng lượt" value={`${campaign.reservedCount + campaign.usedCount}${campaign.maxUsesTotal != null ? ` / ${campaign.maxUsesTotal}` : ""}`} />
              <StatCard label="Ngân sách đã dùng" value={campaign.budgetAmount != null ? `${formatCurrencyVnd(campaign.reservedDiscountAmount + campaign.usedDiscountAmount)} / ${formatCurrencyVnd(campaign.budgetAmount)}` : "Không giới hạn"} />
              <StatCard label="Đơn tối thiểu" value={campaign.minOrderAmount != null ? formatCurrencyVnd(campaign.minOrderAmount) : "Không yêu cầu"} />
              <StatCard label="Bắt đầu" value={formatDateTimeVn(campaign.startAt)} />
              <StatCard label="Kết thúc" value={formatDateTimeVn(campaign.endAt)} />
              <StatCard label="Số lượt/học viên" value={campaign.maxUsesPerLearner != null ? String(campaign.maxUsesPerLearner) : "Không giới hạn"} />
              <StatCard label="Tạo lúc" value={formatDateTimeVn(campaign.createdAt)} />
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-[14px] font-semibold text-on-surface">Lịch sử sử dụng</h2>
          <div className="mb-3 flex items-center gap-2">
            <input
              value={redemptionStatus}
              onChange={(e) => {
                setRedemptionStatus(e.target.value);
                setRedemptionPage(1);
              }}
              placeholder="Lọc theo trạng thái…"
              className="w-56 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] focus:border-primary focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
            {redemptions.isLoading && (
              <div className="divide-y divide-[var(--color-border-soft)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            )}
            {redemptions.isError && !redemptions.isLoading && (
              <div className="p-6">
                <ErrorState title="Không tải được lịch sử" onRetry={() => redemptions.refetch()} />
              </div>
            )}
            {!redemptions.isLoading && !redemptions.isError && redemptions.data?.items.length === 0 && (
              <EmptyState icon="receipt_long" title="Chưa có lượt sử dụng nào" className="border-0" />
            )}
            {!redemptions.isLoading && !redemptions.isError && redemptions.data && redemptions.data.items.length > 0 && (
              <div className="divide-y divide-[var(--color-border-soft)] text-[12.5px]">
                {redemptions.data.items.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5">
                    <span className="truncate font-mono text-on-surface-variant">{r.bookingId.slice(0, 8)}</span>
                    <span className="tabular-nums text-on-surface">−{formatCurrencyVnd(r.discountAmount)}</span>
                    <span className="text-on-surface-variant">{r.status}</span>
                    <span className="text-on-surface-variant">{formatDateTimeVn(r.reservedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {redemptions.data && redemptions.data.totalPages > 1 && (
            <Pagination pageNumber={redemptions.data.pageNumber} totalPages={redemptions.data.totalPages} onChange={setRedemptionPage} className="mt-3" />
          )}
        </div>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="Kết thúc chương trình?"
        description="Đây là hành động cuối cùng — chương trình không thể kích hoạt lại sau khi kết thúc."
        footer={
          <>
            <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
              Huỷ
            </button>
            <button
              type="button"
              onClick={() =>
                endMutation.mutate(undefined, {
                  onSuccess: () => {
                    showSuccess("Đã kết thúc chương trình.");
                    setConfirmEnd(false);
                  },
                  onError: showApiError,
                })
              }
              disabled={endMutation.isPending}
              className="rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60"
            >
              {endMutation.isPending ? "Đang xử lý…" : "Kết thúc"}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-on-surface-variant">Học viên sẽ không thể áp dụng mã này nữa.</p>
      </Modal>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
      <p className="text-[10.5px] uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  );
}
