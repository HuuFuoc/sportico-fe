"use client";

import { useForm, Controller } from "react-hook-form";
import { InfoCircle, LockSquare } from "iconoir-react";
import { zodResolver } from "@/lib/validation/auth";
import { normalizeDiscountType, voucherCampaignSchema, type VoucherCampaignFormValues } from "@/lib/social/validation/admin-voucher";
import { isoUtcToLocalInput, localInputToIsoUtc } from "@/lib/social/datetime";
import { cn } from "@/lib/utils";
import type { VoucherCampaignResponse } from "@/lib/social/types";

const INPUT_CLASS =
  "w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] text-on-surface tabular-nums placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:opacity-70";

interface VoucherCampaignFormProps {
  mode: "create" | "edit";
  initial?: VoucherCampaignResponse | null;
  financialLocked?: boolean;
  submitting?: boolean;
  onSubmit: (values: VoucherCampaignFormValues) => void;
  submitLabel: string;
}

export function VoucherCampaignForm({ mode, initial, financialLocked, submitting, onSubmit, submitLabel }: VoucherCampaignFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<VoucherCampaignFormValues>({
    resolver: zodResolver(voucherCampaignSchema),
    mode: "onBlur",
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      discountType: normalizeDiscountType(initial?.discountType),
      discountValue: initial?.discountValue ?? 10,
      maxDiscountAmount: initial?.maxDiscountAmount ?? null,
      minOrderAmount: initial?.minOrderAmount ?? null,
      startAt: initial?.startAt ?? null,
      endAt: initial?.endAt ?? null,
      maxUsesTotal: initial?.maxUsesTotal ?? null,
      maxUsesPerLearner: initial?.maxUsesPerLearner ?? null,
      budgetAmount: initial?.budgetAmount ?? null,
    },
  });

  const discountType = watch("discountType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">
            Mã voucher <span className="text-primary">*</span>
          </label>
          <input
            {...register("code")}
            disabled={mode === "edit"}
            className={cn(INPUT_CLASS, "font-mono uppercase")}
            placeholder="SUMMER2026"
          />
          {mode === "edit" && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
              <LockSquare width={11} height={11} /> Không thể đổi mã sau khi tạo.
            </p>
          )}
          {errors.code && <p className="mt-1 text-[11px] text-error">{errors.code.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">
            Tên chương trình <span className="text-primary">*</span>
          </label>
          <input {...register("name")} className={INPUT_CLASS} placeholder="Khuyến mãi mùa hè" />
          {errors.name && <p className="mt-1 text-[11px] text-error">{errors.name.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Mô tả</label>
        <textarea {...register("description")} rows={2} className={cn(INPUT_CLASS, "resize-none")} placeholder="Ghi chú nội bộ…" />
      </div>

      <div className="rounded-[10px] border border-[var(--color-border-soft)] p-4">
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
          Thiết lập giảm giá
          {financialLocked && (
            <span className="flex items-center gap-1 rounded-[6px] bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700">
              <LockSquare width={10} height={10} /> Đã khoá (đã có lượt sử dụng)
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Loại giảm giá</label>
            <select {...register("discountType")} disabled={financialLocked} className={INPUT_CLASS}>
              <option value="percentage">Theo phần trăm (%)</option>
              <option value="fixed_amount">Số tiền cố định (₫)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">
              Giá trị giảm {discountType === "percentage" ? "(%)" : "(₫)"} <span className="text-primary">*</span>
            </label>
            <input type="number" step="any" {...register("discountValue", { valueAsNumber: true })} disabled={financialLocked} className={INPUT_CLASS} />
            {errors.discountValue && <p className="mt-1 text-[11px] text-error">{errors.discountValue.message}</p>}
          </div>
          {discountType === "percentage" && (
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Giảm tối đa (₫)</label>
              <Controller
                control={control}
                name="maxDiscountAmount"
                render={({ field }) => (
                  <input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={financialLocked}
                    className={INPUT_CLASS}
                    placeholder="Không giới hạn"
                  />
                )}
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Đơn tối thiểu (₫)</label>
            <Controller
              control={control}
              name="minOrderAmount"
              render={({ field }) => (
                <input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  disabled={financialLocked}
                  className={INPUT_CLASS}
                  placeholder="Không yêu cầu"
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Bắt đầu</label>
          <Controller
            control={control}
            name="startAt"
            render={({ field }) => (
              <input
                type="datetime-local"
                value={isoUtcToLocalInput(field.value)}
                onChange={(e) => field.onChange(localInputToIsoUtc(e.target.value))}
                className={INPUT_CLASS}
              />
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Kết thúc</label>
          <Controller
            control={control}
            name="endAt"
            render={({ field }) => (
              <input
                type="datetime-local"
                value={isoUtcToLocalInput(field.value)}
                onChange={(e) => field.onChange(localInputToIsoUtc(e.target.value))}
                className={INPUT_CLASS}
              />
            )}
          />
          {errors.endAt && <p className="mt-1 text-[11px] text-error">{errors.endAt.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Tổng số lượt sử dụng</label>
          <Controller
            control={control}
            name="maxUsesTotal"
            render={({ field }) => (
              <input
                type="number"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_CLASS}
                placeholder="Không giới hạn"
              />
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Số lượt / học viên</label>
          <Controller
            control={control}
            name="maxUsesPerLearner"
            render={({ field }) => (
              <input
                type="number"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_CLASS}
                placeholder="Không giới hạn"
              />
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-on-surface">Ngân sách (₫)</label>
          <Controller
            control={control}
            name="budgetAmount"
            render={({ field }) => (
              <input
                type="number"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_CLASS}
                placeholder="Không giới hạn"
              />
            )}
          />
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-[8px] bg-blue-50 px-3 py-2 text-[11.5px] text-blue-700">
        <InfoCircle width={13} height={13} className="mt-0.5 shrink-0" />
        Chương trình mới luôn bắt đầu ở trạng thái <strong>Bản nháp</strong> — kích hoạt thủ công sau khi tạo.
      </p>

      <div className="border-t border-[var(--color-border-soft)] pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[8px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8] disabled:opacity-60"
        >
          {submitting ? "Đang lưu…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
