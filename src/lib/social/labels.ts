// ============================================================================
// Vietnamese display labels for the social/community enums. Pure lookup
// tables — no network, safe to import from Server or Client Components.
// ============================================================================

export const POST_TYPE_LABELS: Record<string, string> = {
  looking_for_players: "Tìm người chơi",
  looking_for_team: "Tìm đội/nhóm",
  training_partner: "Tìm bạn tập",
  friendly_match: "Giao hữu",
  event: "Sự kiện",
  discussion: "Thảo luận",
  question: "Hỏi đáp",
};

/**
 * The 5 types that organise an activity (people + a time/place) vs the 2 that
 * are pure text content. The backend's own `postType` enum doesn't group them
 * this way — this is a UI-only grouping so the create/edit form only asks for
 * sportId/startAt/maxParticipants on the types where they're meaningful.
 * Mirrors the original "recruitment post requires sportId/startAt/
 * maxParticipants" requirement now that the literal "recruitment" value
 * turned out not to exist on the wire.
 */
export const SCHEDULED_POST_TYPES: readonly string[] = [
  "looking_for_players",
  "looking_for_team",
  "training_partner",
  "friendly_match",
  "event",
];

export function isScheduledPostType(postType: string | null | undefined): boolean {
  return postType != null && SCHEDULED_POST_TYPES.includes(postType);
}

export const POST_STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đang mở",
  closed: "Đã đóng",
  expired: "Đã hết hạn",
  hidden: "Đã ẩn",
  deleted: "Đã xoá",
};

export const POST_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
  expired: "bg-amber-100 text-amber-700",
  hidden: "bg-rose-100 text-rose-700",
  deleted: "bg-rose-100 text-rose-700",
};

export const LEVEL_LABELS: Record<string, string> = {
  beginner: "Mới bắt đầu",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
  all: "Mọi trình độ",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Đang chờ duyệt",
  accepted: "Đã được duyệt",
  rejected: "Đã bị từ chối",
  cancelled: "Đã huỷ",
};

export const APPLICATION_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export const REPORT_REASON_OPTIONS = [
  { value: "spam", label: "Spam / quảng cáo" },
  { value: "inappropriate", label: "Nội dung không phù hợp" },
  { value: "harassment", label: "Quấy rối / xúc phạm" },
  { value: "misinformation", label: "Thông tin sai sự thật" },
  { value: "scam", label: "Lừa đảo" },
  { value: "other", label: "Khác" },
] as const;

export const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  reviewing: "Đang xem xét",
  resolved: "Đã xử lý",
  rejected: "Đã từ chối",
};

export const REPORT_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  reviewing: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-slate-100 text-slate-500",
};

export const REPORT_TARGET_TYPE_LABELS: Record<string, string> = {
  community_post: "Bài đăng",
  community_comment: "Bình luận",
  chat_message: "Tin nhắn",
};

/** Actions permitted per target type — never let the UI offer a mismatched one. */
export const REPORT_ACTIONS_BY_TARGET: Record<string, { value: string; label: string }[]> = {
  community_post: [
    { value: "none", label: "Không xử lý" },
    { value: "post_hidden", label: "Ẩn bài đăng" },
    { value: "post_deleted", label: "Xoá bài đăng" },
  ],
  community_comment: [
    { value: "none", label: "Không xử lý" },
    { value: "comment_hidden", label: "Ẩn bình luận" },
    { value: "comment_deleted", label: "Xoá bình luận" },
  ],
  chat_message: [{ value: "none", label: "Không xử lý" }],
};

export const VOUCHER_CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  ended: "Đã kết thúc",
};

export const VOUCHER_CAMPAIGN_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-slate-200 text-slate-500",
};

export const CHAT_ROOM_STATUS_LABELS: Record<string, string> = {
  pending: "Đang chờ chấp nhận",
  active: "Đang trò chuyện",
  rejected: "Đã từ chối",
};
