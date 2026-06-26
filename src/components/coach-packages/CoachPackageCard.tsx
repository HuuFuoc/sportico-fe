"use client";

// ============================================================================
// CoachPackageCard — learner-facing summary card for a fixed-schedule training
// package. Shows only the decision-critical info; full detail lives in
// PackageDetailModal (opened via "Xem chi tiết"). Built entirely from real
// backend fields + values derived from the fixed schedule (see
// training-package-format.ts) — never demo data.
// ============================================================================

import {
  BadgeCheck,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  Layers,
  MapPin,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelLabel, goalTypeLabel } from "@/lib/training-package-api";
import {
  formatVND,
  calculatePricePerSession,
  packageDurationDays,
  getNextSession,
  getMainLocation,
  getDeliveryMode,
  getRemainingSlots,
  getMaxParticipants,
  isPackageSoldOut,
  formatDateVN,
  formatTimeVN,
  modeLabel,
  sportLabelVi,
  NOT_SET,
} from "@/lib/training-package-format";
import type { PublicCoachTrainingPackageResponse } from "@/lib/backend/dto";

type Pkg = PublicCoachTrainingPackageResponse;

// ── Price block ────────────────────────────────────────────────────────────

export function PackagePriceBlock({ pkg }: { pkg: Pkg }) {
  const perSession = calculatePricePerSession(pkg.price, pkg.sessionCount);
  return (
    <div className="text-right">
      <p className="text-[19px] font-bold leading-none tabular-nums text-primary">
        {formatVND(pkg.price)}
      </p>
      {perSession != null && (
        <p className="mt-1 text-[11px] tabular-nums text-on-surface-variant">
          {formatVND(perSession)} / buổi · {pkg.sessionCount} buổi
        </p>
      )}
      <p className="mt-0.5 text-[10.5px] text-on-surface-variant/70">
        Thanh toán một lần cho cả gói
      </p>
    </div>
  );
}

// ── Quick info grid ────────────────────────────────────────────────────────

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide text-on-surface-variant/70">
        <Icon size={10} className="shrink-0" />
        {label}
      </div>
      <p className="mt-0.5 truncate text-[12.5px] font-semibold text-on-surface">
        {value}
      </p>
    </div>
  );
}

export function PackageQuickInfoGrid({ pkg }: { pkg: Pkg }) {
  const duration = packageDurationDays(pkg);
  const next = getNextSession(pkg);
  const mode = getDeliveryMode(pkg);
  const location = getMainLocation(pkg);
  const remaining = getRemainingSlots(pkg);
  const maxP = getMaxParticipants(pkg);

  const modeValue =
    mode === "mixed"
      ? "Trực tiếp & trực tuyến"
      : mode === "online"
        ? "Trực tuyến"
        : "Trực tiếp";

  const slotValue =
    remaining != null
      ? `Còn ${remaining} chỗ`
      : maxP != null
        ? `Tối đa ${maxP} HV`
        : null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-3 sm:grid-cols-3">
      <InfoCell
        icon={Calendar}
        label="Thời lượng"
        value={duration != null ? `${duration} ngày` : NOT_SET}
      />
      <InfoCell icon={Layers} label="Số buổi" value={`${pkg.sessionCount} buổi`} />
      <InfoCell
        icon={CalendarClock}
        label="Bắt đầu"
        value={next ? formatDateVN(next.startTime) : NOT_SET}
      />
      <InfoCell
        icon={mode === "online" ? Wifi : MapPin}
        label="Hình thức"
        value={modeValue}
      />
      <InfoCell
        icon={MapPin}
        label="Địa điểm"
        value={mode === "online" ? "Học từ xa" : location ?? NOT_SET}
      />
      {slotValue && <InfoCell icon={Users} label="Chỗ trống" value={slotValue} />}
    </div>
  );
}

// ── Schedule preview (first 2–3 sessions) ──────────────────────────────────

export function PackageSchedulePreview({ pkg }: { pkg: Pkg }) {
  const sessions = (pkg.sessions ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  if (sessions.length === 0) return null;
  const preview = sessions.slice(0, 2);
  const extra = sessions.length - preview.length;

  return (
    <div className="mt-3 border-t border-[var(--color-border-soft)] pt-2.5">
      <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-on-surface-variant/70">
        <Clock size={11} />
        Lịch học gần nhất
      </p>
      <ul className="space-y-1">
        {preview.map((s) => (
          <li
            key={s.sessionNumber}
            className="flex items-center justify-between gap-2 text-[12px]"
          >
            <span className="text-on-surface-variant">Buổi {s.sessionNumber}</span>
            <span className="tabular-nums font-medium text-on-surface">
              {formatDateVN(s.startTime)} · {formatTimeVN(s.startTime)}-
              {formatTimeVN(s.endTime)}
            </span>
          </li>
        ))}
      </ul>
      {extra > 0 && (
        <p className="mt-1 text-[11px] text-on-surface-variant/70">
          + {extra} buổi khác
        </p>
      )}
    </div>
  );
}

// ── Tags ────────────────────────────────────────────────────────────────────

export function PackageTags({ pkg }: { pkg: Pkg }) {
  const maxP = getMaxParticipants(pkg);
  const tags: { icon: React.ElementType; text: string }[] = [];

  (pkg.level ?? "")
    .split(/[,;]+/)
    .map((l) => levelLabel(l.trim()))
    .filter(Boolean)
    .forEach((l) => tags.push({ icon: BadgeCheck, text: l }));

  const goal = goalTypeLabel(pkg.goalType);
  if (goal) tags.push({ icon: Target, text: goal });

  if (maxP != null) {
    tags.push({
      icon: Users,
      text: maxP <= 1 ? "1 kèm 1" : maxP <= 4 ? "Nhóm nhỏ" : `Nhóm ${maxP}`,
    });
  }

  if (tags.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {tags.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-2.5 py-0.5 text-[11px] text-on-surface-variant"
        >
          <t.icon size={10} />
          {t.text}
        </span>
      ))}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

export function CoachPackageCard({
  pkg,
  isSelected,
  isRecommended,
  onSelect,
  onViewDetail,
}: {
  pkg: Pkg;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  const soldOut = isPackageSoldOut(pkg);
  const subtitle = [
    sportLabelVi(pkg.sportName),
    modeLabel(pkg.isOnline),
    levelLabel(pkg.level) || null,
    goalTypeLabel(pkg.goalType) || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative w-full cursor-pointer rounded-[16px] border p-4 text-left transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/[0.035] shadow-[0_0_0_1.5px_var(--color-primary),0_8px_24px_-12px_rgba(53,37,205,0.25)]"
          : "border-[var(--color-border-soft)] bg-surface-container-lowest hover:border-primary/40 hover:shadow-[0_4px_16px_-8px_rgba(15,15,30,0.12)]",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                <Sparkles size={9} />
                Đề xuất
              </span>
            )}
            {soldOut && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                Hết chỗ
              </span>
            )}
          </div>
          <h3 className="truncate text-[15px] font-bold leading-snug text-on-surface">
            {pkg.title ?? "Gói tập"}
          </h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary">
            <Trophy size={12} className="shrink-0" />
            <span className="truncate">{subtitle}</span>
          </p>
        </div>
        <div className="shrink-0">
          <PackagePriceBlock pkg={pkg} />
        </div>
      </div>

      <PackageQuickInfoGrid pkg={pkg} />

      {pkg.description?.trim() && (
        <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-on-surface-variant">
          {pkg.description}
        </p>
      )}

      <PackageSchedulePreview pkg={pkg} />

      <PackageTags pkg={pkg} />

      {/* CTA */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest text-[12.5px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
        >
          Xem chi tiết
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] font-semibold transition-colors",
            isSelected
              ? "bg-primary/10 text-primary"
              : "bg-primary text-white hover:bg-[#2d20b8]",
          )}
        >
          {isSelected ? (
            <>
              <Check size={14} strokeWidth={3} />
              Đang chọn
            </>
          ) : (
            "Chọn gói"
          )}
        </button>
      </div>
    </div>
  );
}
