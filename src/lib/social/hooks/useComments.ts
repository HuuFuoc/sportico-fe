"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  createComment,
  createReply,
  deleteComment,
  listComments,
  updateComment,
} from "@/lib/social/api/comments";
import type { CreateCommentRequest, CreateReplyRequest, UpdateCommentRequest } from "@/lib/social/types";

export const COMMENT_MAX_LENGTH = 2000;

export function useComments(postId: string, pageNumber: number) {
  return useQuery({
    queryKey: qk.communityComments.page(postId, pageNumber),
    queryFn: () => listComments(postId, pageNumber),
    enabled: Boolean(postId),
    placeholderData: keepPreviousData,
  });
}

function invalidatePostAndComments(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  void queryClient.invalidateQueries({ queryKey: qk.communityComments.all(postId) });
  // Comment count on the post card/detail changes too.
  void queryClient.invalidateQueries({ queryKey: qk.communityPost(postId) });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommentRequest) => createComment(postId, payload),
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}

export function useCreateReply(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rootCommentId, payload }: { rootCommentId: string; payload: CreateReplyRequest }) =>
      createReply(rootCommentId, payload),
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, payload }: { commentId: string; payload: UpdateCommentRequest }) =>
      updateComment(commentId, payload),
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => invalidatePostAndComments(queryClient, postId),
  });
}
