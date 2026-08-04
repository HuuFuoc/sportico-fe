"use client";

// ============================================================================
// Chat hooks: rooms list, messages (polling + pagination), send, accept/reject.
//
// Polling cadence per the brief: rooms 15–30s, the open room's latest page
// 5–10s, paused automatically while the tab is hidden (TanStack's
// `refetchIntervalInBackground` defaults to false, which is exactly this).
// Only page 1 is polled — the backend sorts `sentAt DESC` so page 1 is always
// "whatever is newest right now"; older pages are static history fetched once.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  acceptChatRoom,
  createOrGetChatRoom,
  listChatMessages,
  listChatRooms,
  rejectChatRoom,
  sendChatMessage,
} from "@/lib/social/api/chat";
import type { ChatSourceType, SendMessageRequest } from "@/lib/social/types";

const ROOMS_POLL_MS = 20_000;
const MESSAGES_POLL_MS = 7_000;

export function useChatRooms() {
  return useQuery({
    queryKey: qk.chatRooms,
    queryFn: listChatRooms,
    refetchInterval: ROOMS_POLL_MS,
    // Default `refetchIntervalInBackground: false` already pauses this while
    // the tab is hidden — left implicit rather than restated.
  });
}

export function useCreateOrGetChatRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, source }: { targetUserId: string; source?: { sourceType: ChatSourceType; sourceId: string } }) =>
      createOrGetChatRoom(targetUserId, source),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.chatRooms }),
  });
}

export function useAcceptChatRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => acceptChatRoom(roomId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.chatRooms }),
  });
}

export function useRejectChatRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => rejectChatRoom(roomId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.chatRooms }),
  });
}

/** The latest page of a room's messages — the only page that polls. */
export function useLatestChatMessages(roomId: string | null) {
  return useQuery({
    queryKey: qk.chatMessages.page(roomId ?? "", 1),
    queryFn: () => listChatMessages(roomId as string, 1),
    enabled: Boolean(roomId),
    refetchInterval: MESSAGES_POLL_MS,
  });
}

/** Older pages — fetched on demand ("load more"), never polled. */
export function useOlderChatMessages(roomId: string | null, pageNumber: number) {
  return useQuery({
    queryKey: qk.chatMessages.page(roomId ?? "", pageNumber),
    queryFn: () => listChatMessages(roomId as string, pageNumber),
    enabled: Boolean(roomId) && pageNumber > 1,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function useSendChatMessage(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessageRequest) => sendChatMessage(roomId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.chatMessages.page(roomId, 1) });
      void queryClient.invalidateQueries({ queryKey: qk.chatRooms });
    },
  });
}
