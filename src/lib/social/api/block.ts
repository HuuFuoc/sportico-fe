// ============================================================================
// User block API.
//
// Block only affects chat room creation and message sending — it does not hide
// community content server-side. `listBlockedUsers()` is the only place a
// client-side feed filter can source its blocklist from.
// ============================================================================

import { callData, callVoid, putJson, del } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type { BlockedUserResponse, BlockUserRequest } from "@/lib/social/types";

export const BLOCK_REASON_MAX_LENGTH = 500;

export function listBlockedUsers(): Promise<BlockedUserResponse[]> {
  return callData<BlockedUserResponse[]>(ep.myBlockedUsers);
}

export function blockUser(userId: string, payload: BlockUserRequest = {}): Promise<void> {
  return callVoid(ep.blockUser(userId), putJson(payload));
}

export function unblockUser(userId: string): Promise<void> {
  return callVoid(ep.blockUser(userId), del());
}
