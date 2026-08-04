"use client";

// ============================================================================
// PayOS return handler.
//
// PayOS appends `?code=00&status=PAID&orderCode=…` to the return URL, but
// those are client-supplied query params — never trusted. The only proof a
// booking activated is `POST /api/payments/payos/reconcile` returning
// `activated: true`. We retry a bounded number of times while the backend
// still reports the payment `pending` (webhook can lag the redirect by a
// couple of seconds), plus tolerate the Azure cold-start failure mode where
// the very first request after idle times out.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  Home,
  Refresh,
  WarningTriangle,
  XmarkCircle,
} from "iconoir-react";
import { useReconcilePayos } from "@/lib/social/hooks/useCheckout";
import { findLatestOrderCode, clearPendingPayos } from "@/lib/payos-pending";
import { messageForError } from "@/lib/social/errors";
import type { ReconcilePayOsResponse } from "@/lib/social/types";
import ClassicLoader from "@/components/ui/loader";

type ViewState = "loading" | "success" | "pending" | "cancelled" | "error";

const MAX_PENDING_POLLS = 5;
const PENDING_POLL_DELAY_MS = 3_000;
const ATTEMPT_TIMEOUT_MS = 15_000;
const COLD_START_RETRY_DELAYS_MS = [0, 2_000, 4_000, 6_000];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Props {
  orderCode?: string;
  cancel?: string;
  status?: string;
}

export function PayOsReturnClient({ orderCode: orderCodeParam, cancel }: Props) {
  const reconcileMutation = useReconcilePayos();
  const [view, setView] = useState<ViewState>("loading");
  const [result, setResult] = useState<ReconcilePayOsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ranRef = useRef(false);

  const rawOrderCode = orderCodeParam ?? findLatestOrderCode() ?? undefined;
  const orderCode = rawOrderCode != null ? String(rawOrderCode) : undefined;

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!orderCode) {
      setView("error");
      setErrorMessage(
        "Không xác định được mã đơn hàng để xác nhận thanh toán. Vui lòng kiểm tra trong Đơn đã mua.",
      );
      return;
    }

    void run(orderCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode]);

  async function attemptOnce(code: string, signal: AbortSignal) {
    return reconcileMutation.mutateAsync({ request: { orderCode: Number(code) }, signal });
  }

  async function run(code: string) {
    setView("loading");

    // 1) Tolerate a cold-started backend: retry network/5xx failures with backoff.
    let lastErr: unknown = null;
    let response: ReconcilePayOsResponse | null = null;
    for (let i = 0; i < COLD_START_RETRY_DELAYS_MS.length; i++) {
      if (COLD_START_RETRY_DELAYS_MS[i] > 0) await delay(COLD_START_RETRY_DELAYS_MS[i]);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        response = await attemptOnce(code, controller.signal);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      } finally {
        clearTimeout(timer);
      }
    }

    if (!response) {
      setView("error");
      setErrorMessage(messageForError(lastErr));
      return;
    }

    // 2) Tolerate webhook lag: poll a bounded number of times while pending.
    let attempts = 0;
    while (
      !response.activated &&
      (response.paymentStatus ?? "").toLowerCase() === "pending" &&
      attempts < MAX_PENDING_POLLS
    ) {
      attempts += 1;
      setView("pending");
      await delay(PENDING_POLL_DELAY_MS);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        response = await attemptOnce(code, controller.signal);
      } catch (err) {
        // A transient failure mid-poll doesn't abandon the loop — keep trying
        // until the attempt budget is spent.
        lastErr = err;
      } finally {
        clearTimeout(timer);
      }
    }

    setResult(response);

    if (response.activated) {
      clearPendingPayos(response.bookingId ?? undefined);
      setView("success");
      return;
    }

    const payOsStatus = (response.payOsStatus ?? "").toUpperCase();
    if (cancel === "true" || payOsStatus === "CANCELLED") {
      setView("cancelled");
      return;
    }

    if ((response.paymentStatus ?? "").toLowerCase() === "pending") {
      // Exhausted the poll budget — leave the door open, do not claim failure.
      setView("pending");
      return;
    }

    setView("error");
    setErrorMessage(response.message ?? "Thanh toán chưa được xác nhận.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 text-center shadow-[0_8px_32px_-12px_rgba(15,15,30,0.12)]">
        {view === "loading" && (
          <>
            <ClassicLoader size="lg" className="mx-auto" />
            <h1 className="mt-4 text-[16px] font-semibold text-on-surface">
              Đang xác nhận thanh toán…
            </h1>
            <p className="mt-1 text-[13px] text-on-surface-variant">
              Vui lòng không đóng trang này.
            </p>
          </>
        )}

        {view === "pending" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock width={24} height={24} />
            </div>
            <h1 className="mt-4 text-[16px] font-semibold text-on-surface">
              Đang chờ xác nhận từ PayOS
            </h1>
            <p className="mt-1 text-[13px] text-on-surface-variant">
              Giao dịch của bạn đang được xử lý. Điều này đôi khi mất thêm một chút thời gian.
            </p>
            <button
              type="button"
              onClick={() => orderCode && void run(orderCode)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
            >
              <Refresh width={15} height={15} />
              Kiểm tra lại
            </button>
          </>
        )}

        {view === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle width={26} height={26} />
            </div>
            <h1 className="mt-4 text-[16px] font-semibold text-on-surface">
              Thanh toán thành công
            </h1>
            <p className="mt-1 text-[13px] text-on-surface-variant">
              Gói tập của bạn đã được kích hoạt.
            </p>
            <Link
              href={result?.bookingId ? `/bookings/${result.bookingId}` : "/learner/bookings"}
              className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
            >
              Xem đơn đăng ký
            </Link>
          </>
        )}

        {view === "cancelled" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <XmarkCircle width={26} height={26} />
            </div>
            <h1 className="mt-4 text-[16px] font-semibold text-on-surface">
              Thanh toán đã bị huỷ
            </h1>
            <p className="mt-1 text-[13px] text-on-surface-variant">
              Bạn đã huỷ giao dịch này. Bạn có thể quay lại và thử lại bất cứ lúc nào.
            </p>
            <Link
              href="/learner/bookings"
              className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2.5 text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
            >
              <Home width={15} height={15} />
              Về danh sách đơn
            </Link>
          </>
        )}

        {view === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
              <WarningTriangle width={24} height={24} />
            </div>
            <h1 className="mt-4 text-[16px] font-semibold text-on-surface">
              Không thể xác nhận thanh toán
            </h1>
            <p className="mt-1 text-[13px] text-on-surface-variant">{errorMessage}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => orderCode && void run(orderCode)}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
              >
                <Refresh width={15} height={15} />
                Thử lại
              </button>
              <Link
                href="/learner/bookings"
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2.5 text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
              >
                Đơn của tôi
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
