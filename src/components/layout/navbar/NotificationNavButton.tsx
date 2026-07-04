"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { UnreadBadge } from "./UnreadBadge";
import { NotificationDropdown } from "./NotificationDropdown";

interface NotificationNavButtonProps {
  /** True while the navbar overlays a dark hero (white icon). */
  transparent?: boolean;
  /** "See all" destination — role-aware from the navbar. */
  seeAllHref: string;
}

/**
 * Navbar bell: unread badge + click-to-open notification popover.
 * Self-contained — owns its open state and pulls data from `useNotifications`.
 */
export function NotificationNavButton({
  transparent = false,
  seeAllHref,
}: NotificationNavButtonProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markRead,
    markAllRead,
  } = useNotifications(true);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          transparent
            ? "text-white hover:bg-white/10"
            : "bg-surface-container-low text-on-surface hover:bg-surface-container",
          open && !transparent && "bg-surface-container",
          open && transparent && "bg-white/10",
        )}
      >
        <Bell size={20} />
        <UnreadBadge
          count={unreadCount}
          ringClassName={transparent ? "ring-transparent" : "ring-surface-container-lowest"}
        />
      </button>

      {/* Click-catcher backdrop (no animation needed) */}
      {open && (
        <div
          className="fixed inset-0 z-[55]"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <AnimatePresence>
        {open && (
          <NotificationDropdown
            key="notification-dropdown"
            notifications={notifications}
            loading={loading}
            error={error}
            unreadCount={unreadCount}
            seeAllHref={seeAllHref}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onRetry={refetch}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
