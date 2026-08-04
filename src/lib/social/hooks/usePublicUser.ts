"use client";

// ============================================================================
// Resolve a bare user id into a display name + avatar via GET /api/users/{id}.
//
// Needed everywhere the social contract gives us an id and nothing else:
// ChatRoomResponse.otherUserId, BookingResponse.coachId, a comment author id
// when only a stub is cached, etc. Backed by the existing in-memory
// `public-user-cache` so repeated lookups across components/re-renders don't
// refetch the same id.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { callData } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import { qk } from "@/lib/social/query-keys";
import { getPublicUserCached, setPublicUserCached } from "@/lib/public-user-cache";

interface PublicUserResponse {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ResolvedUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

async function fetchPublicUser(userId: string): Promise<ResolvedUser> {
  const cached = getPublicUserCached(userId);
  if (cached) return { id: userId, name: cached.name, avatarUrl: cached.avatarUrl ?? null };

  const user = await callData<PublicUserResponse>(ep.userById(userId));
  const name = user.fullName?.trim() || `Người dùng ${userId.slice(0, 4).toUpperCase()}`;
  setPublicUserCached(userId, { name, avatarUrl: user.avatarUrl ?? undefined });
  return { id: userId, name, avatarUrl: user.avatarUrl ?? null };
}

export function usePublicUser(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.publicUser(userId ?? ""),
    queryFn: () => fetchPublicUser(userId as string),
    enabled: Boolean(userId),
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
  });
}
