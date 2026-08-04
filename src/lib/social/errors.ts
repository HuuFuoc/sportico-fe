// ============================================================================
// Vietnamese error presentation for the social surfaces.
//
// Resolution order:
//   1. (code, HTTP status) pair  — for codes that mean different things by status
//   2. code                      — the common case
//   3. validation `details[]`    — surfaced verbatim, never swallowed
//   4. backend message           — only when it already reads as Vietnamese
//   5. status fallback
//
// Rule 1 exists because REPORT_NOT_FOUND, COMMUNITY_APPLICATION_NOT_ALLOWED and
// CHAT_NOT_ALLOWED are each reused for several distinct situations; switching on
// `code` alone would show the wrong sentence roughly half the time.
// ============================================================================

import { ApiResultError } from "@/lib/api-result";

// ---------------------------------------------------------------------------
// (code, status) → message. Checked before the code-only table.
// ---------------------------------------------------------------------------

const CODE_STATUS_MESSAGES: Record<string, Record<number, string>> = {
  REPORT_NOT_FOUND: {
    // Creating a report against something that no longer exists.
    400: "Nội dung bạn muốn báo cáo không còn tồn tại.",
    404: "Không tìm thấy báo cáo này. Có thể báo cáo đã được xử lý.",
    409: "Báo cáo này đã được xử lý bởi quản trị viên khác.",
  },
  COMMUNITY_APPLICATION_NOT_ALLOWED: {
    400: "Bài đăng này không nhận đăng ký tham gia.",
    403: "Bạn không thể đăng ký tham gia bài đăng của chính mình.",
    404: "Không tìm thấy đơn đăng ký.",
    409: "Bạn đã đăng ký bài đăng này trước đó. Không thể đăng ký lại.",
  },
  CHAT_NOT_ALLOWED: {
    400: "Không thể bắt đầu cuộc trò chuyện này.",
    403: "Bạn không có quyền nhắn tin trong cuộc trò chuyện này.",
    409: "Cuộc trò chuyện đang ở trạng thái không cho phép gửi tin nhắn.",
  },
};

// ---------------------------------------------------------------------------
// code → message
// ---------------------------------------------------------------------------

export const SOCIAL_ERROR_MESSAGES_VI: Record<string, string> = {
  // ---- Voucher -----------------------------------------------------------
  VOUCHER_NOT_FOUND: "Mã giảm giá không tồn tại.",
  VOUCHER_CODE_INVALID: "Mã giảm giá không hợp lệ.",
  VOUCHER_CAMPAIGN_NOT_FOUND: "Không tìm thấy chương trình khuyến mãi.",
  VOUCHER_NOT_ACTIVE: "Mã giảm giá chưa được kích hoạt.",
  VOUCHER_PAUSED: "Mã giảm giá đang tạm dừng.",
  VOUCHER_EXPIRED: "Mã giảm giá đã hết hạn.",
  VOUCHER_NOT_STARTED: "Mã giảm giá chưa đến thời gian sử dụng.",
  VOUCHER_USAGE_LIMIT_REACHED: "Mã giảm giá đã hết lượt sử dụng.",
  VOUCHER_LEARNER_LIMIT_REACHED: "Bạn đã dùng hết số lượt cho mã này.",
  VOUCHER_BUDGET_EXCEEDED: "Mã giảm giá đã hết ngân sách.",
  VOUCHER_MIN_ORDER_NOT_MET: "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.",
  VOUCHER_CODE_ALREADY_EXISTS: "Mã giảm giá này đã tồn tại.",
  VOUCHER_CAMPAIGN_HAS_REDEMPTIONS:
    "Chương trình đã phát sinh lượt sử dụng — không thể sửa các thiết lập giảm giá.",
  VOUCHER_CAMPAIGN_INVALID_STATUS:
    "Trạng thái chương trình không cho phép thao tác này.",
  VOUCHER_CAMPAIGN_ENDED: "Chương trình đã kết thúc và không thể thay đổi.",

  // ---- Checkout / payment ------------------------------------------------
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  PAYMENT_ALREADY_PROCESSED: "Giao dịch này đã được xử lý.",
  BOOKING_NOT_FOUND: "Không tìm thấy đơn đăng ký gói tập.",
  TRAINING_PACKAGE_NOT_FOUND: "Không tìm thấy gói tập.",
  TRAINING_PACKAGE_NOT_PUBLISHED: "Gói tập này chưa được mở bán.",

  // ---- Community post ----------------------------------------------------
  COMMUNITY_POST_NOT_FOUND: "Không tìm thấy bài đăng.",
  COMMUNITY_POST_NOT_OWNED: "Bạn chỉ có thể chỉnh sửa bài đăng của chính mình.",
  COMMUNITY_POST_INVALID_STATUS:
    "Trạng thái bài đăng không cho phép thao tác này.",
  COMMUNITY_POST_CLOSED: "Bài đăng đã đóng.",
  COMMUNITY_POST_EXPIRED: "Bài đăng đã hết hạn.",
  COMMUNITY_POST_FULL: "Bài đăng đã đủ số người tham gia.",
  COMMUNITY_POST_COMMENTS_DISABLED: "Bài đăng này đã tắt bình luận.",
  COMMUNITY_MEDIA_LIMIT_EXCEEDED: "Vượt quá số lượng ảnh/video cho phép.",
  COMMUNITY_MEDIA_INVALID: "Ảnh hoặc video không hợp lệ.",

  // ---- Comment -----------------------------------------------------------
  COMMUNITY_COMMENT_NOT_FOUND: "Không tìm thấy bình luận.",
  COMMUNITY_COMMENT_NOT_OWNED: "Bạn chỉ có thể sửa bình luận của chính mình.",
  COMMUNITY_COMMENT_DELETED: "Bình luận này đã bị xoá.",
  COMMUNITY_REPLY_DEPTH_EXCEEDED: "Chỉ hỗ trợ trả lời một cấp.",

  // ---- Application -------------------------------------------------------
  COMMUNITY_APPLICATION_NOT_FOUND: "Không tìm thấy đơn đăng ký.",
  COMMUNITY_APPLICATION_ALREADY_EXISTS: "Bạn đã đăng ký bài đăng này.",
  COMMUNITY_APPLICATION_INVALID_STATUS:
    "Trạng thái đơn đăng ký không cho phép thao tác này.",

  // ---- Chat --------------------------------------------------------------
  CHAT_ROOM_NOT_FOUND: "Không tìm thấy cuộc trò chuyện.",
  CHAT_ROOM_REJECTED: "Cuộc trò chuyện đã bị từ chối và chỉ có thể xem lại.",
  CHAT_ROOM_PENDING: "Cuộc trò chuyện đang chờ được chấp nhận.",
  CHAT_ROOM_ALREADY_ACCEPTED: "Cuộc trò chuyện đã được chấp nhận.",
  CHAT_NOT_REQUEST_RECEIVER: "Chỉ người nhận mới có thể phản hồi lời mời này.",
  CHAT_USER_BLOCKED: "Không thể gửi tin nhắn — một trong hai bên đã chặn người còn lại.",
  CHAT_MESSAGE_EMPTY: "Tin nhắn phải có nội dung hoặc ít nhất một tệp đính kèm.",
  CHAT_ATTACHMENT_LIMIT_EXCEEDED: "Tối đa 5 tệp đính kèm cho mỗi tin nhắn.",

  // ---- Block -------------------------------------------------------------
  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  USER_BLOCK_SELF: "Bạn không thể tự chặn chính mình.",
  USER_ALREADY_BLOCKED: "Bạn đã chặn người dùng này.",
  USER_NOT_BLOCKED: "Bạn chưa chặn người dùng này.",

  // ---- Report ------------------------------------------------------------
  REPORT_ALREADY_EXISTS: "Bạn đã báo cáo nội dung này rồi.",
  REPORT_ALREADY_RESOLVED: "Báo cáo này đã được xử lý.",
  REPORT_INVALID_ACTION: "Hành động xử lý không phù hợp với loại nội dung.",

  // ---- Shared ------------------------------------------------------------
  CONCURRENCY_CONFLICT:
    "Dữ liệu vừa được thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.",
  VALIDATION_ERROR: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  COMMON_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  COMMON_ACCOUNT_NOT_ACTIVE: "Tài khoản chưa được kích hoạt. Vui lòng xác minh email.",
};

const STATUS_FALLBACK: Record<number, string> = {
  0: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  400: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.",
  422: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  429: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  500: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Máy chủ không phản hồi. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
};

const VI_DIACRITICS =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

/** Normalised view of any thrown API failure. */
export interface SocialError {
  code?: string;
  message: string;
  type?: string;
  status?: number;
  details: string[];
}

function toApiResultError(err: unknown): ApiResultError | null {
  return err instanceof ApiResultError ? err : null;
}

/** Normalise anything thrown by the API layer into a {@link SocialError}. */
export function toSocialError(err: unknown): SocialError {
  const api = toApiResultError(err);
  if (api) {
    return {
      code: api.code,
      message: messageForError(err),
      type: api.type,
      status: api.status,
      details: api.details ?? [],
    };
  }
  return {
    message: messageForError(err),
    details: [],
  };
}

/** The single Vietnamese sentence to show the user for a failed request. */
export function messageForError(err: unknown): string {
  const api = toApiResultError(err);

  if (api) {
    const status = api.status;

    // 1. (code, status) — codes whose meaning depends on the HTTP status.
    if (api.code && status !== undefined) {
      const byStatus = CODE_STATUS_MESSAGES[api.code];
      const hit = byStatus?.[status];
      if (hit) return hit;
    }

    // 2. code
    if (api.code) {
      const hit = SOCIAL_ERROR_MESSAGES_VI[api.code];
      if (hit) return hit;
    }

    // 3. validation details — never drop them behind "Invalid request data".
    if (api.details && api.details.length > 0) {
      return api.details.join(" ");
    }

    // 4. the backend's own message, but only if it is already Vietnamese.
    if (api.message && VI_DIACRITICS.test(api.message)) return api.message;

    // 5. status fallback
    if (status !== undefined && STATUS_FALLBACK[status]) {
      return STATUS_FALLBACK[status];
    }
    if (status !== undefined && status >= 500) return STATUS_FALLBACK[500];
  }

  if (err instanceof Error && VI_DIACRITICS.test(err.message)) return err.message;
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

/**
 * Validation `details[]` split into per-field messages plus the leftovers.
 *
 * The backend emits FluentValidation strings like `"Title: Bắt buộc"` or
 * `"Title must not be empty."`; anything we cannot attribute to a field is
 * returned in `general` so the caller can show it in an alert instead of
 * silently discarding it.
 */
export function fieldErrorsFromDetails(
  details: string[],
  knownFields: readonly string[],
): { fields: Record<string, string>; general: string[] } {
  const fields: Record<string, string> = {};
  const general: string[] = [];

  for (const detail of details) {
    const lower = detail.toLowerCase();
    const match = knownFields.find((f) => {
      const fl = f.toLowerCase();
      return (
        lower.startsWith(`${fl}:`) ||
        lower.startsWith(`${fl} `) ||
        lower.startsWith(`'${fl}'`)
      );
    });
    if (match && !fields[match]) {
      fields[match] = detail.replace(/^['"]?[A-Za-z]+['"]?\s*:\s*/, "").trim() || detail;
    } else {
      general.push(detail);
    }
  }

  return { fields, general };
}

/**
 * Conflicts the user must resolve by re-reading fresh data — never auto-retried.
 * Callers refetch the affected queries and let the user decide what to do next.
 */
export function isConcurrencyError(err: unknown): boolean {
  const api = toApiResultError(err);
  if (!api) return false;
  return (
    api.code === "CONCURRENCY_CONFLICT" ||
    api.code === "COMMUNITY_POST_FULL" ||
    api.status === 409
  );
}

/** 403 CHAT_USER_BLOCKED — the composer must lock after this. */
export function isChatBlockedError(err: unknown): boolean {
  const api = toApiResultError(err);
  return api?.code === "CHAT_USER_BLOCKED" && api.status === 403;
}
