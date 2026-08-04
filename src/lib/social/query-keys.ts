// ============================================================================
// Canonical TanStack Query keys for the social surfaces.
//
// Every hook and every `invalidateQueries` call reads from here — a literal key
// typed inline in a component is the usual reason a mutation "works" but the
// list behind it never refreshes.
//
// Prefix convention: a list key's first element is shared with its detail key's
// family so `invalidateQueries({ queryKey: qk.communityPosts.all })` catches
// every filtered page at once.
// ============================================================================

import type {
  AdminCommunityPostFilters,
  AdminReportFilters,
  CommunityApplicationFilters,
  CommunityPostFilters,
} from "@/lib/social/types";

export const qk = {
  // ---- Community ---------------------------------------------------------
  communityPosts: {
    all: ["community-posts"] as const,
    list: (filters: CommunityPostFilters) => ["community-posts", filters] as const,
  },
  communityPost: (postId: string) => ["community-post", postId] as const,
  myCommunityPosts: {
    all: ["my-community-posts"] as const,
    list: (filters: CommunityPostFilters) =>
      ["my-community-posts", filters] as const,
  },
  communityComments: {
    all: (postId: string) => ["community-comments", postId] as const,
    page: (postId: string, pageNumber: number) =>
      ["community-comments", postId, pageNumber] as const,
  },
  communityApplications: {
    all: (postId: string) => ["community-applications", postId] as const,
    list: (postId: string, filters: CommunityApplicationFilters) =>
      ["community-applications", postId, filters] as const,
  },

  // ---- Chat / block ------------------------------------------------------
  chatRooms: ["chat-rooms"] as const,
  chatMessages: {
    all: (roomId: string) => ["chat-messages", roomId] as const,
    page: (roomId: string, pageNumber: number) =>
      ["chat-messages", roomId, pageNumber] as const,
  },
  blockedUsers: ["blocked-users"] as const,

  // ---- Notifications -----------------------------------------------------
  notifications: {
    all: ["notifications"] as const,
    list: (filters: object) => ["notifications", filters] as const,
  },
  notificationsUnreadCount: ["notifications-unread-count"] as const,

  // ---- Admin voucher -----------------------------------------------------
  adminVoucherCampaigns: {
    all: ["admin-voucher-campaigns"] as const,
    list: (filters: object) => ["admin-voucher-campaigns", filters] as const,
  },
  adminVoucherCampaign: (campaignId: string) =>
    ["admin-voucher-campaign", campaignId] as const,
  adminVoucherRedemptions: {
    all: (campaignId: string) => ["admin-voucher-redemptions", campaignId] as const,
    list: (campaignId: string, filters: object) =>
      ["admin-voucher-redemptions", campaignId, filters] as const,
  },

  // ---- Admin community / reports ----------------------------------------
  adminCommunityPosts: {
    all: ["admin-community-posts"] as const,
    list: (filters: AdminCommunityPostFilters) =>
      ["admin-community-posts", filters] as const,
  },
  adminCommunityPost: (postId: string) => ["admin-community-post", postId] as const,
  adminCommunityComments: {
    all: (postId: string) => ["admin-community-comments", postId] as const,
    page: (postId: string, pageNumber: number) =>
      ["admin-community-comments", postId, pageNumber] as const,
  },
  adminReports: {
    all: ["admin-reports"] as const,
    list: (filters: AdminReportFilters) => ["admin-reports", filters] as const,
  },

  // ---- Booking -----------------------------------------------------------
  booking: (bookingId: string) => ["booking", bookingId] as const,

  // ---- Supporting --------------------------------------------------------
  publicUser: (userId: string) => ["public-user", userId] as const,
  sports: ["sports"] as const,
} as const;
