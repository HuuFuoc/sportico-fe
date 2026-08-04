// ============================================================================
// Voucher state machine for the checkout screen.
//
// Pure and synchronous so the tricky transition can be reasoned about (and
// tested) without a network: a code that validated a moment ago can still be
// REJECTED at purchase, because validation reserves nothing. When that happens
// the machine parks in `purchase_rejected` and waits for the user — it never
// silently re-purchases at the undiscounted price.
// ============================================================================

import type { VoucherQuoteResponse } from "@/lib/social/types";

export type VoucherState =
  /** No code entered, or the user cleared it. */
  | { status: "idle" }
  /** POST /vouchers/validate in flight. */
  | { status: "validating"; code: string }
  /** Quote received. Advisory only — the backend re-prices at purchase. */
  | { status: "valid"; code: string; quote: VoucherQuoteResponse }
  /** The backend refused the code during validation. */
  | { status: "invalid"; code: string; message: string }
  /**
   * The code passed validation but the PURCHASE was refused (ran out of uses /
   * budget, expired, or was paused in between). The user must now pick:
   * try a different code, or continue at the original price.
   */
  | { status: "purchase_rejected"; code: string; message: string };

export type VoucherEvent =
  | { type: "clear" }
  | { type: "validate"; code: string }
  | { type: "validated"; code: string; quote: VoucherQuoteResponse }
  | { type: "validation_failed"; code: string; message: string }
  | { type: "purchase_rejected"; message: string };

export const initialVoucherState: VoucherState = { status: "idle" };

export function voucherReducer(
  state: VoucherState,
  event: VoucherEvent,
): VoucherState {
  switch (event.type) {
    case "clear":
      return { status: "idle" };

    case "validate":
      return { status: "validating", code: event.code };

    case "validated":
      // Ignore a response for a code the user has since changed away from.
      if (state.status === "validating" && state.code !== event.code) return state;
      return { status: "valid", code: event.code, quote: event.quote };

    case "validation_failed":
      if (state.status === "validating" && state.code !== event.code) return state;
      return { status: "invalid", code: event.code, message: event.message };

    case "purchase_rejected":
      // Only a code that was actually applied can be rejected at purchase.
      if (state.status !== "valid") return state;
      return {
        status: "purchase_rejected",
        code: state.code,
        message: event.message,
      };

    default:
      return state;
  }
}

/** The code to send with the purchase — only a successfully-quoted one. */
export function appliedVoucherCode(state: VoucherState): string | null {
  return state.status === "valid" ? state.code : null;
}

/** The quote to render in the price breakdown, if any. */
export function appliedQuote(state: VoucherState): VoucherQuoteResponse | null {
  return state.status === "valid" ? state.quote : null;
}

/** Block the purchase button while a quote is still resolving. */
export function isVoucherBusy(state: VoucherState): boolean {
  return state.status === "validating";
}

/**
 * Backend codes that mean "this campaign is no longer usable" rather than
 * "you typed it wrong". Used to phrase the rejection copy.
 */
const EXHAUSTED_CODES = new Set([
  "VOUCHER_USAGE_LIMIT_REACHED",
  "VOUCHER_LEARNER_LIMIT_REACHED",
  "VOUCHER_BUDGET_EXCEEDED",
  "VOUCHER_EXPIRED",
  "VOUCHER_PAUSED",
  "VOUCHER_NOT_ACTIVE",
  "VOUCHER_NOT_STARTED",
]);

export function isVoucherExhaustedCode(code: string | undefined): boolean {
  return code !== undefined && EXHAUSTED_CODES.has(code);
}

/**
 * True when a failed purchase was the VOUCHER's fault, so the user can retry at
 * the original price. Any other failure (network, package unavailable) must not
 * push the user into the "buy without discount" branch.
 */
export function isVoucherPurchaseRejection(code: string | undefined): boolean {
  return (
    isVoucherExhaustedCode(code) ||
    code === "VOUCHER_NOT_FOUND" ||
    code === "VOUCHER_CODE_INVALID" ||
    code === "VOUCHER_MIN_ORDER_NOT_MET" ||
    code === "VOUCHER_CAMPAIGN_NOT_FOUND"
  );
}
