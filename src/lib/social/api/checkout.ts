// ============================================================================
// Training-package checkout + PayOS reconciliation.
//
// Two rules the whole flow hangs on:
//
//   1. The client sends NO money. `purchaseTrainingPackage` posts the package id
//      and (optionally) a voucher code; discountAmount / totalAmount /
//      originalAmount are computed by the backend at purchase time.
//
//   2. Routing is decided by `paymentRequired`, never by `totalAmount === 0`.
//      A 100%-discount voucher returns paymentRequired=false with a null
//      checkoutUrl and null orderCode — there is no PayOS round trip and
//      nothing to reconcile.
// ============================================================================

import { callData, postJson } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  BookingResponse,
  PurchasePayOsResponse,
  PurchaseTrainingPackageRequest,
  ReconcilePayOsRequest,
  ReconcilePayOsResponse,
} from "@/lib/social/types";

/**
 * POST /api/bookings/purchase/payos
 *
 * `voucherCode` is omitted entirely when absent — sending `null` makes some
 * validators treat it as an explicitly-empty code.
 */
export function purchaseTrainingPackage(
  request: PurchaseTrainingPackageRequest,
): Promise<PurchasePayOsResponse> {
  const code = request.voucherCode?.trim();
  return callData<PurchasePayOsResponse>(
    ep.purchasePayos,
    postJson({
      trainingPackageId: request.trainingPackageId,
      ...(code ? { voucherCode: code } : {}),
    }),
  );
}

/**
 * POST /api/payments/payos/reconcile
 *
 * The ONLY source of truth for whether a payment landed. PayOS appends
 * `?status=PAID&code=00` to the return URL, but those are client-supplied query
 * params — anyone can type them. Always ask our backend.
 */
export function reconcilePayos(
  request: ReconcilePayOsRequest,
  signal?: AbortSignal,
): Promise<ReconcilePayOsResponse> {
  return callData<ReconcilePayOsResponse>(ep.reconcilePayos, {
    ...postJson({
      ...(request.orderCode != null ? { orderCode: request.orderCode } : {}),
      ...(request.paymentId ? { paymentId: request.paymentId } : {}),
    }),
    signal,
  });
}

/** GET /api/bookings/{id} — learner-scoped booking detail. */
export function getBooking(bookingId: string): Promise<BookingResponse> {
  return callData<BookingResponse>(ep.bookingById(bookingId));
}
