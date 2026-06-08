"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/hooks/useApiResource";

interface TopBarProps {
  role: AppRole;
  title?: string;
  searchPlaceholder?: string;
}

function useCurrentUser(): { name: string; avatarUrl: string | null } | null {
  const authUser = useAuthStore((s) => s.user);
  const id = useAppStore((s) => s.currentUserId);
  const { data: mockUser } = useApiResource(
    () => (isMockMode() ? api.fetchUser(id) : Promise.resolve(null)),
    [id],
  );

  if (authUser) {
    return {
      name: authUser.fullName ?? "Người dùng",
      avatarUrl: authUser.avatarUrl ?? null,
    };
  }
  if (mockUser) {
    return { name: mockUser.name, avatarUrl: mockUser.avatarUrl ?? null };
  }
  return null;
}

export function TopBar({ role, title, searchPlaceholder }: TopBarProps) {
  const [showNotifs, setShowNotifs] = useState(false);
  const toggleMobileSidebar = useAppStore((s) => s.toggleMobileSidebar);
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = isMockMode() || Boolean(authUser);

  const { data: unreadCountData, refetch: refetchUnreadCount } = useApiResource(
    () => isAuthenticated ? api.fetchUnreadNotificationCount() : Promise.resolve(0),
    [isAuthenticated],
  );
  const unreadCount = unreadCountData ?? 0;

  const { data: notificationsData } = useApiResource(
    () => api.fetchNotifications(),
    [],
  );

  // Optimistic read state — the fetched list is read-only, so we overlay locally
  // marked ids and roll back on failure rather than refetching (avoids flicker).
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const notifications = useMemo(
    () =>
      (notificationsData ?? []).map((n) => ({
        ...n,
        read: n.read || localRead.has(n.id),
      })),
    [notificationsData, localRead],
  );
  const localUnreadCount = notifications.filter((n) => !n.read).length;
  const user = useCurrentUser();

  const markRead = (id: string) => {
    setLocalRead((prev) => new Set(prev).add(id));
    void api.markNotificationRead(id)
      .then(() => refetchUnreadCount())
      .catch(() => {
        setLocalRead((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  };

  const markAllRead = () => {
    const prev = localRead;
    setLocalRead(new Set((notificationsData ?? []).map((n) => n.id)));
    void api.markAllNotificationsRead()
      .then(() => refetchUnreadCount())
      .catch(() => setLocalRead(prev));
  };

  const placeholder =
    searchPlaceholder ??
    (role === "coach"
      ? "Tìm học viên hoặc buổi tập..."
      : role === "admin"
        ? "Tìm phân tích hoặc người dùng..."
        : "Tìm buổi tập hoặc HLV...");

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface-container-lowest border-b border-[var(--color-border-soft)] flex items-center justify-between px-4 sm:px-6 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden -ml-1 p-2 rounded hover:bg-surface-container-low"
          aria-label="Mở/đóng điều hướng"
        >
          <MaterialIcon name="menu" size={20} />
        </button>
        {title && (
          <h1 className="text-h3 text-on-surface truncate lg:hidden">
            {title}
          </h1>
        )}
        <div className="hidden sm:flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-9 max-w-md flex-1">
          <MaterialIcon
            name="search"
            size={18}
            className="text-on-surface-variant"
          />
          <input
            type="search"
            name="global-search"
            aria-label={placeholder}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-body-sm w-full ml-2 placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {role === "coach" && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-medium uppercase tracking-wider rounded">
            <MaterialIcon name="bolt" size={14} filled />
            Coach Mode
          </span>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2 rounded hover:bg-surface-container-low transition-colors"
            aria-label="Thông báo"
          >
            <MaterialIcon
              name="notifications"
              size={20}
              className="text-on-surface-variant"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-error text-white text-[9px] font-bold leading-none px-1 ring-2 ring-surface-container-lowest tabular-nums">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifs(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] shadow-sm z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
                  <p className="text-h3 text-on-surface">Thông báo</p>
                  <button
                    onClick={markAllRead}
                    disabled={localUnreadCount === 0}
                    className="text-body-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-default"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                      <MaterialIcon name="notifications" size={28} className="opacity-30 mb-2" />
                      <p className="text-body-sm">Chưa có thông báo</p>
                    </div>
                  ) : notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href ?? "#"}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        setShowNotifs(false);
                      }}
                      className={cn(
                        "flex gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-[var(--color-border-soft)] last:border-b-0",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <div className="w-8 h-8 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
                        <MaterialIcon
                          name={n.icon ?? "info"}
                          size={16}
                          className="text-primary"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-base text-on-surface font-medium truncate">
                          {n.title}
                        </p>
                        <p className="text-body-sm text-on-surface-variant line-clamp-2">
                          {n.body}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          className="p-2 rounded hover:bg-surface-container-low transition-colors hidden sm:block"
          aria-label="Trợ giúp"
        >
          <MaterialIcon
            name="help"
            size={20}
            className="text-on-surface-variant"
          />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l sm:border-[var(--color-border-soft)]">
          <div className="hidden sm:block text-right leading-tight">
            <p className="text-body-sm font-medium text-on-surface">
              {user?.name ?? "Khách"}
            </p>
            <p className="text-[11px] text-on-surface-variant capitalize">
              {role}
            </p>
          </div>
          <img
            src={user?.avatarUrl ?? "https://i.pravatar.cc/64?u=guest"}
            alt={user?.name ?? "User"}
            className="w-9 h-9 rounded-full object-cover border border-[var(--color-border-soft)]"
          />
        </div>
      </div>
    </header>
  );
}
