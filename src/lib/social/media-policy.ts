// ============================================================================
// The single place that decides what `media` value goes on an UpdateCommunityPostRequest.
//
// Backend contract (get this wrong and a user's gallery gets wiped):
//   omit the field / send null → KEEP existing media untouched
//   send []                    → DELETE all media
//   send [a, b, c]              → REPLACE the whole set
//
// A naive form always has SOME array in state (even if it starts as `[]`
// because the post had no media), so "did the user touch media" must be
// tracked explicitly — it can never be inferred from the array's contents.
// ============================================================================

import type { CommunityPostMediaRequest } from "@/lib/social/types";

/**
 * @param touched Whether the user actually interacted with the media picker
 *   (added, removed, or reordered an item) during this edit session.
 * @param current The media list currently shown in the editor.
 */
export function mediaFieldForUpdate(
  touched: boolean,
  current: CommunityPostMediaRequest[],
): CommunityPostMediaRequest[] | undefined {
  if (!touched) return undefined; // omit the field entirely — keep as-is
  return current; // `[]` deletes everything; a populated array replaces it
}
