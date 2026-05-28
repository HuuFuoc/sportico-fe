"use client";

import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared loading / error states for API-backed Client Components.
 *
 * Kept visually consistent with the in-app shell (surface tokens, indigo
 * accent, dashed borders). For empty results, reuse `@/components/common/
 * EmptyState` instead.
 */

export function LoadingState({
  label = "Đang tải…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Không tải được dữ liệu",
  message = "Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-error/10 text-error">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-on-surface">{title}</p>
        {message && (
          <p className="mt-1 max-w-sm text-[13px] text-on-surface-variant">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2 text-[13px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Thử lại
        </button>
      )}
    </div>
  );
}
