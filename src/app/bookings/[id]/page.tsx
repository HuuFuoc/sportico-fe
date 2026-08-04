"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Gift,
  XmarkCircle,
} from "iconoir-react";
import { LearnerGuard } from "@/components/auth/LearnerGuard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { useBooking } from "@/lib/social/hooks/useCheckout";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateTimeVn } from "@/lib/social/datetime";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ thanh toán", className: "bg-amber-100 text-amber-700" },
  active: { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Đã hoàn thành", className: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Đã huỷ", className: "bg-rose-100 text-rose-700" },
  expired: { label: "Đã hết hạn", className: "bg-slate-100 text-slate-500" },
};

export default function BookingDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <LearnerGuard>
      <BookingDetailClient bookingId={id} />
    </LearnerGuard>
  );
}

function BookingDetailClient({ bookingId }: { bookingId: string }) {
  const { data: booking, isLoading, isError, refetch } = useBooking(bookingId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <LoadingState label="Đang tải đơn đăng ký…" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Không tải được đơn đăng ký"
          message="Đơn đăng ký không tồn tại hoặc bạn không có quyền xem."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const status = (booking.status ?? "").toLowerCase();
  const statusMeta = STATUS_LABEL[status] ?? {
    label: booking.status ?? "—",
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/learner/bookings"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft width={16} height={16} />
        Danh sách đơn đăng ký
      </Link>

      <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[17px] font-bold text-on-surface">
              {booking.trainingPackageTitle ?? "Gói tập"}
            </p>
            <p className="mt-1 text-[12px] text-on-surface-variant">
              Mã đơn: <span className="font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
          <span
            className={`shrink-0 rounded-[8px] px-2.5 py-1 text-[12px] font-semibold ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-border-soft)] pt-4 sm:grid-cols-4">
          <Stat label="Tổng buổi" value={String(booking.totalSessions)} />
          <Stat label="Đã hoàn thành" value={String(booking.completedSessions)} />
          <Stat label="Đã dùng" value={String(booking.usedSessions)} />
          <Stat label="Còn lại" value={String(booking.remainingSessions)} />
        </div>

        <div className="mt-5 space-y-2 border-t border-[var(--color-border-soft)] pt-4 text-[13px]">
          <div className="flex justify-between text-on-surface-variant">
            <span>Giá gốc</span>
            <span className="tabular-nums">{formatCurrencyVnd(booking.originalAmount)}</span>
          </div>
          {booking.discountAmount > 0 && (
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1.5">
                <Gift width={13} height={13} />
                Giảm giá {booking.voucherCode ? `(${booking.voucherCode})` : ""}
              </span>
              <span className="tabular-nums">−{formatCurrencyVnd(booking.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--color-border-soft)] pt-2 text-[15px] font-bold text-on-surface">
            <span>Đã thanh toán</span>
            <span className="tabular-nums">{formatCurrencyVnd(booking.totalAmount)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-[var(--color-border-soft)] pt-4 text-[12.5px] text-on-surface-variant">
          {booking.paidAt && (
            <div className="flex items-center gap-2">
              <CheckCircle width={14} height={14} className="text-emerald-600" />
              Thanh toán lúc {formatDateTimeVn(booking.paidAt)}
            </div>
          )}
          {booking.expiresAt && status === "pending" && (
            <div className="flex items-center gap-2">
              <Clock width={14} height={14} className="text-amber-600" />
              Hết hạn thanh toán lúc {formatDateTimeVn(booking.expiresAt)}
            </div>
          )}
          {booking.cancelledAt && (
            <div className="flex items-center gap-2">
              <XmarkCircle width={14} height={14} className="text-rose-600" />
              Đã huỷ lúc {formatDateTimeVn(booking.cancelledAt)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar width={14} height={14} />
            Tạo lúc {formatDateTimeVn(booking.createdAt)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href="/learner/schedule"
          className="rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2.5 text-[13px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
        >
          Xem lịch tập
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[18px] font-bold tabular-nums text-on-surface">{value}</p>
      <p className="text-[11.5px] text-on-surface-variant">{label}</p>
    </div>
  );
}
