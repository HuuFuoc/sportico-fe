// ============================================================================
// Community application API (recruitment posts).
//
// There is no "list my applications" endpoint — a learner's application state
// for a given post comes only from `CommunityPostResponse.currentUserApplicationStatus`
// on the post itself, never a separate query.
// ============================================================================

import { callData, callPage, callVoid, del, postJson, putJson, buildQuery } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type {
  CommunityApplicationFilters,
  CommunityApplicationResponse,
  CreateApplicationRequest,
  PagedResult,
} from "@/lib/social/types";

export function listApplications(
  postId: string,
  filters: CommunityApplicationFilters = {},
): Promise<PagedResult<CommunityApplicationResponse>> {
  return callPage<CommunityApplicationResponse>(
    ep.postApplications(postId) +
      buildQuery({
        Status: filters.status,
        PageNumber: filters.pageNumber ?? 1,
        PageSize: filters.pageSize ?? 20,
      }),
  );
}

export function applyToPost(
  postId: string,
  payload: CreateApplicationRequest,
): Promise<CommunityApplicationResponse> {
  return callData<CommunityApplicationResponse>(ep.postApplications(postId), postJson(payload));
}

/** DELETE /api/community/posts/{id}/applications/me — cancel own pending application. */
export function cancelMyApplication(postId: string): Promise<void> {
  return callVoid(ep.myApplicationForPost(postId), del());
}

export function acceptApplication(
  applicationId: string,
): Promise<CommunityApplicationResponse> {
  return callData<CommunityApplicationResponse>(ep.acceptApplication(applicationId), putJson());
}

export function rejectApplication(
  applicationId: string,
): Promise<CommunityApplicationResponse> {
  return callData<CommunityApplicationResponse>(ep.rejectApplication(applicationId), putJson());
}
