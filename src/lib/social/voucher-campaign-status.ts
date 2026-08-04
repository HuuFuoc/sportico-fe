// ============================================================================
// Derived voucher-campaign badges and the financial-field lock rule.
//
// Pure functions — the backend only knows draft/active/paused/ended; every
// other label (scheduled, expired, out-of-uses, out-of-budget) is inferred
// client-side from the raw fields and MUST NEVER be sent back as a `Status`
// filter value (the backend doesn't recognise them).
// ============================================================================

import type { VoucherCampaignResponse } from "@/lib/social/types";

export type DerivedBadge =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "expired"
  | "usage_exhausted"
  | "budget_exhausted"
  | "ended";

export const DERIVED_BADGE_LABELS: Record<DerivedBadge, string> = {
  draft: "Bản nháp",
  scheduled: "Đã lên lịch",
  active: "Đang chạy",
  paused: "Tạm dừng",
  expired: "Đã hết hạn",
  usage_exhausted: "Hết lượt",
  budget_exhausted: "Hết ngân sách",
  ended: "Đã kết thúc",
};

export const DERIVED_BADGE_CLASS: Record<DerivedBadge, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  expired: "bg-slate-200 text-slate-500",
  usage_exhausted: "bg-rose-100 text-rose-700",
  budget_exhausted: "bg-rose-100 text-rose-700",
  ended: "bg-slate-200 text-slate-500",
};

/**
 * The badge to render for a campaign. Terminal backend states (draft, paused,
 * ended) always win; `active` is refined into scheduled/expired/exhausted
 * sub-states using the campaign's own window/limit fields.
 */
export function derivedCampaignBadge(campaign: VoucherCampaignResponse, now: Date = new Date()): DerivedBadge {
  const status = (campaign.status ?? "").toLowerCase();
  if (status === "draft") return "draft";
  if (status === "paused") return "paused";
  if (status === "ended") return "ended";
  if (status !== "active") return "draft";

  const start = campaign.startAt ? new Date(campaign.startAt) : null;
  const end = campaign.endAt ? new Date(campaign.endAt) : null;

  if (start && start.getTime() > now.getTime()) return "scheduled";
  if (end && end.getTime() < now.getTime()) return "expired";

  if (campaign.maxUsesTotal != null && campaign.reservedCount + campaign.usedCount >= campaign.maxUsesTotal) {
    return "usage_exhausted";
  }
  if (
    campaign.budgetAmount != null &&
    campaign.reservedDiscountAmount + campaign.usedDiscountAmount >= campaign.budgetAmount
  ) {
    return "budget_exhausted";
  }

  return "active";
}

/**
 * Financial fields (discountType, discountValue, maxDiscountAmount,
 * minOrderAmount) are locked once the campaign has ANY redemption activity.
 *
 * `forcedByServer` covers the case the brief calls out explicitly: the
 * backend can return 409 VOUCHER_CAMPAIGN_HAS_REDEMPTIONS even when
 * `reservedCount + usedCount` still reads 0 (a race between the count and the
 * validation), so a caller that hit that 409 must keep the fields locked
 * after refetching, not just re-derive from the (possibly stale-looking) counters.
 */
export function financialFieldsLocked(
  campaign: Pick<VoucherCampaignResponse, "reservedCount" | "usedCount">,
  forcedByServer: boolean,
): boolean {
  return forcedByServer || campaign.reservedCount > 0 || campaign.usedCount > 0;
}

/** Terminal — no transition buttons should render once a campaign is `ended`. */
export function isTerminalCampaign(campaign: Pick<VoucherCampaignResponse, "status">): boolean {
  return (campaign.status ?? "").toLowerCase() === "ended";
}

export type CampaignTransition = "activate" | "pause" | "end";

/** Which lifecycle buttons are valid for the campaign's CURRENT backend status. */
export function allowedTransitions(campaign: Pick<VoucherCampaignResponse, "status">): CampaignTransition[] {
  const status = (campaign.status ?? "").toLowerCase();
  if (status === "draft") return ["activate"];
  if (status === "active") return ["pause", "end"];
  if (status === "paused") return ["activate", "end"];
  return []; // ended — terminal
}
