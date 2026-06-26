"use client";

// ============================================================================
// PackageDetailModal — full learner-facing detail for a fixed-schedule package.
// Opened from CoachPackageCard's "Xem chi tiết". Renders the complete fixed
// schedule + every real package field, then a purchase-confirmation box gated
// by an acknowledgement checkbox. Purchase itself is delegated to the parent so
// the existing booking/PayOS flow is untouched.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelLabel, goalTypeLabel } from "@/lib/training-package-api";
import {
  formatVND,
  calculatePricePerSession,
  packageDurationDays,
  getMainLocation,
  getDeliveryMode,
  isPackageSoldOut,
  sortedSessions,
  calculateSessionDuration,
  formatDuration,
  formatDateVN,
  formatTimeVN,
  modeLabel,
  sportLabelVi,
  displayOr,
  NOT_SET,
  type SessionLike,
} from "@/lib/training-package-format";
import type { PublicCoachTrainingPackageResponse } from "@/lib/backend/dto";

type Pkg = PublicCoachTrainingPackageResponse;

// ── Overview row ─────────────────────────────────────────────────────────────

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-on-surface-variant">{label}</span>
      <span className="max-w-[60%] text-right text-[12.5px] font-semibold text-on-surface">
        {value}
      </span>
    </div>
  );
}

// ── Schedule timeline ────────────────────────────────────────────────────────

export function PackageScheduleTimeline({ pkg }: { pkg: Pkg }) {
  const sessions = sortedSessions(pkg);
  if (sessions.length === 0) {
    return (
      <p className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-4 text-[12.5px] text-on-surface-variant">
        {NOT_SET}
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {sessions.map((s) => (
        <ScheduleRow key={s.sessionNumber} s={s} />
      ))}
    </ul>
  );
}

function ScheduleRow({ s }: { s: SessionLike }) {
  const duration = formatDuration(
    calculateSessionDuration(s.startTime, s.endTime),
  );
  const full =
    (s.status ?? "").toLowerCase() === "full" ||
    (s.remainingParticipants != null && s.remainingParticipants <= 0);

  return (
    <li className="relative rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 pl-4">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-primary/40" />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
            {s.sessionNumber}
          </span>
          Buổi {s.sessionNumber}
        </span>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-on-surface-variant">
          {s.isOnline ? <Wifi size={12} /> : <MapPin size={12} />}
          {modeLabel(s.isOnline)}
        </span>
      </div>

      <p className="mt-1.5 text-[12.5px] font-medium tabular-nums text-on-surface">
        {formatDateVN(s.startTime)} · {formatTimeVN(s.startTime)} -{" "}
        {formatTimeVN(s.endTime)}
        <span className="ml-1.5 font-normal text-on-surface-variant">
          ({duration})
        </span>
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-on-surface-variant">
        {s.isOnline ? (
          s.meetingUrl ? (
            <a
              href={s.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 truncate text-primary hover:underline"
            >
              <Video size={11} />
              Link học trực tuyến
            </a>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Video size={11} />
              Link học sẽ được cung cấp
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {displayOr(s.location)}
          </span>
        )}
        {s.remainingParticipants != null && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
              full ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700",
            )}
          >
            {full ? "Hết chỗ" : `Còn ${s.remainingParticipants} chỗ`}
          </span>
        )}
      </div>

      {s.note?.trim() && (
        <p className="mt-1.5 text-[11.5px] italic text-on-surface-variant">
          Ghi chú: {s.note}
        </p>
      )}
    </li>
  );
}

// ── Purchase summary + confirmation gate ─────────────────────────────────────

export function PackagePurchaseSummary({
  pkg,
  isAuthed,
  alreadyActive,
  purchasing,
  purchaseError,
  loginHref,
  onConfirmPurchase,
}: {
  pkg: Pkg;
  isAuthed: boolean;
  alreadyActive: boolean;
  purchasing: boolean;
  purchaseError?: string | null;
  loginHref: string;
  onConfirmPurchase: () => void;
}) {
  const [acked, setAcked] = useState(false);
  const perSession = calculatePricePerSession(pkg.price, pkg.sessionCount);
  const mode = getDeliveryMode(pkg);
  const location = getMainLocation(pkg);
  const soldOut = isPackageSoldOut(pkg);

  return (
    <div className="rounded-[14px] border border-primary/20 bg-primary/[0.03] p-4">
      <p className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-on-surface">
        <Sparkles size={14} className="text-primary" />
        Bạn sắp đăng ký
      </p>

      <div className="divide-y divide-[var(--color-border-soft)] rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3">
        <OverviewRow label="Gói tập" value={displayOr(pkg.title)} />
        <OverviewRow label="Tổng tiền" value={formatVND(pkg.price)} />
        <OverviewRow label="Số buổi" value={`${pkg.sessionCount} buổi`} />
        {perSession != null && (
          <OverviewRow label="Giá mỗi buổi" value={formatVND(perSession)} />
        )}
        <OverviewRow
          label="Thời gian"
          value={`${formatDateVN(pkg.startDate)} - ${formatDateVN(pkg.endDate)}`}
        />
        <OverviewRow
          label="Hình thức"
          value={
            mode === "mixed"
              ? "Trực tiếp & trực tuyến"
              : mode === "online"
                ? "Trực tuyến"
                : "Trực tiếp"
          }
        />
        <OverviewRow
          label="Địa điểm"
          value={mode === "online" ? "Học từ xa" : location ?? NOT_SET}
        />
      </div>

      {alreadyActive ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 p-2.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-[12px] leading-snug text-emerald-700">
            Bạn đang sở hữu gói này. Hãy đặt từng buổi tập từ trang đặt lịch.
          </p>
        </div>
      ) : (
        <>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors",
                acked
                  ? "border-primary bg-primary text-white"
                  : "border-[var(--color-outline-variant)]",
              )}
            >
              {acked && <Check size={11} strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              className="sr-only"
            />
            <span className="text-[12.5px] leading-snug text-on-surface">
              Tôi đã xem lịch học, địa điểm và thông tin gói tập.
            </span>
          </label>

          {purchaseError && (
            <div className="mt-2.5 flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-2.5">
              <Info size={14} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-[12px] leading-snug text-red-700">
                {purchaseError}
              </p>
            </div>
          )}

          {soldOut ? (
            <button
              type="button"
              disabled
              className="mt-3 flex w-full cursor-not-allowed items-center justify-center rounded-[12px] bg-on-surface/8 px-4 py-3 text-[14px] font-bold text-on-surface-variant/50"
            >
              Gói đã hết chỗ
            </button>
          ) : !isAuthed ? (
            <Link
              href={loginHref}
              className="mt-3 flex w-full items-center justify-center rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5"
            >
              Đăng nhập để mua gói
            </Link>
          ) : (
            <button
              type="button"
              disabled={!acked || purchasing}
              onClick={onConfirmPurchase}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {purchasing && <Loader2 size={15} className="animate-spin" />}
              {purchasing ? "Đang xử lý…" : "Xác nhận mua"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-on-surface">
        <Icon size={15} className="text-on-surface-variant" />
        {title}
      </h3>
      {children}
    </section>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function PackageDetailModal({
  pkg,
  coachName,
  onClose,
  isAuthed,
  alreadyActive,
  purchasing,
  purchaseError,
  loginHref,
  onConfirmPurchase,
}: {
  pkg: Pkg;
  coachName: string;
  onClose: () => void;
  isAuthed: boolean;
  alreadyActive: boolean;
  purchasing: boolean;
  purchaseError?: string | null;
  loginHref: string;
  onConfirmPurchase: () => void;
}) {
  const perSession = calculatePricePerSession(pkg.price, pkg.sessionCount);
  const duration = packageDurationDays(pkg);
  const mode = getDeliveryMode(pkg);
  const location = getMainLocation(pkg);

  const modeText =
    mode === "mixed"
      ? "Trực tiếp & trực tuyến"
      : mode === "online"
        ? "Trực tuyến"
        : "Trực tiếp";

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
        className="relative flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_24px_70px_-16px_rgba(15,15,30,0.4)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-bold text-on-surface">
              {displayOr(pkg.title)}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-on-surface-variant">
              {sportLabelVi(pkg.sportName)} · {coachName}
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
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* 1. Tổng quan */}
          <Section title="Tổng quan gói tập" icon={Info}>
            <div className="grid grid-cols-1 gap-x-4 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 px-3.5 py-1 sm:grid-cols-2">
              <OverviewRow label="Tổng giá" value={formatVND(pkg.price)} />
              <OverviewRow
                label="Giá mỗi buổi"
                value={perSession != null ? formatVND(perSession) : NOT_SET}
              />
              <OverviewRow label="Tổng số buổi" value={`${pkg.sessionCount} buổi`} />
              <OverviewRow
                label="Thời lượng"
                value={duration != null ? `${duration} ngày` : NOT_SET}
              />
              <OverviewRow
                label="Bắt đầu"
                value={formatDateVN(pkg.startDate)}
              />
              <OverviewRow label="Kết thúc" value={formatDateVN(pkg.endDate)} />
              <OverviewRow label="Hình thức" value={modeText} />
              <OverviewRow
                label="Địa điểm"
                value={mode === "online" ? "Học từ xa" : location ?? NOT_SET}
              />
              <OverviewRow
                label="Trình độ"
                value={displayOr(levelLabel(pkg.level), "Không chỉ định")}
              />
              <OverviewRow
                label="Mục tiêu"
                value={displayOr(goalTypeLabel(pkg.goalType), "Không chỉ định")}
              />
            </div>
          </Section>

          {/* 2. Lịch học cố định */}
          <Section title={`Lịch học cố định (${pkg.sessionCount} buổi)`} icon={CalendarClock}>
            <PackageScheduleTimeline pkg={pkg} />
          </Section>

          {/* 3. Phù hợp với ai */}
          <Section title="Gói này phù hợp với ai" icon={ShieldCheck}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Fact label="Trình độ phù hợp" value={displayOr(levelLabel(pkg.level))} />
              <Fact label="Mục tiêu luyện tập" value={displayOr(goalTypeLabel(pkg.goalType))} />
              <Fact label="Hình thức" value={modeText} />
            </div>
          </Section>

          {/* 4. Học viên sẽ nhận được gì — từ mô tả thật, không bịa */}
          <Section title="Học viên sẽ nhận được gì" icon={Sparkles}>
            {pkg.description?.trim() ? (
              <p className="whitespace-pre-line rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-4 text-[13px] leading-relaxed text-on-surface-variant">
                {pkg.description}
              </p>
            ) : (
              <p className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-4 text-[12.5px] text-on-surface-variant">
                Huấn luyện viên chưa cập nhật mô tả chi tiết cho gói này.
              </p>
            )}
          </Section>

          {/* 5. Lưu ý trước khi mua */}
          <div className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 p-3.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-[12.5px] leading-relaxed text-amber-800">
              <p className="font-semibold">
                Đây là gói tập theo lịch cố định.
              </p>
              <p className="mt-0.5">
                Bạn sẽ học theo đúng các buổi đã được huấn luyện viên thiết lập ở
                trên. Vui lòng kiểm tra kỹ ngày giờ, địa điểm và hình thức trước
                khi thanh toán. Việc vắng mặt hoặc đổi lịch áp dụng theo chính
                sách của huấn luyện viên.
              </p>
            </div>
          </div>

          {/* 6. Xác nhận mua */}
          <PackagePurchaseSummary
            pkg={pkg}
            isAuthed={isAuthed}
            alreadyActive={alreadyActive}
            purchasing={purchasing}
            purchaseError={purchaseError}
            loginHref={loginHref}
            onConfirmPurchase={onConfirmPurchase}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant/70">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}
