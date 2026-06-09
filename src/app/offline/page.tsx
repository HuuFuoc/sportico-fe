"use client";

import { WifiOff, RotateCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <WifiOff className="size-8" strokeWidth={1.75} />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-on-surface">Bạn đang ngoại tuyến</h1>
        <p className="max-w-sm text-sm text-on-surface-variant">
          Không có kết nối mạng. Một số nội dung đã xem có thể vẫn hiển thị — hãy kết nối lại để
          tiếp tục.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-container"
      >
        <RotateCw className="size-4" />
        Thử lại
      </button>
    </main>
  );
}
