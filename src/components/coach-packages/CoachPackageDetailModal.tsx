"use client";

// ============================================================================
// CoachPackageDetailModal — read-only detail view of a coach's OWN training
// package (opened from the "Xem chi tiết" button on /coach/training-packages).
// Shows everything the learner sees (full overview + fixed schedule) plus
// coach-only context: moderation status, rejection reason. Reuses the shared
// PackageScheduleTimeline + format helpers — no purchase flow here.
// ============================================================================

import { motion } from "motion/react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock,
  Globe,
  Info,
  MapPin,
  Pencil,
  Tag,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  levelLabel,
  goalTypeLabel,
  trainingPackageStatusLabel,
  trainingPackageStatusBadge,
} from "@/lib/training-package-api";
import {
  formatVND,
  calculatePricePerSession,
  packageDurationDays,
  getMainLocation,
  getDeliveryMode,
  formatDateVN,
  displayOr,
  NOT_SET,
} from "@/lib/training-package-format";
import { PackageScheduleTimeline } from "@/components/coach-packages/PackageDetailModal";
import type { TrainingPackageResponse } from "@/lib/backend/dto";

type Pkg = TrainingPackageResponse;

const STATUS_NOTICE: Record<
  string,
  { tone: string; icon: React.ElementType; text: string }
> = {
  pending: {
    tone: "border-[#f4d68a]/60 bg-[#fff5d6] text-[#b95000]",
    icon: Clock,
    text: "Gói đang chờ quản trị viên duyệt. Học viên chưa thể mua gói này.",
  },
  published: {
    tone: "border-[#bce8c8] bg-success-container text-[#1f7a4d]",
    icon: CheckCircle2,
    text: "Gói đã được xuất bản và hiển thị công khai cho học viên.",
  },
  archived: {
    tone: "border-[var(--color-border-soft)] bg-surface-container-high text-on-surface-variant",
    icon: Archive,
    text: "Gói đã được lưu trữ và không còn hiển thị công khai.",
  },
};

export function CoachPackageDetailModal({
  pkg,
  canEdit,
  onEdit,
  onArchive,
  onClose,
}: {
  pkg: Pkg;
  canEdit: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const status = (pkg.status ?? "").toLowerCase();
  const archived = status === "archived";
  const perSession = calculatePricePerSession(pkg.price, pkg.sessionCount);
  const duration = packageDurationDays(pkg);
  const mode = getDeliveryMode(pkg);
  const location = getMainLocation(pkg);
  const notice = STATUS_NOTICE[status];

  const modeText =
    mode === "mixed"
      ? "Trực tiếp & trực tuyến"
      : mode === "online"
        ? "Trực tuyến"
        : "Trực tiếp";

  const tags = [
    goalTypeLabel(pkg.goalType),
    levelLabel(pkg.level),
    pkg.location ?? undefined,
  ].filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_24px_70px_-16px_rgba(15,15,30,0.4)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
                  trainingPackageStatusBadge(pkg.status),
                )}
              >
                {trainingPackageStatusLabel(pkg.status)}
              </span>
            </div>
            <h2 className="truncate text-[17px] font-bold text-on-surface">
              {displayOr(pkg.title)}
            </h2>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">
              {pkg.isOnline ? <Globe size={12} /> : <MapPin size={12} />}
              {pkg.sportName || NOT_SET} · {modeText}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Status notice */}
          {notice && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-[12px] border px-3.5 py-2.5 text-[12.5px]",
                notice.tone,
              )}
            >
              <notice.icon size={15} className="mt-0.5 shrink-0" />
              <p>{notice.text}</p>
            </div>
          )}

          {/* Rejection reason */}
          {status === "rejected" && (
            <div className="flex items-start gap-2 rounded-[12px] border border-[#ffbbb3] bg-[#ffdad6]/50 px-3.5 py-2.5 text-[12.5px] text-[#ba1a1a]">
              <XCircle size={15} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold">Lý do từ chối: </span>
                {displayOr(pkg.rejectionReason, "Không có ghi chú từ quản trị viên.")}
              </p>
            </div>
          )}

          {/* Overview */}
          <section>
            <h3 className="mb-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-on-surface">
              <Info size={15} className="text-on-surface-variant" />
              Tổng quan
            </h3>
            <div className="grid grid-cols-1 gap-x-4 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 px-3.5 py-1 sm:grid-cols-2">
              <Row label="Giá gói" value={formatVND(pkg.price)} />
              <Row
                label="Giá mỗi buổi"
                value={perSession != null ? formatVND(perSession) : NOT_SET}
              />
              <Row label="Tổng số buổi" value={`${pkg.sessionCount} buổi`} />
              <Row
                label="Thời lượng"
                value={duration != null ? `${duration} ngày` : NOT_SET}
              />
              <Row label="Bắt đầu" value={formatDateVN(pkg.startDate)} />
              <Row label="Kết thúc" value={formatDateVN(pkg.endDate)} />
              <Row label="Hình thức" value={modeText} />
              <Row
                label="Địa điểm"
                value={mode === "online" ? "Học từ xa" : location ?? NOT_SET}
              />
              <Row
                label="Trình độ"
                value={displayOr(levelLabel(pkg.level), "Không chỉ định")}
              />
              <Row
                label="Mục tiêu"
                value={displayOr(goalTypeLabel(pkg.goalType), "Không chỉ định")}
              />
            </div>
          </section>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-2.5 py-0.5 text-[11px] text-on-surface-variant"
                >
                  <Tag size={10} />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {pkg.description?.trim() && (
            <section>
              <h3 className="mb-2 text-[14px] font-semibold tracking-tight text-on-surface">
                Mô tả
              </h3>
              <p className="whitespace-pre-line rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-4 text-[13px] leading-relaxed text-on-surface-variant">
                {pkg.description}
              </p>
            </section>
          )}

          {/* Fixed schedule */}
          <section>
            <h3 className="mb-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-on-surface">
              <CalendarClock size={15} className="text-on-surface-variant" />
              Lịch học cố định ({pkg.sessionCount} buổi)
            </h3>
            <PackageScheduleTimeline pkg={pkg} />
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-3">
          {!archived && (
            <button
              onClick={onArchive}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[var(--color-border-soft)] px-3.5 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <Archive size={14} />
              Lưu trữ
            </button>
          )}
          <button
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? "Chỉnh sửa gói tập" : "Gói đã xuất bản không thể chỉnh sửa"}
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={14} />
            Chỉnh sửa
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-on-surface-variant">{label}</span>
      <span className="max-w-[60%] text-right text-[12.5px] font-semibold text-on-surface">
        {value}
      </span>
    </div>
  );
}
