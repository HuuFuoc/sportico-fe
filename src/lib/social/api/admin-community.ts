// ============================================================================
// Admin community moderation API.
//
// The LIST endpoint returns a trimmed `AdminCommunityPostResponse` — no
// content, sportName, media, viewCount, or slotsRemaining. The DETAIL endpoint
// (`GET /api/admin/community/posts/{id}`) returns the SAME full
// `CommunityPostResponse` the public detail page uses — call it whenever the
// admin needs to actually read a post, never assume the list row has it.
//
// Admin comments come back FLAT (root and reply rows side by side) — there is
// no nested `replies` array like the public endpoint.
// ============================================================================

import { callData, callPage, callVoid, buildQuery, putJson, del } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  AdminCommunityPostFilters,
  AdminCommunityPostResponse,
  CommunityCommentResponse,
  CommunityPostResponse,
  HideContentRequest,
  PagedResult,
} from "@/lib/social/types";

export function listAdminCommunityPosts(
  filters: AdminCommunityPostFilters = {},
): Promise<PagedResult<AdminCommunityPostResponse>> {
  return callPage<AdminCommunityPostResponse>(
    ep.adminCommunityPosts +
      buildQuery({
        Status: filters.status,
        PostType: filters.postType,
        SportId: filters.sportId,
        AuthorId: filters.authorId,
        Keyword: filters.keyword,
        ReportedOnly: filters.reportedOnly,
        FromDate: filters.fromDate,
        ToDate: filters.toDate,
        SortBy: filters.sortBy,
        PageNumber: filters.pageNumber ?? 1,
        // Capped at 20: the backend runs an N+1 query for `reportCount`.
        PageSize: Math.min(filters.pageSize ?? 20, 20),
      }),
  );
}

/** Full post detail — the admin list row alone never has enough to render this. */
export function getAdminCommunityPost(postId: string): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.adminCommunityPostById(postId));
}

export function hideAdminCommunityPost(
  postId: string,
  payload: HideContentRequest,
): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.adminCommunityPostHide(postId), putJson(payload));
}

/** Does NOT restore the pre-hide status — the backend decides what it becomes. */
export function restoreAdminCommunityPost(postId: string): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.adminCommunityPostRestore(postId), putJson());
}

export function deleteAdminCommunityPost(postId: string): Promise<void> {
  return callVoid(ep.adminCommunityPostById(postId), del());
}

export function listAdminPostComments(
  postId: string,
  pageNumber: number,
  pageSize = 20,
): Promise<PagedResult<CommunityCommentResponse>> {
  return callPage<CommunityCommentResponse>(
    ep.adminCommunityPostComments(postId) + buildQuery({ PageNumber: pageNumber, PageSize: pageSize }),
  );
}

export function hideAdminComment(
  commentId: string,
  payload: HideContentRequest,
): Promise<CommunityCommentResponse> {
  return callData<CommunityCommentResponse>(ep.adminCommunityCommentHide(commentId), putJson(payload));
}

export function restoreAdminComment(commentId: string): Promise<CommunityCommentResponse> {
  return callData<CommunityCommentResponse>(ep.adminCommunityCommentRestore(commentId), putJson());
}

export function deleteAdminComment(commentId: string): Promise<void> {
  return callVoid(ep.adminCommunityCommentById(commentId), del());
}
