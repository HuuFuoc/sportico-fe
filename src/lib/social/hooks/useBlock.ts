"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/social/query-keys";
import { blockUser, listBlockedUsers, unblockUser } from "@/lib/social/api/block";
import type { BlockUserRequest } from "@/lib/social/types";

export function useBlockedUsers() {
  return useQuery({
    queryKey: qk.blockedUsers,
    queryFn: listBlockedUsers,
    staleTime: 30_000,
  });
}

/** Convenience: is `userId` in the current viewer's blocklist? */
export function useIsBlocked(userId: string | null | undefined) {
  const { data } = useBlockedUsers();
  if (!userId || !data) return false;
  return data.some((u) => u.userId === userId);
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload?: BlockUserRequest }) =>
      blockUser(userId, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.blockedUsers }),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.blockedUsers }),
  });
}
