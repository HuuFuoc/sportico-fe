"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
  label = "Book a Session",
}: BookSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      let pkgId = packageId;
      if (!pkgId) {
        const coach = await api.fetchCoach(coachId);
        pkgId = coach?.packageId;
      }
      const result = await api.purchasePackage(pkgId ?? "");
      if ("checkoutUrl" in result) {
        window.location.href = result.checkoutUrl;
        return; // keep the spinner while the browser navigates away
      }
      router.push("/learner/schedule");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đặt lịch thất bại. Vui lòng thử lại.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
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
      {error && (
        <p className="text-body-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
