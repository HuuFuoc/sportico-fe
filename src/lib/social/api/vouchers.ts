// ============================================================================
// Voucher API (learner side).
//
// `validateVoucher` is a QUOTE, not a reservation. Nothing is held for the
// learner: the campaign can run out of uses, budget or time between the quote
// and the purchase. That is why the result is never cached with useQuery and
// why the purchase call sends only the code — the backend recomputes the whole
// price server-side and is the sole authority on it.
// ============================================================================

import { callData, postJson } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type { ValidateVoucherRequest, VoucherQuoteResponse } from "@/lib/social/types";

/** POST /api/vouchers/validate — advisory price quote. Validation only. */
export function validateVoucher(
  request: ValidateVoucherRequest,
): Promise<VoucherQuoteResponse> {
  return callData<VoucherQuoteResponse>(
    ep.validateVoucher,
    postJson({
      code: request.code.trim(),
      trainingPackageId: request.trainingPackageId,
    }),
  );
}
