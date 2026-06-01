"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Home,
  ClipboardList,
  Hash,
  Receipt,
  Tag,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentState = "loading" | "success" | "pending" | "invalid" | "error";

interface PaymentParams {
  code?: string;
  id?: string;
  cancel?: string;
  status?: string;
  orderCode?: string;
}

interface Props {
  params: PaymentParams;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The Azure backend can cold-start on the first request after it has been idle,
// so the very first reconcile often fails (timeout / 5xx) while it wakes up — a
// manual retry a few seconds later then succeeds. To make that invisible, the
// initial flow retries automatically with backoff before surfacing an error.
const MAX_AUTO_ATTEMPTS = 4;
/** Hard cap per attempt so a hung request can never freeze the spinner forever. */
const ATTEMPT_TIMEOUT_MS = 15_000;
/** Delay BEFORE attempt i (gives the backend time to finish booting). */
const RETRY_BACKOFF_MS = [0, 2_000, 4_000, 6_000];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** One reconcile attempt, aborted if it exceeds {@link ATTEMPT_TIMEOUT_MS}. */
async function reconcileOnce(orderCode: string | number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await api.reconcilePayment(orderCode, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

interface StatusConfig {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
}

function getStatusConfig(state: PaymentState, reason?: string): StatusConfig {
  if (state === "loading") {
    return {
      icon: <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />,
      iconBg: "bg-slate-100",
      title: "Đang xác nhận thanh toán",
      description: "Vui lòng chờ trong giây lát…",
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-600",
      badgeLabel: "Đang xử lý",
    };
  }

  if (state === "success") {
    return {
      icon: <CheckCircle2 className="w-10 h-10 text-emerald-600" />,
      iconBg: "bg-emerald-50",
      title: "Thanh toán thành công",
      description:
        "Giao dịch của bạn đã được ghi nhận. Gói tập của bạn đã được kích hoạt.",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      badgeLabel: "PAID",
    };
  }

  if (state === "pending") {
    return {
      icon: <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />,
      iconBg: "bg-amber-50",
      title: "Đang chờ xác nhận",
      description:
        "Thanh toán đã được ghi nhận nhưng gói tập chưa được kích hoạt. Nhấn nút đồng bộ để thử lại.",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeLabel: "PENDING",
    };
  }

  if (state === "invalid") {
    if (reason === "cancelled") {
      return {
        icon: <XCircle className="w-10 h-10 text-amber-600" />,
        iconBg: "bg-amber-50",
        title: "Thanh toán đã bị huỷ",
        description:
          "Bạn đã huỷ quá trình thanh toán. Không có khoản nào bị trừ.",
        badgeBg: "bg-amber-50",
        badgeText: "text-amber-700",
        badgeLabel: "CANCELLED",
      };
    }
    return {
      icon: <AlertTriangle className="w-10 h-10 text-amber-600" />,
      iconBg: "bg-amber-50",
      title: "Không xác nhận được thanh toán",
      description:
        "Thông tin thanh toán không hợp lệ hoặc chưa đầy đủ. Nếu bạn đã thanh toán, vui lòng kiểm tra lại lịch sử đơn hàng.",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeLabel: "INVALID",
    };
  }

  // error
  return {
    icon: <XCircle className="w-10 h-10 text-red-600" />,
    iconBg: "bg-red-50",
    title: "Lỗi xác nhận thanh toán",
    description:
      "Không thể kết nối với hệ thống để xác minh giao dịch. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeLabel: "ERROR",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentSuccessUI({ params }: Props) {
  const [state, setState] = useState<PaymentState>("loading");
  const [failReason, setFailReason] = useState<string | undefined>();
  const [bookingId, setBookingId] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reconcile = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setRetrying(true);
      } else {
        setState("loading");
        setAttempt(0);
      }

      // 1. Handle explicit cancel from PayOS redirect
      if (params.cancel === "true") {
        setState("invalid");
        setFailReason("cancelled");
        if (isRetry) setRetrying(false);
        return;
      }

      // 2. Resolve orderCode: URL param first, then sessionStorage fallback
      let resolvedOrderCode: string | number | null = params.orderCode ?? null;
      if (!resolvedOrderCode) {
        try {
          const raw = sessionStorage.getItem("pendingPayosPayment");
          if (raw) {
            const pending = JSON.parse(raw) as { orderCode?: number };
            if (pending.orderCode) resolvedOrderCode = pending.orderCode;
          }
        } catch {
          // sessionStorage not available
        }
      }

      if (!resolvedOrderCode) {
        setState("invalid");
        setFailReason("missing_params");
        if (isRetry) setRetrying(false);
        return;
      }

      // 3. Call backend reconcile — the real source of truth. On the initial
      //    flow we auto-retry with backoff so a cold-starting backend recovers
      //    transparently (the spinner stays up). A manual retry is a single shot.
      const maxAttempts = isRetry ? 1 : MAX_AUTO_ATTEMPTS;
      for (let i = 0; i < maxAttempts; i++) {
        if (i > 0) {
          setAttempt(i);
          await delay(RETRY_BACKOFF_MS[i] ?? 6_000);
        }

        try {
          const result = await reconcileOnce(resolvedOrderCode);
          // Clear pending payment record once reconcile succeeds
          try { sessionStorage.removeItem("pendingPayosPayment"); } catch { /**/ }

          if (result.activated === true || result.bookingStatus?.toLowerCase() === "active") {
            setBookingId(result.bookingId ?? undefined);
            setState("success");
          } else {
            const payOsStatus = (result.payOsStatus ?? "").toUpperCase();
            if (["CANCELLED", "EXPIRED", "FAILED"].includes(payOsStatus)) {
              setState("invalid");
              setFailReason("cancelled");
            } else {
              // PENDING / PROCESSING — let learner retry manually
              setState("pending");
            }
          }
          if (isRetry) setRetrying(false);
          return; // settled — stop retrying
        } catch {
          // Transient failure (timeout / network / 5xx). Keep the spinner up and
          // retry if attempts remain; only surface the error on the last attempt.
          if (i === maxAttempts - 1) setState("error");
        }
      }

      if (isRetry) setRetrying(false);
    },
    [params],
  );

  useEffect(() => {
    void reconcile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = getStatusConfig(state, failReason);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <img src="/logo.png" alt="Sportico" className="h-7 w-auto" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)] overflow-hidden">
            {/* Status area */}
            <div className="px-8 py-8 text-center">
              <div
                className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}
              >
                {config.icon}
              </div>

              <h1 className="text-xl font-semibold text-slate-900 mb-2">
                {config.title}
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                {config.description}
              </p>

              {state === "loading" && attempt > 0 && (
                <p className="mt-2 text-xs text-slate-400 tabular-nums">
                  Hệ thống đang khởi động, đang thử lại… ({attempt + 1}/{MAX_AUTO_ATTEMPTS})
                </p>
              )}

              {/* Status badge */}
              <span
                className={`inline-flex items-center mt-4 px-3 py-1 rounded-full text-xs font-medium tabular-nums ${config.badgeBg} ${config.badgeText}`}
              >
                {config.badgeLabel}
              </span>
            </div>

            {/* Transaction details — only show when state is settled */}
            {(state === "success" || state === "pending") && (
              <div className="border-t border-slate-100 px-8 py-5 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                  Chi tiết giao dịch
                </p>

                {params.orderCode && (
                  <DetailRow
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="Mã đơn hàng"
                    value={params.orderCode}
                  />
                )}
                {params.id && (
                  <DetailRow
                    icon={<Receipt className="w-3.5 h-3.5" />}
                    label="Mã giao dịch"
                    value={params.id}
                    mono
                  />
                )}
                {params.status && (
                  <DetailRow
                    icon={<Tag className="w-3.5 h-3.5" />}
                    label="Trạng thái PayOS"
                    value={params.status}
                  />
                )}
              </div>
            )}

            {/* Actions */}
            {state !== "loading" && (
              <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
                {state === "success" && (
                  <Link
                    href={
                      bookingId
                        ? `/learner/plan?booking=${bookingId}`
                        : "/learner/bookings"
                    }
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#3525cd] text-white rounded-lg text-sm font-medium hover:bg-[#2d20b8] transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Xem gói tập của tôi
                  </Link>
                )}

                {state === "pending" && (
                  <button
                    onClick={() => void reconcile(true)}
                    disabled={retrying}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#3525cd] text-white rounded-lg text-sm font-medium hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
                  >
                    {retrying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {retrying ? "Đang đồng bộ…" : "Đồng bộ lại trạng thái"}
                  </button>
                )}

                {state === "error" && (
                  <button
                    onClick={() => void reconcile(true)}
                    disabled={retrying}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#3525cd] text-white rounded-lg text-sm font-medium hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
                  >
                    {retrying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {retrying ? "Đang thử lại…" : "Thử lại xác nhận"}
                  </button>
                )}

                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </Link>

                {(state === "invalid") && (
                  <Link
                    href="/learner/coaches"
                    className="text-center text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
                  >
                    Tìm huấn luyện viên khác
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          {state === "success" && (
            <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed px-4">
              Gói tập của bạn đã được kích hoạt. Bạn sẽ được chuyển hướng tự động.
              Nếu gặp bất kỳ vấn đề nào, vui lòng liên hệ hỗ trợ với mã đơn hàng ở trên.
            </p>
          )}

          {state === "pending" && (
            <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed px-4">
              Nếu vấn đề tiếp diễn sau vài phút, vui lòng liên hệ hỗ trợ với mã đơn hàng ở trên.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail row sub-component
// ---------------------------------------------------------------------------

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-slate-500 shrink-0">
        {icon}
        {label}
      </span>
      <span
        className={`text-slate-800 text-right break-all tabular-nums ${mono ? "font-mono text-xs" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
