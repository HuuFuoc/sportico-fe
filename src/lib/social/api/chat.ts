// ============================================================================
// Chat API — rooms and messages.
//
// A `ChatRoomResponse` carries no display data (no `otherUser`, `lastMessage`,
// `unreadCount`) — only `otherUserId`. Every caller must resolve that id
// through `usePublicUser` / `GET /api/users/{id}`, never invent the fields.
//
// New code always sends `targetUserId`, never `coachId` (legacy).
// ============================================================================

import { callData, callPage, postJson, putJson, buildQuery } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  ChatMessageResponse,
  ChatRoomResponse,
  ChatSourceType,
  CreateChatRoomRequest,
  PagedResult,
  SendMessageRequest,
} from "@/lib/social/types";

/** GET /api/chat/rooms — every room the current user belongs to, any status. */
export function listChatRooms(): Promise<ChatRoomResponse[]> {
  return callData<ChatRoomResponse[]>(ep.chatRooms);
}

/**
 * POST /api/chat/rooms — idempotent: calling it again for the same
 * `targetUserId` returns the existing room instead of creating a duplicate.
 */
export function createOrGetChatRoom(
  targetUserId: string,
  source?: { sourceType: ChatSourceType; sourceId: string },
): Promise<ChatRoomResponse> {
  const payload: CreateChatRoomRequest = {
    targetUserId,
    sourceType: source?.sourceType ?? null,
    sourceId: source?.sourceId ?? null,
  };
  return callData<ChatRoomResponse>(ep.chatRooms, postJson(payload));
}

/** Only the RECEIVER of a pending request may accept it. */
export function acceptChatRoom(roomId: string): Promise<ChatRoomResponse> {
  return callData<ChatRoomResponse>(ep.chatRoomAccept(roomId), putJson());
}

export function rejectChatRoom(roomId: string): Promise<ChatRoomResponse> {
  return callData<ChatRoomResponse>(ep.chatRoomReject(roomId), putJson());
}

/**
 * GET /api/chat/rooms/{roomId}/messages.
 *
 * Backend sorts `sentAt DESC` (newest first) — callers must reverse `items`
 * before rendering a top-to-bottom thread. Only page 1 is worth polling; older
 * pages are static history.
 */
export function listChatMessages(
  roomId: string,
  pageNumber: number,
  pageSize = 30,
): Promise<PagedResult<ChatMessageResponse>> {
  return callPage<ChatMessageResponse>(
    ep.chatRoomMessages(roomId) + buildQuery({ PageNumber: pageNumber, PageSize: pageSize }),
  );
}

export function sendChatMessage(
  roomId: string,
  payload: SendMessageRequest,
): Promise<ChatMessageResponse> {
  return callData<ChatMessageResponse>(ep.chatRoomMessages(roomId), postJson(payload));
}
