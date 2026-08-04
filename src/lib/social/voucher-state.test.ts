import { describe, expect, it } from "vitest";
import {
  appliedQuote,
  appliedVoucherCode,
  initialVoucherState,
  isVoucherBusy,
  isVoucherPurchaseRejection,
  voucherReducer,
} from "@/lib/social/voucher-state";
import type { VoucherQuoteResponse } from "@/lib/social/types";

const quote: VoucherQuoteResponse = {
  code: "SALE10",
  originalAmount: 100_000,
  discountAmount: 10_000,
  totalAmount: 90_000,
  discountType: "percentage",
  discountValue: 10,
  maxDiscountAmount: null,
};

describe("voucherReducer", () => {
  it("starts idle", () => {
    expect(initialVoucherState).toEqual({ status: "idle" });
  });

  it("validate → validated moves to a valid quote", () => {
    let state = voucherReducer(initialVoucherState, { type: "validate", code: "SALE10" });
    expect(isVoucherBusy(state)).toBe(true);
    state = voucherReducer(state, { type: "validated", code: "SALE10", quote });
    expect(state.status).toBe("valid");
    expect(appliedVoucherCode(state)).toBe("SALE10");
    expect(appliedQuote(state)?.discountAmount).toBe(10_000);
  });

  it("ignores a stale validated/failed response for a code the user already changed away from", () => {
    const validating = voucherReducer(initialVoucherState, { type: "validate", code: "OLD" });
    const afterStaleResponse = voucherReducer(validating, {
      type: "validated",
      code: "STALE",
      quote,
    });
    expect(afterStaleResponse).toBe(validating); // unchanged
  });

  it("a purchase rejection only applies when a voucher was actually applied", () => {
    const idle = voucherReducer(initialVoucherState, {
      type: "purchase_rejected",
      message: "hết lượt",
    });
    expect(idle).toBe(initialVoucherState); // no-op — nothing was applied

    let valid = voucherReducer(initialVoucherState, { type: "validate", code: "SALE10" });
    valid = voucherReducer(valid, { type: "validated", code: "SALE10", quote });
    const rejected = voucherReducer(valid, { type: "purchase_rejected", message: "Mã đã hết lượt" });
    expect(rejected).toEqual({ status: "purchase_rejected", code: "SALE10", message: "Mã đã hết lượt" });
    // The rejected state must not silently carry a code forward for reuse.
    expect(appliedVoucherCode(rejected)).toBeNull();
  });

  it("clear always resets to idle", () => {
    let valid = voucherReducer(initialVoucherState, { type: "validate", code: "SALE10" });
    valid = voucherReducer(valid, { type: "validated", code: "SALE10", quote });
    expect(voucherReducer(valid, { type: "clear" })).toEqual({ status: "idle" });
  });
});

describe("isVoucherPurchaseRejection", () => {
  it("treats exhaustion codes as a voucher-side rejection", () => {
    expect(isVoucherPurchaseRejection("VOUCHER_USAGE_LIMIT_REACHED")).toBe(true);
    expect(isVoucherPurchaseRejection("VOUCHER_BUDGET_EXCEEDED")).toBe(true);
    expect(isVoucherPurchaseRejection("VOUCHER_EXPIRED")).toBe(true);
  });

  it("does not treat an unrelated failure as a voucher rejection", () => {
    expect(isVoucherPurchaseRejection("TRAINING_PACKAGE_NOT_PUBLISHED")).toBe(false);
    expect(isVoucherPurchaseRejection(undefined)).toBe(false);
  });
});
