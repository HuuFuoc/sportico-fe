"use client";

import { useMemo } from "react";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { MessageThread } from "@/types";

/** A conversation shaped for a preview list (navbar dropdown). Mirrors the
 *  future API contract so swapping in a real endpoint is a drop-in change. */
export interface ConversationPreview {
  id: string;
  participantName: string;
  participantAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  /** True for the built-in Sportico AI thread (rendered with a gradient avatar). */
  isAI: boolean;
}

export interface UseRecentConversationsResult {
  conversations: ConversationPreview[];
  /** Sum of unread counts across all conversations — drives the badge. */
  totalUnread: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Display name for the other participant. Mirrors MessagesView's resolution so
 *  the navbar preview and the full page agree on names. */
function participantName(thread: MessageThread, userId: string): string {
  if (thread.isAI) return "Sportico AI";
  if (thread.otherName) return thread.otherName;
  const otherId = thread.participantIds.find((id) => id !== userId) ?? "";
  return otherId ? `Người dùng ${otherId.slice(0, 4).toUpperCase()}` : "Người dùng";
}

/**
 * Recent conversations for the navbar message dropdown. Wraps `api.fetchThreads`
 * (never a parallel data path), sorts newest-first, and reshapes the domain
 * `MessageThread` into a lean `ConversationPreview`.
 *
 * @param userId The signed-in user's id (resolves the "other" participant).
 * @param enabled Skip the fetch when the viewer isn't signed in.
 */
export function useRecentConversations(
  userId: string,
  enabled: boolean = true,
): UseRecentConversationsResult {
  const active = enabled && Boolean(userId);

  const { data, loading, error, refetch } = useApiResource(
    () => (active ? api.fetchThreads(userId) : Promise.resolve([])),
    [userId, active],
  );

  const conversations = useMemo<ConversationPreview[]>(() => {
    const threads = data ?? [];
    return [...threads]
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      )
      .map((t) => ({
        id: t.id,
        participantName: participantName(t, userId),
        participantAvatarUrl: t.isAI ? null : t.otherAvatarUrl ?? null,
        lastMessage: t.lastMessagePreview ?? "",
        lastMessageAt: t.lastMessageAt,
        unreadCount: t.unreadCount ?? 0,
        isAI: Boolean(t.isAI),
      }));
  }, [data, userId]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  return { conversations, totalUnread, loading, error, refetch };
}
