"use client";

import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { NotificationItem } from "@/types";

export interface UseNotificationsResult {
  /** Notifications with the local optimistic read-overlay applied. */
  notifications: NotificationItem[];
  /** Unread count — server badge value, or the locally-derived count as a fallback. */
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  /** Re-fetch the notification list (e.g. from an error-state retry button). */
  refetch: () => void;
  /** Optimistically mark one notification read, then persist to the backend. */
  markRead: (id: string) => void;
  /** Optimistically mark every notification read, then persist to the backend. */
  markAllRead: () => void;
}

/**
 * Shared notifications state for any surface that shows the bell (navbar dropdown,
 * in-app TopBar). Owns the list, the unread badge count, and optimistic read
 * state — the fetched list is read-only, so locally-marked ids are overlaid and
 * rolled back on failure rather than refetched (avoids flicker).
 *
 * All data flows through `api.*`, so it swaps to the real backend automatically.
 *
 * @param enabled Skip network work when the viewer isn't signed in.
 */
export function useNotifications(enabled: boolean = true): UseNotificationsResult {
  const active = enabled;

  const { data: unreadCountData, refetch: refetchUnreadCount } = useApiResource(
    () => (active ? api.fetchUnreadNotificationCount() : Promise.resolve(0)),
    [active],
  );

  const {
    data: notificationsData,
    loading,
    error,
    refetch: refetchList,
  } = useApiResource(
    () => (active ? api.fetchNotifications() : Promise.resolve([])),
    [active],
  );

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
  // Prefer the server badge count; fall back to the derived count (mock mode
  // returns 0 from the count endpoint but still ships an unread list).
  const serverUnread = unreadCountData ?? 0;
  const unreadCount = isMockMode() ? localUnreadCount : serverUnread || localUnreadCount;

  const markRead = useCallback((id: string) => {
    setLocalRead((prev) => new Set(prev).add(id));
    void api
      .markNotificationRead(id)
      .then(() => refetchUnreadCount())
      .catch(() => {
        setLocalRead((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  }, [refetchUnreadCount]);

  const markAllRead = useCallback(() => {
    setLocalRead((prev) => {
      const rollback = prev;
      void api
        .markAllNotificationsRead()
        .then(() => refetchUnreadCount())
        .catch(() => setLocalRead(rollback));
      return new Set((notificationsData ?? []).map((n) => n.id));
    });
  }, [notificationsData, refetchUnreadCount]);

  const refetch = useCallback(() => {
    refetchList();
    refetchUnreadCount();
  }, [refetchList, refetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markRead,
    markAllRead,
  };
}
