"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BellOff, Check } from "lucide-react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatRelativeTimeVi } from "@/lib/utils";
import type { NotificationItem } from "@/types";

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  loading: boolean;
  error: Error | null;
  unreadCount: number;
  /** "See all" destination — role-aware from the caller. */
  seeAllHref: string;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRetry: () => void;
  /** Called after navigating/acting so the parent can close the popover. */
  onClose: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Facebook/Messenger-style notification popover. Purely presentational — all
 * data + mutations are passed in from `useNotifications` via the nav button.
 */
export function NotificationDropdown({
  notifications,
  loading,
  error,
  unreadCount,
  seeAllHref,
  onMarkRead,
  onMarkAllRead,
  onRetry,
  onClose,
}: NotificationDropdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE }}
      role="menu"
      aria-label="Thông báo"
      className={cn(
        "fixed left-3 right-3 top-[76px] z-[60] overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest",
        "shadow-[0_16px_48px_-16px_rgba(15,15,30,0.28),0_4px_12px_rgba(15,15,30,0.08)]",
        "md:absolute md:inset-auto md:left-auto md:right-0 md:top-[calc(100%+12px)] md:w-[400px]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-semibold tracking-tight text-on-surface">
            Thông báo
          </p>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
              {unreadCount} mới
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-1 text-[12.5px] font-medium text-primary transition-colors hover:underline disabled:cursor-default disabled:text-on-surface-variant/50 disabled:no-underline"
        >
          <Check size={13} />
          Đánh dấu đã đọc
        </button>
      </div>

      {/* List */}
      <div className="max-h-[min(70vh,440px)] overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 px-2 py-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-container-low" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-surface-container-low" />
                  <div className="h-3 w-full animate-pulse rounded bg-surface-container-low" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-[13px] text-on-surface-variant">
              Không tải được thông báo.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-4 py-1.5 text-[12.5px] font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Thử lại
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onSelect={() => {
                if (!n.read) onMarkRead(n.id);
                onClose();
              }}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border-soft)] p-1.5">
        <Link
          href={seeAllHref}
          onClick={onClose}
          className="block rounded-[10px] px-4 py-2.5 text-center text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.06]"
        >
          Xem tất cả
        </Link>
      </div>
    </motion.div>
  );
}

function NotificationRow({
  notification: n,
  onSelect,
}: {
  notification: NotificationItem;
  onSelect: () => void;
}) {
  const body = (
    <>
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            n.read
              ? "bg-surface-container-high text-on-surface-variant"
              : "bg-primary/10 text-primary",
          )}
        >
          <MaterialIcon name={n.icon ?? "notifications"} size={18} />
        </div>
        {!n.read && (
          <span className="absolute -right-0 -top-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13.5px] leading-snug",
            n.read ? "font-medium text-on-surface" : "font-semibold text-on-surface",
          )}
        >
          {n.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-on-surface-variant">
          {n.body}
        </p>
        <p className="mt-1 text-[11px] tabular-nums text-on-surface-variant/80">
          {formatRelativeTimeVi(n.createdAt)}
        </p>
      </div>
    </>
  );

  const className = cn(
    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low",
    !n.read && "bg-primary/[0.035]",
  );

  return n.href ? (
    <Link href={n.href} onClick={onSelect} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onSelect} className={className}>
      {body}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
        <BellOff size={20} className="text-on-surface-variant" />
      </div>
      <p className="text-[13.5px] font-medium text-on-surface">
        Chưa có thông báo mới
      </p>
      <p className="mt-1 text-[12.5px] text-on-surface-variant">
        Chúng tôi sẽ báo cho bạn khi có cập nhật.
      </p>
    </div>
  );
}
