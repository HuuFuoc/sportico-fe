"use client";

import { useState } from "react";
import { TriangleFlag } from "iconoir-react";
import { Modal } from "@/components/social/Modal";
import { REPORT_REASON_OPTIONS } from "@/lib/social/labels";
import { REPORT_DESCRIPTION_MAX_LENGTH, REPORT_REASON_MAX_LENGTH } from "@/lib/social/api/reports";
import { useCreateReport } from "@/lib/social/hooks/useReports";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ReportTargetType } from "@/lib/social/types";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

/** Shared report dialog for a community post, a comment, or a chat message. */
export function ReportModal({ open, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = useState<string>(REPORT_REASON_OPTIONS[0].value);
  const [description, setDescription] = useState("");
  const createReport = useCreateReport();

  function reset() {
    setReason(REPORT_REASON_OPTIONS[0].value);
    setDescription("");
  }

  async function handleSubmit() {
    try {
      await createReport.mutateAsync({
        targetType,
        targetId,
        reason: reason.slice(0, REPORT_REASON_MAX_LENGTH),
        description: description.trim() ? description.trim() : undefined,
      });
      showSuccess("Đã gửi báo cáo. Cảm ơn bạn đã giúp Sportico an toàn hơn.");
      reset();
      onClose();
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Báo cáo nội dung"
      description="Cho chúng tôi biết vấn đề bạn gặp phải. Đội ngũ quản trị sẽ xem xét sớm nhất."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container-low"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createReport.isPending}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60"
          >
            <TriangleFlag width={14} height={14} />
            {createReport.isPending ? "Đang gửi…" : "Gửi báo cáo"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-on-surface">Lý do</p>
          <div className="grid grid-cols-2 gap-1.5">
            {REPORT_REASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReason(opt.value)}
                className={cn(
                  "rounded-[8px] border px-2.5 py-2 text-left text-[12.5px] transition-colors",
                  reason === opt.value
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary/30",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-on-surface">
            Mô tả thêm <span className="font-normal text-on-surface-variant">(không bắt buộc)</span>
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, REPORT_DESCRIPTION_MAX_LENGTH))}
            rows={3}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            placeholder="Mô tả chi tiết vấn đề…"
            className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-right text-[11px] text-on-surface-variant">
            {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      </div>
    </Modal>
  );
}
