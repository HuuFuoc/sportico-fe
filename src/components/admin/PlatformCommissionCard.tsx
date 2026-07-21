"use client";

import { useEffect, useState } from "react";
import { Loader2, Percent, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { PlatformCommissionResponse } from "@/lib/backend/dto";

/**
 * Admin control for the platform commission percent.
 *
 * Backed by GET/PUT /api/admin/platform-settings/commission. This is a
 * finance/ops control, so it follows the restrained console style (small
 * radius, tabular numerals, no gradients) rather than the premium dashboard
 * treatment.
 */
export function PlatformCommissionCard() {
  const { data, loading, error, refetch } = useApiResource(
    () => api.fetchPlatformCommission(),
    [],
  );

  /** Last persisted value — seeded from the fetch, replaced after each save. */
  const [settings, setSettings] = useState<PlatformCommissionResponse | null>(
    null,
  );
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setSettings(data);
      setValue(String(data.commissionPercent));
    }
  }, [data]);

  const parsed = Number(value);
  const valid =
    value.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= 100;
  const dirty = settings !== null && parsed !== settings.commissionPercent;

  async function handleSave() {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    try {
      const res = await api.updatePlatformCommission(parsed);
      setSettings(res);
      setValue(String(res.commissionPercent));
      showSuccess("Đã cập nhật hoa hồng nền tảng.");
    } catch (err) {
      showApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(15,15,30,0.04)]">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
          <Percent size={14} strokeWidth={2.25} />
        </div>
        <h2 className="text-[14px] font-semibold text-on-surface">
          Hoa hồng nền tảng
        </h2>
      </div>
      <p className="mb-5 text-[12.5px] leading-relaxed text-on-surface-variant">
        Phần trăm nền tảng giữ lại trên mỗi gói tập được thanh toán. Phần còn
        lại được ghi vào ví của huấn luyện viên.
      </p>

      {loading ? (
        <LoadingState label="Đang tải cấu hình…" className="py-10" />
      ) : error ? (
        <ErrorState
          message="Không tải được mức hoa hồng hiện tại."
          onRetry={refetch}
        />
      ) : settings === null ? (
        // Mock mode: no fixture for this setting — say so instead of showing 0%.
        <p className="rounded-[10px] border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-center text-[12.5px] text-on-surface-variant">
          Cần kết nối backend để xem và chỉnh mức hoa hồng.
        </p>
      ) : (
        <>
          <label
            htmlFor="commissionPercent"
            className="mb-1.5 block text-[12px] font-medium text-on-surface"
          >
            Mức hoa hồng
          </label>
          <div className="flex items-start gap-2.5">
            <div className="relative">
              <input
                id="commissionPercent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.5}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={saving}
                aria-invalid={!valid}
                className={cn(
                  "h-10 w-32 rounded-[6px] border bg-surface-container-lowest pl-3 pr-8 text-[14px] font-semibold tabular-nums text-on-surface transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  valid
                    ? "border-[var(--color-border-soft)] focus:border-primary"
                    : "border-error focus:border-error focus:ring-error/25",
                  saving && "opacity-60",
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">
                %
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!valid || !dirty || saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-[6px] bg-primary px-4 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d1fae] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>

          {!valid && (
            <p role="alert" className="mt-1.5 text-[12px] text-error">
              Nhập một số từ 0 đến 100.
            </p>
          )}

          <p className="mt-3 text-[11.5px] text-on-surface-variant">
            Đang áp dụng:{" "}
            <span className="font-semibold tabular-nums text-on-surface">
              {settings.commissionPercent}%
            </span>
            {" · "}
            Cập nhật lần cuối{" "}
            {new Date(settings.updatedAt).toLocaleString("vi-VN", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      )}
    </div>
  );
}
