// ============================================================================
// Community post API (feed, detail, CRUD, close, like).
//
// The feed and detail endpoints are PUBLIC (AllowAnonymous) but enrich the
// response for a signed-in viewer with `currentUserReacted`, `canApply`, etc.
// `publicInit()` sends a live token when we have one and omits a dead one so a
// guest never gets bounced to /login by a stale-token 401 on a public page.
// ============================================================================

import { callData, callPage, callVoid, del, postJson, putJson, buildQuery, publicInit } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  CommunityPostFilters,
  CommunityPostResponse,
  CreateCommunityPostRequest,
  PagedResult,
  UpdateCommunityPostRequest,
} from "@/lib/social/types";

function filterQuery(f: CommunityPostFilters): string {
  return buildQuery({
    PostType: f.postType,
    SportId: f.sportId,
    Keyword: f.keyword,
    // Backend matches this against `locationName`, not an administrative city.
    City: f.city,
    FromDate: f.fromDate,
    ToDate: f.toDate,
    Level: f.level,
    HasAvailableSlots: f.hasAvailableSlots,
    AuthorId: f.authorId,
    FollowingOnly: f.followingOnly,
    SortBy: f.sortBy,
    PageNumber: f.pageNumber ?? 1,
    // Capped at 20: the backend runs an N+1 query per item for a signed-in caller.
    PageSize: Math.min(f.pageSize ?? 20, 20),
  });
}

/** GET /api/community/posts — public feed. Includes closed/expired posts. */
export function listCommunityPosts(
  filters: CommunityPostFilters = {},
): Promise<PagedResult<CommunityPostResponse>> {
  return callPage<CommunityPostResponse>(
    ep.communityPosts + filterQuery(filters),
    publicInit(),
  );
}

/** GET /api/community/posts/me — the signed-in user's own posts (any status). */
export function listMyCommunityPosts(
  filters: CommunityPostFilters = {},
): Promise<PagedResult<CommunityPostResponse>> {
  return callPage<CommunityPostResponse>(ep.myCommunityPosts + filterQuery(filters));
}

/**
 * GET /api/community/posts/{id} — public detail. Increments `viewCount` server
 * side on every call; callers must configure their query to avoid refetching
 * on focus/mount (see `useCommunityPost`).
 */
export function getCommunityPost(postId: string): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.communityPostById(postId), publicInit());
}

export function createCommunityPost(
  payload: CreateCommunityPostRequest,
): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.communityPosts, postJson(payload));
}

/**
 * PUT /api/community/posts/{id}.
 *
 * Media semantics (backend contract): omit `media` (or send null) to KEEP the
 * existing gallery untouched; send `[]` to DELETE all media; send a full array
 * to REPLACE it. Never pass `[]` just because a form defaulted to an empty
 * array — build the field with `mediaFieldForUpdate()` (`@/lib/social/media-policy`).
 */
export function updateCommunityPost(
  postId: string,
  payload: UpdateCommunityPostRequest,
): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.communityPostById(postId), putJson(payload));
}

/** DELETE returns `ObjectResult` (data is always null) — use `callVoid`, never `callData`. */
export function deleteCommunityPost(postId: string): Promise<void> {
  return callVoid(ep.communityPostById(postId), del());
}

export function closeCommunityPost(postId: string): Promise<CommunityPostResponse> {
  return callData<CommunityPostResponse>(ep.communityPostClose(postId), putJson());
}

export function likeCommunityPost(postId: string): Promise<void> {
  return callVoid(ep.communityPostLike(postId), putJson());
}

export function unlikeCommunityPost(postId: string): Promise<void> {
  return callVoid(ep.communityPostLike(postId), del());
}
