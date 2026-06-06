"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { savePendingPayos } from "@/lib/payos-pending";
import { showError, showApiError } from "@/lib/toast";

interface BookSessionButtonProps {
  /** Coach id from the route — used to resolve the live package client-side. */
  coachId: string;
  /** Known training-package id, if already available (skips the lookup). */
  packageId?: string;
  className?: string;
  label?: string;
}

/**
 * Buys a coach's training package. In live mode it opens a real PayOS checkout
 * (redirect); in mock/demo mode it simulates an instant booking and sends the
 * learner to their schedule.
 *
 * The parent page is server-rendered (demo data, no live `packageId`), so when
 * `packageId` is absent we fetch the coach client-side to get the real one.
 */
export function BookSessionButton({
  coachId,
  packageId,
  className,
  label = "Đặt buổi tập",
}: BookSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let pkgId = packageId;
      if (!pkgId) {
        const coach = await api.fetchCoach(coachId);
        pkgId = coach?.packageId;
      }
      if (!pkgId) {
        showError("Huấn luyện viên chưa có gói tập. Vui lòng liên hệ trực tiếp.");
        setLoading(false);
        return;
      }
      const result = await api.purchasePackage(pkgId);
      if ("checkoutUrl" in result) {
        // Remember the orderCode so the booking can be reconciled later — even
        // if PayOS does not echo it back in the redirect URL, or the learner
        // returns to "Đồng bộ thanh toán" in a later session.
        savePendingPayos({
          bookingId: result.bookingId,
          paymentId: result.paymentId,
          orderCode: result.orderCode,
          createdAt: new Date().toISOString(),
        });
        window.location.href = result.checkoutUrl;
        return; // keep the spinner while the browser navigates away
      }
      router.push("/learner/bookings");
    } catch (err) {
      showApiError(err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleBook()}
      disabled={loading}
      className={cn(
        "px-5 py-2.5 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      {loading ? "Đang xử lý…" : label}
    </button>
  );
}
