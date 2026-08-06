import { z } from "zod";

import type { VoucherDiscountType } from "@/lib/social/types";

// ============================================================================
// Admin voucher campaign form schema — used for BOTH create and edit. The
// financial fields stay in the schema even when the UI locks their inputs
// (a locked campaign never lets the user reach the input in the first place).
// ============================================================================

export const voucherCampaignSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mã voucher.")
      // Backend cap: 64 chars.
      .max(64, "Mã voucher tối đa 64 ký tự.")
      .regex(/^[A-Z0-9_-]+$/i, "Mã voucher chỉ gồm chữ, số, gạch ngang và gạch dưới."),
    name: z.string().trim().min(1, "Vui lòng nhập tên chương trình.").max(200, "Tên tối đa 200 ký tự."),
    description: z.string().trim().max(1000, "Mô tả tối đa 1000 ký tự.").optional(),
    discountType: z.enum(["percentage", "fixed_amount"], { message: "Vui lòng chọn loại giảm giá." }),
    discountValue: z.number().positive("Giá trị giảm giá phải lớn hơn 0."),
    maxDiscountAmount: z.number().positive().nullable().optional(),
    minOrderAmount: z.number().min(0).nullable().optional(),
    startAt: z.string().nullable().optional(),
    endAt: z.string().nullable().optional(),
    maxUsesTotal: z.number().int().positive().nullable().optional(),
    maxUsesPerLearner: z.number().int().positive().nullable().optional(),
    budgetAmount: z.number().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "percentage" && data.discountValue > 100) {
      ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Phần trăm giảm giá không thể vượt quá 100." });
    }
    if (data.startAt && data.endAt && new Date(data.endAt) <= new Date(data.startAt)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
    }
  });

export type VoucherCampaignFormValues = z.infer<typeof voucherCampaignSchema>;

/**
 * `discountType` comes back from the API as a loose `string | null`. Anything
 * that isn't the backend's `fixed_amount` is treated as a percentage so the
 * edit form never renders a `<select>` with a value none of its options match.
 */
export function normalizeDiscountType(raw: string | null | undefined): VoucherDiscountType {
  return raw === "fixed_amount" || raw === "fixed" ? "fixed_amount" : "percentage";
}
