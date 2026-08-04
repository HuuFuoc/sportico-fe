"use client";

// ============================================================================
// Hooks for the checkout screen: voucher validation, purchase, reconcile and
// booking lookup. Kept as plain TanStack mutations/query — the tricky state
// (voucher lifecycle) lives in `voucher-state.ts`, not here.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { validateVoucher } from "@/lib/social/api/vouchers";
import { purchaseTrainingPackage, reconcilePayos, getBooking } from "@/lib/social/api/checkout";
import { qk } from "@/lib/social/query-keys";
import type {
  PurchaseTrainingPackageRequest,
  ReconcilePayOsRequest,
  ValidateVoucherRequest,
} from "@/lib/social/types";

/** Voucher validation is a quote, never cached — always a fresh mutation. */
export function useValidateVoucher() {
  return useMutation({
    mutationFn: (request: ValidateVoucherRequest) => validateVoucher(request),
  });
}

/** Not idempotent — never auto-retried (see QueryProvider mutation defaults). */
export function usePurchaseTrainingPackage() {
  return useMutation({
    mutationFn: (request: PurchaseTrainingPackageRequest) =>
      purchaseTrainingPackage(request),
  });
}

export function useReconcilePayos() {
  return useMutation({
    mutationFn: ({ request, signal }: { request: ReconcilePayOsRequest; signal?: AbortSignal }) =>
      reconcilePayos(request, signal),
  });
}

export function useBooking(bookingId: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.booking(bookingId ?? ""),
    queryFn: () => getBooking(bookingId as string),
    enabled: Boolean(bookingId),
    // A newly-activated booking's status/session counters can keep moving
    // right after checkout; a short poll keeps the detail page honest without
    // hammering the backend once things settle.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" ? 4000 : false;
    },
    initialData: () =>
      bookingId ? queryClient.getQueryData(qk.booking(bookingId)) : undefined,
  });
}
