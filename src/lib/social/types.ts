// ============================================================================
// DTOs for Voucher, Community, Chat, Block, Report and Admin moderation.
//
// Mirrors the live backend contract (Azure `/swagger/v1/swagger.json`) exactly.
// Every field here exists on the wire — nothing is invented. In particular the
// following do NOT exist and must never be added:
//
//   ChatRoomResponse      → otherUser, lastMessage, unreadCount
//   NotificationResponse  → referenceId, referenceType
//   AdminCommunityPost*   → content, sportName, media, viewCount, slotsRemaining
//
// The backend serialises most properties as optional/nullable, so reads are
// modelled defensively (`?` + `| null`) and normalised at the API layer.
// ============================================================================

/** Standard envelope. The success flag is `isSuccess` — NOT `success`. */
export interface ApiResult<T> {
  isSuccess: boolean;
  data: T | null;
  error: ApiErrorBody | null;
}

export interface ApiErrorBody {
  code?: string | null;
  message?: string | null;
  type?: ErrorType | null;
  details?: string[] | null;
}

export type ErrorType =
  | "Validation"
  | "NotFound"
  | "Unauthorized"
  | "Forbidden"
  | "Conflict"
  | "Failure";

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ---------------------------------------------------------------------------
// Voucher
// ---------------------------------------------------------------------------

/** Body of POST /api/vouchers/validate. Validation only — reserves nothing. */
export interface ValidateVoucherRequest {
  code: string;
  trainingPackageId: string;
}

/** A quote is advisory: the backend recomputes everything again at purchase. */
export interface VoucherQuoteResponse {
  code: string | null;
  originalAmount: number;
  discountAmount: number;
  totalAmount: number;
  discountType: string | null;
  discountValue: number;
  maxDiscountAmount: number | null;
}

export type VoucherDiscountType = "percentage" | "fixed";

export type VoucherCampaignStatus = "draft" | "active" | "paused" | "ended";

export interface VoucherCampaignResponse {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  discountType: string | null;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startAt: string | null;
  endAt: string | null;
  status: string | null;
  maxUsesTotal: number | null;
  maxUsesPerLearner: number | null;
  reservedCount: number;
  usedCount: number;
  budgetAmount: number | null;
  reservedDiscountAmount: number;
  usedDiscountAmount: number;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherCampaignRequest {
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  maxUsesTotal?: number | null;
  maxUsesPerLearner?: number | null;
  budgetAmount?: number | null;
}

/**
 * PUT /api/admin/voucher-campaigns/{id}. The four financial fields are omitted
 * entirely once the campaign has redemptions — see `lockedFinancialFields`.
 */
export interface UpdateVoucherCampaignRequest {
  name?: string | null;
  description?: string | null;
  discountType?: VoucherDiscountType | null;
  discountValue?: number | null;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  maxUsesTotal?: number | null;
  maxUsesPerLearner?: number | null;
  budgetAmount?: number | null;
}

export interface VoucherRedemptionResponse {
  id: string;
  voucherCampaignId: string;
  bookingId: string;
  learnerId: string;
  paymentId: string | null;
  status: string | null;
  originalAmount: number;
  discountAmount: number;
  reservedAt: string;
  expiresAt: string | null;
  appliedAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
}

// ---------------------------------------------------------------------------
// Checkout / PayOS
// ---------------------------------------------------------------------------

/** Only these two fields. Amounts are NEVER sent from the client. */
export interface PurchaseTrainingPackageRequest {
  trainingPackageId: string;
  voucherCode?: string | null;
}

export interface PurchasePayOsResponse {
  bookingId: string;
  paymentId: string;
  orderCode: number | null;
  checkoutUrl: string | null;
  status: string | null;
  paymentStatus: string | null;
  /** THE routing signal. Never branch on `totalAmount === 0` instead. */
  paymentRequired: boolean;
  bookingStatus: string | null;
  expiredAt: string | null;
}

export interface ReconcilePayOsRequest {
  orderCode?: number | null;
  paymentId?: string | null;
}

export interface ReconcilePayOsResponse {
  paymentId: string;
  orderCode: number | null;
  paymentStatus: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  /** The ONLY proof the booking is live. PayOS query params prove nothing. */
  activated: boolean;
  payOsStatus: string | null;
  message: string | null;
}

export interface BookingResponse {
  id: string;
  learnerId: string;
  coachId: string;
  trainingPackageId: string;
  trainingPackageTitle: string | null;
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  voucherCampaignId: string | null;
  voucherCode: string | null;
  /** Platform-internal. Never rendered on a learner-facing surface. */
  platformFeeRate: number;
  platformFeeAmount: number;
  coachReceiveAmount: number;
  perSessionCoachAmount: number;
  totalSessions: number;
  completedSessions: number;
  usedSessions: number;
  remainingSessions: number;
  canBookSession: boolean;
  sessionCountsByStatus: Record<string, number> | null;
  status: string | null;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export type CommunityPostType = "recruitment" | "sharing";

export type CommunityPostStatus =
  | "draft"
  | "published"
  | "closed"
  | "expired"
  | "hidden"
  | "deleted";

export type CommunityLevel = "beginner" | "intermediate" | "advanced" | "all";

export type CommunityMediaType = "image" | "video";

export interface CommunityPostAuthorResponse {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface CommunityPostMediaResponse {
  id: string;
  mediaType: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  orderIndex: number;
}

export interface CommunityPostMediaRequest {
  mediaType: CommunityMediaType;
  url: string;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export type CommunityApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export interface CommunityPostResponse {
  id: string;
  author: CommunityPostAuthorResponse | null;
  sportId: number | null;
  sportName: string | null;
  postType: string | null;
  title: string | null;
  content: string | null;
  locationName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  startAt: string | null;
  endAt: string | null;
  maxParticipants: number | null;
  acceptedParticipants: number;
  slotsRemaining: number | null;
  level: string | null;
  feePerPerson: number | null;
  status: string | null;
  allowComments: boolean;
  commentCount: number;
  reactionCount: number;
  applicationCount: number;
  viewCount: number;
  media: CommunityPostMediaResponse[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentUserReacted: boolean;
  currentUserApplicationStatus: string | null;
  canApply: boolean;
  canEdit: boolean;
  /** Only meaningful on ADMIN endpoints. Never gate moderation UI on it here. */
  canModerate: boolean;
}

export interface CreateCommunityPostRequest {
  sportId?: number | null;
  postType: CommunityPostType;
  title: string;
  content: string;
  locationName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  maxParticipants?: number | null;
  level?: CommunityLevel | null;
  feePerPerson?: number | null;
  allowComments: boolean;
  publish: boolean;
  media?: CommunityPostMediaRequest[] | null;
}

/**
 * Media semantics on update (backend contract — get this wrong and you delete
 * a user's gallery):
 *   media: null / omitted → keep existing media untouched
 *   media: []             → delete ALL media
 *   media: [a, b, c]      → replace the whole set
 */
export interface UpdateCommunityPostRequest {
  title?: string | null;
  content?: string | null;
  locationName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  maxParticipants?: number | null;
  level?: CommunityLevel | null;
  feePerPerson?: number | null;
  allowComments?: boolean | null;
  media?: CommunityPostMediaRequest[] | null;
}

export interface CommunityPostFilters {
  postType?: CommunityPostType | null;
  sportId?: number | null;
  keyword?: string | null;
  /** Backend matches this against `locationName`, NOT an administrative city. */
  city?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  level?: CommunityLevel | null;
  hasAvailableSlots?: boolean | null;
  authorId?: string | null;
  followingOnly?: boolean | null;
  sortBy?: string | null;
  pageNumber?: number;
  /** Keep ≤ 20: the backend runs an N+1 query when the caller is authenticated. */
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export type CommunityCommentStatus = "active" | "hidden" | "deleted";

export interface CommunityCommentResponse {
  id: string;
  postId: string;
  author: CommunityPostAuthorResponse | null;
  parentCommentId: string | null;
  content: string | null;
  status: string | null;
  replyCount: number;
  /** Present on the public endpoint; the admin endpoint returns a flat list. */
  replies: CommunityCommentResponse[];
  canEdit: boolean;
  canModerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

/** Same shape as `CreateCommentRequest` but a distinct backend DTO. */
export interface CreateReplyRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export interface CommunityApplicationResponse {
  id: string;
  postId: string;
  applicant: CommunityPostAuthorResponse | null;
  message: string | null;
  status: string | null;
  createdAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
}

export interface CreateApplicationRequest {
  message?: string | null;
}

export interface CommunityApplicationFilters {
  status?: CommunityApplicationStatus | null;
  pageNumber?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type ChatRoomStatus = "pending" | "active" | "rejected";

export type ChatSourceType = "community_post" | "coach_profile" | "booking" | "direct";

/**
 * No display data here — resolve `otherUserId` through GET /api/users/{id}.
 * There is no `unreadCount`, no `lastMessage`, and no blocked flag on the wire.
 */
export interface ChatRoomResponse {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUserId: string | null;
  status: string | null;
  requestedByUserId: string | null;
  requestedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  lastMessageAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

/** New code sends `targetUserId`. `coachId` is legacy and intentionally unused. */
export interface CreateChatRoomRequest {
  targetUserId: string;
  sourceType?: ChatSourceType | null;
  sourceId?: string | null;
}

export type ChatAttachmentType = "image" | "video" | "file";

export interface ChatMessageAttachmentResponse {
  id: string;
  fileUrl: string | null;
  fileType: string | null;
}

export interface ChatMessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  /** Attachment-only messages arrive as `""` — never `null`. */
  content: string | null;
  /** Always false on this backend. Never drive unread/seen UI from it. */
  isRead: boolean;
  sentAt: string;
  attachments: ChatMessageAttachmentResponse[];
}

export interface SendMessageAttachmentRequest {
  fileUrl: string;
  fileType: ChatAttachmentType;
}

export interface SendMessageRequest {
  content?: string | null;
  attachments?: SendMessageAttachmentRequest[] | null;
}

/** Client-only. Never merged into the server message cache as a real message. */
export interface PendingMessage {
  tempId: string;
  content: string;
  sentAt: string;
  status: "sending" | "failed";
  attachments: SendMessageAttachmentRequest[];
}

// ---------------------------------------------------------------------------
// Block
// ---------------------------------------------------------------------------

export interface BlockedUserResponse {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  reason: string | null;
}

export interface BlockUserRequest {
  /** Capped at 500 chars client-side: the backend does not validate, the DB does. */
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export type ReportTargetType = "community_post" | "community_comment" | "chat_message";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

export type ReportAction =
  | "none"
  | "post_hidden"
  | "post_deleted"
  | "comment_hidden"
  | "comment_deleted";

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string | null;
}

export interface ReportResponse {
  id: string;
  reporterId: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  handledByUserId: string | null;
  handledAt: string | null;
  resolutionNote: string | null;
  actionTaken: string | null;
  createdAt: string;
}

export interface ResolveReportRequest {
  status: Extract<ReportStatus, "resolved" | "rejected">;
  resolutionNote?: string | null;
  actionTaken?: ReportAction | null;
}

export interface AdminReportFilters {
  targetType?: ReportTargetType | null;
  status?: ReportStatus | null;
  pageNumber?: number;
  /** Hard client cap of 100 — the backend does not enforce one. */
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Admin community moderation
// ---------------------------------------------------------------------------

/** Trimmed list projection. Call the detail endpoint for content/media/etc. */
export interface AdminCommunityPostResponse {
  id: string;
  author: CommunityPostAuthorResponse | null;
  postType: string | null;
  title: string | null;
  status: string | null;
  moderationReason: string | null;
  reportCount: number;
  commentCount: number;
  reactionCount: number;
  applicationCount: number;
  createdAt: string;
  publishedAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
}

export interface AdminCommunityPostFilters {
  status?: CommunityPostStatus | null;
  postType?: CommunityPostType | null;
  sportId?: number | null;
  authorId?: string | null;
  keyword?: string | null;
  reportedOnly?: boolean | null;
  fromDate?: string | null;
  toDate?: string | null;
  sortBy?: string | null;
  pageNumber?: number;
  /** Keep ≤ 20: the backend N+1s on `reportCount`. */
  pageSize?: number;
}

export interface HideContentRequest {
  reason: string;
}

// ---------------------------------------------------------------------------
// Notification (contract unchanged — no referenceId / referenceType exists)
// ---------------------------------------------------------------------------

export type NotificationType = "post" | "message" | "report" | "system";

export interface NotificationResponse {
  id: string;
  title: string | null;
  content: string | null;
  type: string | null;
  isRead: boolean;
  createdAt: string;
}
