"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
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
 * Buys a coach's training package. In live mode it sends the learner to the
 * checkout screen (`/checkout/packages/[id]`) — the only place a voucher code
 * can be applied, and the owner of the PayOS redirect. In mock/demo mode there
 * is no backend to price the package, so it simulates an instant booking.
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
      if (!isMockMode()) {
        router.push(`/checkout/packages/${pkgId}`);
        return; // keep the spinner while the router navigates away
      }
      await api.purchasePackage(pkgId);
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
