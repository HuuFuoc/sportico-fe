"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  deleteAdminComment,
  deleteAdminCommunityPost,
  getAdminCommunityPost,
  hideAdminComment,
  hideAdminCommunityPost,
  listAdminCommunityPosts,
  listAdminPostComments,
  restoreAdminComment,
  restoreAdminCommunityPost,
} from "@/lib/social/api/admin-community";
import type { AdminCommunityPostFilters, HideContentRequest } from "@/lib/social/types";

export function useAdminCommunityPosts(filters: AdminCommunityPostFilters) {
  return useQuery({
    queryKey: qk.adminCommunityPosts.list(filters),
    queryFn: () => listAdminCommunityPosts(filters),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCommunityPost(postId: string) {
  return useQuery({
    queryKey: qk.adminCommunityPost(postId),
    queryFn: () => getAdminCommunityPost(postId),
    enabled: Boolean(postId),
  });
}

function invalidatePostSurfaces(queryClient: ReturnType<typeof useQueryClient>, postId: string) {
  void queryClient.invalidateQueries({ queryKey: qk.adminCommunityPost(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.adminCommunityPosts.all });
  // The post is also visible on the public feed/detail — keep those honest too.
  void queryClient.invalidateQueries({ queryKey: qk.communityPost(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
}

export function useHideAdminPost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HideContentRequest) => hideAdminCommunityPost(postId, payload),
    onSuccess: () => invalidatePostSurfaces(queryClient, postId),
  });
}

export function useRestoreAdminPost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreAdminCommunityPost(postId),
    onSuccess: () => invalidatePostSurfaces(queryClient, postId),
  });
}

export function useDeleteAdminPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deleteAdminCommunityPost(postId),
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: qk.adminCommunityPost(postId) });
      invalidatePostSurfaces(queryClient, postId);
    },
  });
}

export function useAdminPostComments(postId: string, pageNumber: number) {
  return useQuery({
    queryKey: qk.adminCommunityComments.page(postId, pageNumber),
    queryFn: () => listAdminPostComments(postId, pageNumber),
    enabled: Boolean(postId),
    placeholderData: keepPreviousData,
  });
}

function invalidateCommentSurfaces(queryClient: ReturnType<typeof useQueryClient>, postId: string) {
  void queryClient.invalidateQueries({ queryKey: qk.adminCommunityComments.all(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.communityComments.all(postId) });
  // Admin delete does NOT decrement post.commentCount server-side — refresh
  // the post itself but never locally decrement the counter.
  void queryClient.invalidateQueries({ queryKey: qk.adminCommunityPost(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.communityPost(postId) });
}

export function useHideAdminComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, payload }: { commentId: string; payload: HideContentRequest }) =>
      hideAdminComment(commentId, payload),
    onSuccess: () => invalidateCommentSurfaces(queryClient, postId),
  });
}

export function useRestoreAdminComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => restoreAdminComment(commentId),
    onSuccess: () => invalidateCommentSurfaces(queryClient, postId),
  });
}

export function useDeleteAdminComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteAdminComment(commentId),
    onSuccess: () => invalidateCommentSurfaces(queryClient, postId),
  });
}
