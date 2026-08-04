// ============================================================================
// Vietnamese presentation + routing for `NotificationResponse`.
//
// The backend contract is intentionally thin: `{ id, title, content, type,
// isRead, createdAt }` — NO `referenceId` / `referenceType`, so a notification
// can never deep-link to the exact post/room/report it's about. Every type
// routes to a LIST page instead:
//
//   post    → /community
//   message → /messages
//   report  → /community/my-posts
//   system  → /community/my-posts
//
// Title/content arrive in English with no documented fixed vocabulary (the
// handoff doc gives the `type` contract but not the exact backend copy), so
// the keyword table below is a best-effort translation for the phrases most
// systems like this actually send. Anything it doesn't recognise falls back
// to the backend's own text — it is NEVER blanked out.
// ============================================================================

export type NotificationRoute = "/community" | "/messages" | "/community/my-posts";

const ROUTE_BY_TYPE: Record<string, NotificationRoute> = {
  post: "/community",
  message: "/messages",
  report: "/community/my-posts",
  system: "/community/my-posts",
};

/**
 * Material Symbols icon name — the notification dropdown is existing legacy
 * UI built on `<MaterialIcon>`, not Iconoir. Keep it that way rather than
 * mixing icon sets in one component.
 */
export const NOTIFICATION_ICON_BY_TYPE: Record<string, string> = {
  post: "groups",
  message: "chat_bubble",
  report: "flag",
  system: "info",
};

/** List-page destination for a notification's `type`. Never a detail deep-link. */
export function notificationRoute(type: string | null | undefined): NotificationRoute {
  return ROUTE_BY_TYPE[(type ?? "").toLowerCase()] ?? "/community/my-posts";
}

/** Generic Vietnamese heading for a type, used when the title has no keyword match. */
const GENERIC_TITLE_BY_TYPE: Record<string, string> = {
  post: "Cập nhật bài đăng cộng đồng",
  message: "Tin nhắn mới",
  report: "Cập nhật báo cáo",
  system: "Thông báo hệ thống",
};

/**
 * Keyword → Vietnamese phrase, checked case-insensitively against the raw
 * `title`. Ordered so more specific phrases are tried before generic ones.
 */
const KEYWORD_TRANSLATIONS: Array<[RegExp, string]> = [
  [/application.*accept|accept.*application/i, "Đơn đăng ký của bạn đã được duyệt"],
  [/application.*reject|reject.*application/i, "Đơn đăng ký của bạn đã bị từ chối"],
  [/new application|applied to your post/i, "Có người đăng ký tham gia bài đăng của bạn"],
  [/new comment|commented on/i, "Có bình luận mới trên bài đăng của bạn"],
  [/repl(y|ied)/i, "Có người trả lời bình luận của bạn"],
  [/lik(e|ed) your post/i, "Bài đăng của bạn có lượt thích mới"],
  [/post.*hidden|hidden.*post/i, "Bài đăng của bạn đã bị ẩn"],
  [/post.*deleted|deleted.*post/i, "Bài đăng của bạn đã bị xoá"],
  [/comment.*hidden/i, "Bình luận của bạn đã bị ẩn"],
  [/comment.*deleted/i, "Bình luận của bạn đã bị xoá"],
  [/report.*resolved|resolved.*report/i, "Báo cáo của bạn đã được xử lý"],
  [/report.*reject/i, "Báo cáo của bạn đã bị từ chối"],
  [/new message|sent you a message/i, "Bạn có tin nhắn mới"],
  [/chat request|wants to chat|message request/i, "Có yêu cầu trò chuyện mới"],
  [/accepted your (chat|message) request/i, "Yêu cầu trò chuyện của bạn đã được chấp nhận"],
  [/rejected your (chat|message) request/i, "Yêu cầu trò chuyện của bạn đã bị từ chối"],
  [/post.*clos(e|ed)/i, "Bài đăng đã đóng"],
  [/post.*full|slots? full/i, "Bài đăng đã đủ người tham gia"],
];

/**
 * Best-effort Vietnamese title. Tries a keyword match against the backend's
 * raw title first, then a generic per-type heading, then the raw text itself
 * — the UI must never show a blank in place of an unrecognised notification.
 */
export function notificationTitleVi(n: {
  title?: string | null;
  type?: string | null;
}): string {
  const raw = n.title ?? "";
  for (const [pattern, vi] of KEYWORD_TRANSLATIONS) {
    if (pattern.test(raw)) return vi;
  }
  const generic = GENERIC_TITLE_BY_TYPE[(n.type ?? "").toLowerCase()];
  return generic ?? raw ?? "Thông báo";
}
