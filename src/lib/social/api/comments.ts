// ============================================================================
// Community comment API.
//
// Root comments are paginated; replies are NOT (the backend embeds them under
// `replies` on each root comment, one level deep only — there is no reply of a
// reply). Replying to a reply must still target the ROOT comment id.
// ============================================================================

import { callData, callPage, callVoid, del, postJson, putJson, buildQuery, publicInit } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  CommunityCommentResponse,
  CreateCommentRequest,
  CreateReplyRequest,
  PagedResult,
  UpdateCommentRequest,
} from "@/lib/social/types";

/** GET /api/community/posts/{postId}/comments — public, paginated root comments. */
export function listComments(
  postId: string,
  pageNumber: number,
  pageSize = 20,
): Promise<PagedResult<CommunityCommentResponse>> {
  return callPage<CommunityCommentResponse>(
    ep.postComments(postId) + buildQuery({ PageNumber: pageNumber, PageSize: pageSize }),
    publicInit(),
  );
}

export function createComment(
  postId: string,
  payload: CreateCommentRequest,
): Promise<CommunityCommentResponse> {
  return callData<CommunityCommentResponse>(ep.postComments(postId), postJson(payload));
}

/**
 * POST /api/community/comments/{commentId}/replies — `commentId` MUST be the
 * root comment's id. Resolve it with `rootCommentId()` before calling this so
 * "reply to a reply" still nests correctly.
 */
export function createReply(
  rootCommentId: string,
  payload: CreateReplyRequest,
): Promise<CommunityCommentResponse> {
  return callData<CommunityCommentResponse>(ep.commentReplies(rootCommentId), postJson(payload));
}

export function updateComment(
  commentId: string,
  payload: UpdateCommentRequest,
): Promise<CommunityCommentResponse> {
  return callData<CommunityCommentResponse>(ep.commentById(commentId), putJson(payload));
}

/** DELETE returns `ObjectResult` — always `callVoid`, never `callData`. */
export function deleteComment(commentId: string): Promise<void> {
  return callVoid(ep.commentById(commentId), del());
}

/**
 * The id to send when replying to `comment` — always the root, never a reply's
 * own id (the backend only supports one level of nesting).
 */
export function rootCommentId(comment: CommunityCommentResponse): string {
  return comment.parentCommentId ?? comment.id;
}
