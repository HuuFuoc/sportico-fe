// ============================================================================
// PayOS pending-payment storage.
//
// When a learner starts a PayOS checkout we only learn the `orderCode` once —
// in the purchase response. The backend has no endpoint to look up a payment's
// orderCode from a bookingId, so the FE must remember it to later reconcile
// ("Đồng bộ thanh toán").
//
// We persist to BOTH:
//   • localStorage, keyed per booking — durable across tabs and sessions in the
//     same browser, so the sync button still works when the learner returns
//     later (the common failure case the old sessionStorage-only code hit).
//   • sessionStorage under the legacy single key — kept for backward
//     compatibility with the immediate /payment/success|fail|cancel redirect.
// ============================================================================

export interface PendingPayos {
  bookingId: string;
  paymentId?: string;
  orderCode: number | string;
  createdAt: string;
}

const LEGACY_KEY = "pendingPayosPayment";
const keyFor = (bookingId: string) => `payosPayment:${bookingId}`;

/** Persist a pending PayOS payment so it can be reconciled later. */
export function savePendingPayos(p: PendingPayos): void {
  const json = JSON.stringify(p);
  try {
    localStorage.setItem(keyFor(p.bookingId), json);
  } catch {
    /* storage unavailable (private mode) — fall back to sessionStorage only */
  }
  try {
    sessionStorage.setItem(LEGACY_KEY, json);
  } catch {
    /* ignore */
  }
}

function parse(raw: string | null): PendingPayos | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPayos;
  } catch {
    return null;
  }
}

/** Resolve the stored orderCode for a specific booking, if we have one. */
export function findOrderCodeForBooking(
  bookingId: string,
): string | number | null {
  // 1. per-booking record (durable)
  try {
    const p = parse(localStorage.getItem(keyFor(bookingId)));
    if (p?.orderCode != null) return p.orderCode;
  } catch {
    /* ignore */
  }
  // 2. legacy single key in either store, matched by bookingId
  for (const store of storages()) {
    try {
      const p = parse(store.getItem(LEGACY_KEY));
      if (p?.bookingId === bookingId && p.orderCode != null) return p.orderCode;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Most-recent pending orderCode regardless of booking — for /payment/* pages. */
export function findLatestOrderCode(): string | number | null {
  for (const store of storages()) {
    try {
      const p = parse(store.getItem(LEGACY_KEY));
      if (p?.orderCode != null) return p.orderCode;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Forget a settled payment. Omit `bookingId` to only clear the legacy key. */
export function clearPendingPayos(bookingId?: string): void {
  if (bookingId) {
    try {
      localStorage.removeItem(keyFor(bookingId));
    } catch {
      /* ignore */
    }
  }
  try {
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function storages(): Storage[] {
  const out: Storage[] = [];
  try {
    out.push(sessionStorage);
  } catch {
    /* ignore */
  }
  try {
    out.push(localStorage);
  } catch {
    /* ignore */
  }
  return out;
}
