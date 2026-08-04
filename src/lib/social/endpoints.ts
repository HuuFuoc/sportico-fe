// ============================================================================
// Backend paths for the social surfaces. Base URL comes from
// NEXT_PUBLIC_API_BASE_URL via `apiFetch` — never hard-code a host here.
//
// Verified against the live `/swagger/v1/swagger.json`. Paths absent from that
// document are absent from this file: there is no upload endpoint, no publish
// endpoint for drafts, no reopen endpoint for closed posts, and no endpoint
// listing an applicant's own applications.
// ============================================================================

const id = encodeURIComponent;

export const socialEndpoints = {
  // ---- Voucher (learner) -------------------------------------------------
  validateVoucher: "/api/vouchers/validate",

  // ---- Checkout ----------------------------------------------------------
  purchasePayos: "/api/bookings/purchase/payos",
  purchaseManual: "/api/bookings/purchase/manual",
  /** Reconcile by body — accepts `{ orderCode }` or `{ paymentId }`. */
  reconcilePayos: "/api/payments/payos/reconcile",
  /** Reconcile by path orderCode. */
  reconcilePayosByOrderCode: (orderCode: string | number) =>
    `/api/payments/payos/${id(String(orderCode))}/reconcile`,
  bookingById: (bookingId: string) => `/api/bookings/${id(bookingId)}`,
  publicTrainingPackageById: (packageId: string) =>
    `/api/public/training-packages/${id(packageId)}`,

  // ---- Community posts ---------------------------------------------------
  communityPosts: "/api/community/posts",
  myCommunityPosts: "/api/community/posts/me",
  communityPostById: (postId: string) => `/api/community/posts/${id(postId)}`,
  communityPostClose: (postId: string) =>
    `/api/community/posts/${id(postId)}/close`,
  communityPostLike: (postId: string) => `/api/community/posts/${id(postId)}/like`,

  // ---- Comments ----------------------------------------------------------
  postComments: (postId: string) => `/api/community/posts/${id(postId)}/comments`,
  commentReplies: (commentId: string) =>
    `/api/community/comments/${id(commentId)}/replies`,
  commentById: (commentId: string) => `/api/community/comments/${id(commentId)}`,

  // ---- Applications ------------------------------------------------------
  postApplications: (postId: string) =>
    `/api/community/posts/${id(postId)}/applications`,
  myApplicationForPost: (postId: string) =>
    `/api/community/posts/${id(postId)}/applications/me`,
  acceptApplication: (applicationId: string) =>
    `/api/community/applications/${id(applicationId)}/accept`,
  rejectApplication: (applicationId: string) =>
    `/api/community/applications/${id(applicationId)}/reject`,

  // ---- Chat --------------------------------------------------------------
  chatRooms: "/api/chat/rooms",
  chatRoomAccept: (roomId: string) => `/api/chat/rooms/${id(roomId)}/accept`,
  chatRoomReject: (roomId: string) => `/api/chat/rooms/${id(roomId)}/reject`,
  chatRoomMessages: (roomId: string) => `/api/chat/rooms/${id(roomId)}/messages`,

  // ---- Block -------------------------------------------------------------
  blockUser: (userId: string) => `/api/users/${id(userId)}/block`,
  myBlockedUsers: "/api/users/me/blocked",
  userById: (userId: string) => `/api/users/${id(userId)}`,

  // ---- Report ------------------------------------------------------------
  reports: "/api/reports",

  // ---- Admin voucher -----------------------------------------------------
  adminVoucherCampaigns: "/api/admin/voucher-campaigns",
  adminVoucherCampaignById: (campaignId: string) =>
    `/api/admin/voucher-campaigns/${id(campaignId)}`,
  adminVoucherCampaignActivate: (campaignId: string) =>
    `/api/admin/voucher-campaigns/${id(campaignId)}/activate`,
  adminVoucherCampaignPause: (campaignId: string) =>
    `/api/admin/voucher-campaigns/${id(campaignId)}/pause`,
  adminVoucherCampaignEnd: (campaignId: string) =>
    `/api/admin/voucher-campaigns/${id(campaignId)}/end`,
  adminVoucherRedemptions: (campaignId: string) =>
    `/api/admin/voucher-campaigns/${id(campaignId)}/redemptions`,

  // ---- Admin community moderation ---------------------------------------
  adminCommunityPosts: "/api/admin/community/posts",
  adminCommunityPostById: (postId: string) =>
    `/api/admin/community/posts/${id(postId)}`,
  adminCommunityPostHide: (postId: string) =>
    `/api/admin/community/posts/${id(postId)}/hide`,
  adminCommunityPostRestore: (postId: string) =>
    `/api/admin/community/posts/${id(postId)}/restore`,
  adminCommunityPostComments: (postId: string) =>
    `/api/admin/community/posts/${id(postId)}/comments`,
  adminCommunityCommentHide: (commentId: string) =>
    `/api/admin/community/comments/${id(commentId)}/hide`,
  adminCommunityCommentRestore: (commentId: string) =>
    `/api/admin/community/comments/${id(commentId)}/restore`,
  adminCommunityCommentById: (commentId: string) =>
    `/api/admin/community/comments/${id(commentId)}`,

  // ---- Admin reports -----------------------------------------------------
  adminReports: "/api/admin/community/reports",
  adminResolveReport: (reportId: string) =>
    `/api/admin/community/reports/${id(reportId)}/resolve`,

  // NOTE: no sports endpoint here on purpose — `/api/Sports` is POST-only
  // (admin create). The catalogue comes from `@/lib/sports-api`.
} as const;
