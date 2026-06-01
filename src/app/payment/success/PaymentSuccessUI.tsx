"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { backend } from "@/lib/backend/client";

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

function parsePaymentParams(params: PaymentParams): {
  isValid: boolean;
  reason?: string;
} {
  const { code, cancel, status } = params;

  if (!code && !status) {
    return { isValid: false, reason: "missing_params" };
  }
  if (cancel === "true") {
    return { isValid: false, reason: "cancelled" };
  }
  if (status !== "PAID") {
    return { isValid: false, reason: "not_paid" };
  }
  if (code !== "00") {
    return { isValid: false, reason: "bad_code" };
  }

  return { isValid: true };
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
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("loading");
  const [failReason, setFailReason] = useState<string | undefined>();
  const [bookingId, setBookingId] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);

  const reconcile = useCallback(
    async (isRetry = false) => {
      if (isRetry) setRetrying(true);

      // 1. URL param sanity check
      const { isValid, reason } = parsePaymentParams(params);
      if (!isValid) {
        setFailReason(reason);
        setState("invalid");
        if (isRetry) setRetrying(false);
        return;
      }

      if (!params.orderCode) {
        setFailReason("missing_params");
        setState("invalid");
        if (isRetry) setRetrying(false);
        return;
      }

      // 2. Call backend reconcile — the real source of truth
      try {
        const result = await backend.reconcilePayos(params.orderCode);

        if (result.activated === true) {
          const activatedBookingId = result.bookingId ?? undefined;
          setBookingId(activatedBookingId);
          setState("success");
          // Auto-navigate to the activated booking's plan after a short delay.
          setTimeout(() => {
            router.push(
              activatedBookingId
                ? `/learner/plan?booking=${activatedBookingId}`
                : "/learner/bookings",
            );
          }, 2500);
        } else {
          // Payment was recorded by PayOS but webhook hasn't fired yet;
          // show pending so learner can retry manually.
          setState("pending");
        }
      } catch {
        setState("error");
      } finally {
        if (isRetry) setRetrying(false);
      }
    },
    [params, router],
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
