"use client";

// ============================================================================
// Community application hooks.
//
// Apply / cancel / accept / reject are all deliberately NON-optimistic: the
// backend can refuse an accept with COMMUNITY_POST_FULL or CONCURRENCY_CONFLICT
// when two admins/authors race on the last slot, and the contract requires the
// user to see fresh data and decide the next step — never a silent retry.
// ============================================================================

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import {
  acceptApplication,
  applyToPost,
  cancelMyApplication,
  listApplications,
  rejectApplication,
} from "@/lib/social/api/applications";
import type { CommunityApplicationFilters, CreateApplicationRequest } from "@/lib/social/types";

export const APPLICATION_MESSAGE_MAX_LENGTH = 500;

export function useApplications(postId: string, filters: CommunityApplicationFilters = {}) {
  return useQuery({
    queryKey: qk.communityApplications.list(postId, filters),
    queryFn: () => listApplications(postId, filters),
    enabled: Boolean(postId),
    placeholderData: keepPreviousData,
  });
}

function invalidateApplicationSurfaces(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  void queryClient.invalidateQueries({ queryKey: qk.communityApplications.all(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.communityPost(postId) });
  void queryClient.invalidateQueries({ queryKey: qk.communityPosts.all });
}

export function useApplyToPost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApplicationRequest) => applyToPost(postId, payload),
    onSuccess: () => invalidateApplicationSurfaces(queryClient, postId),
  });
}

export function useCancelMyApplication(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelMyApplication(postId),
    onSuccess: () => invalidateApplicationSurfaces(queryClient, postId),
  });
}

export function useAcceptApplication(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => acceptApplication(applicationId),
    // Refetch on BOTH outcomes: a failed accept (COMMUNITY_POST_FULL /
    // CONCURRENCY_CONFLICT) still needs fresh slot counts so the caller can
    // decide the next step — the contract forbids auto-retry, not a refetch.
    onSettled: () => invalidateApplicationSurfaces(queryClient, postId),
  });
}

export function useRejectApplication(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => rejectApplication(applicationId),
    onSettled: () => invalidateApplicationSurfaces(queryClient, postId),
  });
}
