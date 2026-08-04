// ============================================================================
// Small cache-patching helpers shared by the community mutations.
//
// A community post can be visible simultaneously in the feed, "my posts", and
// its own detail query — each under a different key. An optimistic like/unlike
// has to reach all of them or the counter looks wrong on whichever surface the
// user didn't click from.
// ============================================================================

import type { QueryClient } from "@tanstack/react-query";
import type { CommunityPostResponse, PagedResult } from "@/lib/social/types";

const LIST_KEY_PREFIXES = new Set(["community-posts", "my-community-posts"]);

/** Apply `patch` to every cached copy of `postId` (detail + any list page). */
export function patchCommunityPostInCache(
  queryClient: QueryClient,
  postId: string,
  patch: (post: CommunityPostResponse) => CommunityPostResponse,
): void {
  queryClient.setQueryData<CommunityPostResponse>(["community-post", postId], (old) =>
    old ? patch(old) : old,
  );

  queryClient.setQueriesData<PagedResult<CommunityPostResponse>>(
    { predicate: (q) => LIST_KEY_PREFIXES.has(String(q.queryKey[0])) },
    (old) => {
      if (!old) return old;
      let changed = false;
      const items = old.items.map((item) => {
        if (item.id !== postId) return item;
        changed = true;
        return patch(item);
      });
      return changed ? { ...old, items } : old;
    },
  );
}

/** Snapshot every cached copy of `postId`, for rollback on a failed mutation. */
export function snapshotCommunityPost(
  queryClient: QueryClient,
  postId: string,
): CommunityPostResponse | undefined {
  return queryClient.getQueryData<CommunityPostResponse>(["community-post", postId]);
}
