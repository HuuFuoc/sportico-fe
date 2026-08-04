// ============================================================================
// Pure composer-permission logic for a chat room, kept separate from any
// component so it's trivially testable.
//
// Room state contract:
//   pending  — requester CAN send; receiver CANNOT (sees Accept/Reject instead).
//   active   — both sides can send.
//   rejected — read-only forever. No route back to an active room.
// ============================================================================

import type { ChatRoomResponse } from "@/lib/social/types";

export type ComposerPermission =
  | { canSend: true }
  | { canSend: false; reason: "rejected" | "pending_receiver" | "blocked" | "unknown" };

export function composerPermission(
  room: Pick<ChatRoomResponse, "status" | "requestedByUserId"> | null | undefined,
  currentUserId: string | null,
  isBlocked: boolean,
): ComposerPermission {
  if (!room) return { canSend: false, reason: "unknown" };
  if (isBlocked) return { canSend: false, reason: "blocked" };

  const status = (room.status ?? "").toLowerCase();
  if (status === "rejected") return { canSend: false, reason: "rejected" };
  if (status === "active") return { canSend: true };

  if (status === "pending") {
    const isRequester = room.requestedByUserId != null && room.requestedByUserId === currentUserId;
    return isRequester ? { canSend: true } : { canSend: false, reason: "pending_receiver" };
  }

  return { canSend: false, reason: "unknown" };
}

/** Only the RECEIVER of a pending request may accept/reject it. */
export function canRespondToRequest(
  room: Pick<ChatRoomResponse, "status" | "requestedByUserId"> | null | undefined,
  currentUserId: string | null,
): boolean {
  if (!room) return false;
  if ((room.status ?? "").toLowerCase() !== "pending") return false;
  return room.requestedByUserId != null && room.requestedByUserId !== currentUserId;
}
