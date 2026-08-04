"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { VoucherCampaignForm } from "@/components/social/admin/VoucherCampaignForm";
import { useCreateVoucherCampaign } from "@/lib/social/hooks/useAdminVouchers";
import { showApiError, showSuccess } from "@/lib/toast";
import type { VoucherCampaignFormValues } from "@/lib/social/validation/admin-voucher";

export default function CreateVoucherCampaignPage() {
  const router = useRouter();
  const createMutation = useCreateVoucherCampaign();

  async function handleSubmit(values: VoucherCampaignFormValues) {
    try {
      const campaign = await createMutation.mutateAsync({
        code: values.code.trim().toUpperCase(),
        name: values.name,
        description: values.description || null,
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxDiscountAmount: values.discountType === "percentage" ? values.maxDiscountAmount ?? null : null,
        minOrderAmount: values.minOrderAmount ?? null,
        startAt: values.startAt ?? null,
        endAt: values.endAt ?? null,
        maxUsesTotal: values.maxUsesTotal ?? null,
        maxUsesPerLearner: values.maxUsesPerLearner ?? null,
        budgetAmount: values.budgetAmount ?? null,
      });
      showSuccess("Đã tạo chương trình voucher (bản nháp).");
      router.push(`/admin/vouchers/${campaign.id}`);
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <AppShell role="admin" title="Tạo chương trình voucher">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin/vouchers" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-on-surface-variant hover:text-primary">
          <ArrowLeft width={14} height={14} />
          Danh sách voucher
        </Link>
        <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
          <VoucherCampaignForm
            mode="create"
            submitting={createMutation.isPending}
            submitLabel="Tạo chương trình"
            onSubmit={(values) => void handleSubmit(values)}
          />
        </div>
      </div>
    </AppShell>
  );
}
