import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  derivedCampaignBadge,
  financialFieldsLocked,
  isTerminalCampaign,
} from "@/lib/social/voucher-campaign-status";
import type { VoucherCampaignResponse } from "@/lib/social/types";

function campaign(overrides: Partial<VoucherCampaignResponse>): VoucherCampaignResponse {
  return {
    id: "c1",
    code: "SALE10",
    name: "Sale",
    description: null,
    discountType: "percentage",
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderAmount: null,
    startAt: null,
    endAt: null,
    status: "draft",
    maxUsesTotal: null,
    maxUsesPerLearner: null,
    reservedCount: 0,
    usedCount: 0,
    budgetAmount: null,
    reservedDiscountAmount: 0,
    usedDiscountAmount: 0,
    createdByUserId: "admin-1",
    updatedByUserId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("allowedTransitions", () => {
  it("a draft campaign can only be activated", () => {
    expect(allowedTransitions(campaign({ status: "draft" }))).toEqual(["activate"]);
  });

  it("an active campaign can be paused or ended, never re-activated", () => {
    expect(allowedTransitions(campaign({ status: "active" }))).toEqual(["pause", "end"]);
  });

  it("a paused campaign can be reactivated or ended", () => {
    expect(allowedTransitions(campaign({ status: "paused" }))).toEqual(["activate", "end"]);
  });

  it("ended is terminal — no transitions", () => {
    expect(allowedTransitions(campaign({ status: "ended" }))).toEqual([]);
    expect(isTerminalCampaign(campaign({ status: "ended" }))).toBe(true);
  });
});

describe("derivedCampaignBadge", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("shows scheduled for an active campaign that hasn't started yet", () => {
    const c = campaign({ status: "active", startAt: "2026-07-01T00:00:00Z" });
    expect(derivedCampaignBadge(c, now)).toBe("scheduled");
  });

  it("shows expired for an active campaign past its end date", () => {
    const c = campaign({ status: "active", endAt: "2026-05-01T00:00:00Z" });
    expect(derivedCampaignBadge(c, now)).toBe("expired");
  });

  it("shows usage_exhausted once reserved+used hits the cap", () => {
    const c = campaign({ status: "active", maxUsesTotal: 10, reservedCount: 6, usedCount: 4 });
    expect(derivedCampaignBadge(c, now)).toBe("usage_exhausted");
  });

  it("shows budget_exhausted once spend hits the budget", () => {
    const c = campaign({ status: "active", budgetAmount: 1000, reservedDiscountAmount: 500, usedDiscountAmount: 500 });
    expect(derivedCampaignBadge(c, now)).toBe("budget_exhausted");
  });

  it("draft/paused/ended pass through unchanged regardless of dates", () => {
    expect(derivedCampaignBadge(campaign({ status: "paused" }), now)).toBe("paused");
    expect(derivedCampaignBadge(campaign({ status: "ended" }), now)).toBe("ended");
  });
});

describe("financialFieldsLocked", () => {
  it("locks once there is any reserved or used redemption", () => {
    expect(financialFieldsLocked({ reservedCount: 1, usedCount: 0 }, false)).toBe(true);
    expect(financialFieldsLocked({ reservedCount: 0, usedCount: 1 }, false)).toBe(true);
  });

  it("stays unlocked with zero counters and no server-forced lock", () => {
    expect(financialFieldsLocked({ reservedCount: 0, usedCount: 0 }, false)).toBe(false);
  });

  it("a 409 VOUCHER_CAMPAIGN_HAS_REDEMPTIONS locks it even if counters still read zero", () => {
    expect(financialFieldsLocked({ reservedCount: 0, usedCount: 0 }, true)).toBe(true);
  });
});
