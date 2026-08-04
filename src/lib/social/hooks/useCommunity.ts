"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  closeCommunityPost,
  createCommunityPost,
  deleteCommunityPost,
  getCommunityPost,
  likeCommunityPost,
  listCommunityPosts,
  listMyCommunityPosts,
  unlikeCommunityPost,
  updateCommunityPost,
} from "@/lib/social/api/community";
import { patchCommunityPostInCache, snapshotCommunityPost } from "@/lib/social/hooks/cache-helpers";
import type { CommunityPostFilters, UpdateCommunityPostRequest } from "@/lib/social/types";

/** Public feed. Keeps the previous page's cards on screen while a new filter/page loads. */
export function useCommunityPosts(filters: CommunityPostFilters) {
  return useQuery({
    queryKey: qk.communityPosts.list(filters),
    queryFn: () => listCommunityPosts(filters),
    placeholderData: keepPreviousData,
  });
}

export function useMyCommunityPosts(filters: CommunityPostFilters) {
  return useQuery({
    queryKey: qk.myCommunityPosts.list(filters),
    queryFn: () => listMyCommunityPosts(filters),
    placeholderData: keepPreviousData,
  });
}

/**
 * Post detail. `GET` increments the server-side `viewCount` on every call, so
 * this is intentionally configured to avoid refiring on focus/mount — reload
 * only via `refetch()` (e.g. an explicit retry button) or a real mutation.
 */
export function useCommunityPost(postId: string) {
  return useQuery({
    queryKey: qk.communityPost(postId),
    queryFn: () => getCommunityPost(postId),
    enabled: Boolean(postId),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 60_000,
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCommunityPost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.myCommunityPosts.all });
    },
  });
}

export function useUpdateCommunityPost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCommunityPostRequest) => updateCommunityPost(postId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.communityPost(postId), updated);
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.myCommunityPosts.all });
    },
  });
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deleteCommunityPost(postId),
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: qk.communityPost(postId) });
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.myCommunityPosts.all });
    },
  });
}

export function useCloseCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => closeCommunityPost(postId),
    onSuccess: (updated, postId) => {
      queryClient.setQueryData(qk.communityPost(postId), updated);
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.myCommunityPosts.all });
    },
  });
}

/**
 * Optimistic like/unlike. Rolls back every patched cache entry on failure,
 * and always reconciles with the server after settling — the counter must
 * never end up negative or double-counted from a rapid double click.
 */
export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nextLiked: boolean) =>
      nextLiked ? likeCommunityPost(postId) : unlikeCommunityPost(postId),
    onMutate: async (nextLiked) => {
      await queryClient.cancelQueries({ queryKey: qk.communityPost(postId) });
      const previous = snapshotCommunityPost(queryClient, postId);

      patchCommunityPostInCache(queryClient, postId, (post) => ({
        ...post,
        currentUserReacted: nextLiked,
        reactionCount: Math.max(0, post.reactionCount + (nextLiked ? 1 : -1)),
      }));

      return { previous };
    },
    onError: (_err, _nextLiked, context) => {
      if (context?.previous) {
        patchCommunityPostInCache(queryClient, postId, () => context.previous!);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.communityPost(postId) });
      void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
      void queryClient.invalidateQueries({ queryKey: qk.myCommunityPosts.all });
    },
  });
}
