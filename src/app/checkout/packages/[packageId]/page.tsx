"use client";

import { use, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Percentage,
  ShieldCheck,
  Gift,
  Wifi,
  WarningTriangle,
} from "iconoir-react";
import ClassicLoader from "@/components/ui/loader";
import { LearnerGuard } from "@/components/auth/LearnerGuard";
import { ErrorState } from "@/components/common/AsyncStates";
import { backend } from "@/lib/backend/client";
import { savePendingPayos } from "@/lib/payos-pending";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateVn } from "@/lib/social/datetime";
import { usePublicUser } from "@/lib/social/hooks/usePublicUser";
import { useValidateVoucher, usePurchaseTrainingPackage } from "@/lib/social/hooks/useCheckout";
import {
  voucherReducer,
  initialVoucherState,
  appliedVoucherCode,
  appliedQuote,
  isVoucherBusy,
  isVoucherPurchaseRejection,
} from "@/lib/social/voucher-state";
import { messageForError } from "@/lib/social/errors";
import { ApiResultError } from "@/lib/api-result";
import { showApiError } from "@/lib/toast";

interface PageProps {
  params: Promise<{ packageId: string }>;
}

export default function CheckoutPackagePage({ params }: PageProps) {
  const { packageId } = use(params);
  return (
    <LearnerGuard>
      <CheckoutClient packageId={packageId} />
    </LearnerGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CheckoutClient({ packageId }: { packageId: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const pkgQuery = useQuery({
    queryKey: ["public-training-package", packageId],
    queryFn: () => backend.publicTrainingPackage(packageId),
    staleTime: 60_000,
  });

  const coachQuery = usePublicUser(pkgQuery.data?.coachId ?? null);

  const [voucherState, dispatch] = useReducer(voucherReducer, initialVoucherState);
  const [voucherInput, setVoucherInput] = useState("");
  const voucherFieldRef = useRef<HTMLInputElement>(null);

  const validateMutation = useValidateVoucher();
  const purchaseMutation = usePurchaseTrainingPackage();

  const pkg = pkgQuery.data;
  const originalAmount = pkg?.price ?? 0;
  const quote = appliedQuote(voucherState);
  const totalAmount = quote ? quote.totalAmount : originalAmount;
  const discountAmount = quote?.discountAmount ?? 0;

  async function handleValidate() {
    const code = voucherInput.trim();
    if (!code || !pkg) return;
    if (code.length > 64) return;
    dispatch({ type: "validate", code });
    try {
      const result = await validateMutation.mutateAsync({
        code,
        trainingPackageId: pkg.id,
      });
      dispatch({ type: "validated", code, quote: result });
    } catch (err) {
      dispatch({ type: "validation_failed", code, message: messageForError(err) });
    }
  }

  function handleClearVoucher() {
    dispatch({ type: "clear" });
    setVoucherInput("");
    requestAnimationFrame(() => voucherFieldRef.current?.focus());
  }

  async function handlePurchase(withVoucher: boolean) {
    if (!pkg) return;
    const code = withVoucher ? appliedVoucherCode(voucherState) : null;
    try {
      const result = await purchaseMutation.mutateAsync({
        trainingPackageId: pkg.id,
        voucherCode: code ?? undefined,
      });

      // The ONLY signal that decides where we go next — never totalAmount.
      if (result.paymentRequired) {
        if (!result.checkoutUrl || !result.orderCode) {
          showApiError(new Error("Không nhận được liên kết thanh toán từ PayOS."));
          return;
        }
        savePendingPayos({
          bookingId: result.bookingId,
          paymentId: result.paymentId,
          orderCode: result.orderCode,
          createdAt: new Date().toISOString(),
        });
        window.location.href = result.checkoutUrl;
        return;
      }

      router.push(`/bookings/${result.bookingId}`);
    } catch (err) {
      const code =
        err instanceof ApiResultError && withVoucher ? err.code : undefined;
      if (withVoucher && isVoucherPurchaseRejection(code)) {
        dispatch({ type: "purchase_rejected", message: messageForError(err) });
        return;
      }
      showApiError(err);
    }
  }

  if (pkgQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <ClassicLoader size="lg" />
      </div>
    );
  }

  if (pkgQuery.isError || !pkg) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          title="Không tải được gói tập"
          message="Gói tập không tồn tại hoặc đã bị gỡ. Vui lòng quay lại và thử gói khác."
          onRetry={() => pkgQuery.refetch()}
        />
      </div>
    );
  }

  const purchasing = purchaseMutation.isPending;
  const rejected = voucherState.status === "purchase_rejected";

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={`/coaches/${pkg.coachId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft width={16} height={16} />
        Quay lại hồ sơ huấn luyện viên
      </Link>

      <h1 className="text-[22px] font-bold text-on-surface">Xác nhận thanh toán</h1>
      <p className="mt-1 text-[13px] text-on-surface-variant">
        Kiểm tra thông tin gói tập trước khi hoàn tất thanh toán.
      </p>

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-on-surface">{pkg.title}</p>
            <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
              HLV: {coachQuery.data?.name ?? "Đang tải…"}
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
            {pkg.sessionCount} buổi
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-[var(--color-border-soft)] pt-4 text-[13px] text-on-surface-variant sm:grid-cols-2">
          {pkg.startDate && pkg.endDate && (
            <div className="flex items-center gap-2">
              <Calendar width={15} height={15} className="shrink-0" />
              {formatDateVn(pkg.startDate)} – {formatDateVn(pkg.endDate)}
            </div>
          )}
          <div className="flex items-center gap-2">
            {pkg.isOnline ? (
              <>
                <Wifi width={15} height={15} className="shrink-0" />
                Học trực tuyến
              </>
            ) : (
              <>
                <MapPin width={15} height={15} className="shrink-0" />
                {pkg.location || "Địa điểm do HLV sắp xếp"}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Voucher */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5"
      >
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <Gift width={16} height={16} className="text-primary" />
          Mã giảm giá
        </div>

        {voucherState.status !== "valid" && !rejected && (
          <div className="flex gap-2">
            <input
              ref={voucherFieldRef}
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void handleValidate()}
              maxLength={64}
              placeholder="Nhập mã giảm giá"
              disabled={isVoucherBusy(voucherState)}
              className="min-w-0 flex-1 rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3.5 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => void handleValidate()}
              disabled={!voucherInput.trim() || isVoucherBusy(voucherState)}
              className="shrink-0 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-50"
            >
              {isVoucherBusy(voucherState) ? "Đang kiểm tra…" : "Áp dụng"}
            </button>
          </div>
        )}

        {voucherState.status === "invalid" && (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-error">
            <WarningTriangle width={14} height={14} />
            {voucherState.message}
          </p>
        )}

        {voucherState.status === "valid" && (
          <div className="flex items-center justify-between rounded-[10px] bg-primary/5 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-primary">
              <Percentage width={15} height={15} />
              {voucherState.code}
              <span className="font-normal text-on-surface-variant">
                −{formatCurrencyVnd(voucherState.quote.discountAmount)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearVoucher}
              className="text-[12.5px] font-medium text-on-surface-variant hover:text-error"
            >
              Gỡ mã
            </button>
          </div>
        )}

        {rejected && (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-amber-800">
              <WarningTriangle width={15} height={15} />
              {voucherState.status === "purchase_rejected" && voucherState.message}
            </p>
            <p className="mt-1 text-[12.5px] text-amber-700">
              Mã <span className="font-semibold">{voucherState.status === "purchase_rejected" ? voucherState.code : ""}</span> không còn áp dụng được ở thời điểm mua. Bạn có thể thử mã khác hoặc tiếp tục mua với giá gốc.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleClearVoucher}
                className="rounded-[8px] border border-amber-300 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Thử mã khác
              </button>
              <button
                type="button"
                onClick={() => void handlePurchase(false)}
                disabled={purchasing}
                className="rounded-[8px] bg-amber-600 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {purchasing ? "Đang xử lý…" : "Mua với giá gốc"}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Price breakdown */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5"
      >
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between text-on-surface-variant">
            <span>Giá gốc</span>
            <span className="tabular-nums">{formatCurrencyVnd(originalAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Giảm giá</span>
              <span className="tabular-nums">−{formatCurrencyVnd(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--color-border-soft)] pt-2 text-[15px] font-bold text-on-surface">
            <span>Tổng thanh toán</span>
            <span className="tabular-nums">{formatCurrencyVnd(totalAmount)}</span>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">
          <ShieldCheck width={13} height={13} />
          Số tiền cuối cùng do máy chủ tính toán tại thời điểm thanh toán.
        </p>

        {!rejected && (
          <button
            type="button"
            onClick={() => void handlePurchase(true)}
            disabled={purchasing || isVoucherBusy(voucherState)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-3 text-[14px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
          >
            {purchasing ? (
              "Đang xử lý…"
            ) : (
              <>
                <Check width={16} height={16} />
                {totalAmount === 0 ? "Kích hoạt gói tập" : `Thanh toán ${formatCurrencyVnd(totalAmount)}`}
              </>
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
