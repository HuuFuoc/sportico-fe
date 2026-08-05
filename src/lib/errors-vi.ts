// ============================================================================
// Vietnamese error mapping for the coach / training-package flow.
//
// Backend failures surface as {@link ApiResultError} (see api-result.ts) with a
// machine `code` (e.g. COACH_PROFILE_ALREADY_EXISTS). `messageForApiError`
// resolves the most user-friendly Vietnamese copy available, in priority order:
//
//   1. A known backend `code` → curated Vietnamese sentence.
//   2. Validation details from the backend (FluentValidation / model state).
//   3. The backend's own message, when present.
//   4. A sensible status/network fallback.
//
// Legacy posting-package / CoachPackage purchase error codes are intentionally
// NOT mapped here — that flow is out of scope for the current frontend.
// ============================================================================

import { ApiResultError } from "@/lib/api-result";

/** Curated backend-code → Vietnamese message map. */
export const ERROR_MESSAGES_VI: Record<string, string> = {
  // Coach profile
  COACH_PROFILE_ALREADY_EXISTS: "Bạn đã có hồ sơ huấn luyện viên.",
  COACH_PROFILE_REQUIRED: "Bạn cần đăng ký hồ sơ huấn luyện viên trước.",
  COACH_PROFILE_NOT_FOUND: "Không tìm thấy hồ sơ huấn luyện viên.",
  // Coach media
  COACH_PROFILE_MEDIA_NOT_FOUND: "Không tìm thấy media.",
  COACH_PROFILE_MEDIA_NOT_OWNED: "Bạn chỉ có thể quản lý media của chính mình.",
  COACH_PROFILE_MEDIA_INVALID_TYPE: "Loại media không hợp lệ.",
  // Account / auth
  COMMON_ACCOUNT_NOT_ACTIVE: "Vui lòng xác minh email trước.",
  AUTH_ACCOUNT_INACTIVE: "Vui lòng xác minh email trước.",
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  AUTH_INVALID_REFRESH_TOKEN: "Phiên đã hết hạn. Vui lòng đăng nhập lại.",
  AUTH_REFRESH_TOKEN_EXPIRED: "Phiên đã hết hạn. Vui lòng đăng nhập lại.",
  COMMON_FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  // Sport
  SPORT_INVALID: "Môn thể thao không hợp lệ.",
  SPORT_NOT_FOUND: "Không tìm thấy môn thể thao.",
  // Training package
  TRAINING_PACKAGE_NOT_FOUND: "Không tìm thấy gói tập.",
  TRAINING_PACKAGE_NOT_OWNED: "Bạn chỉ có thể quản lý gói tập của chính mình.",
  INVALID_TRAINING_PACKAGE_STATUS: "Trạng thái gói tập không cho phép cập nhật.",
  TRAINING_PACKAGE_NOT_PUBLISHED: "Gói tập chưa được xuất bản.",
  // Optimistic concurrency: the record changed (e.g. a learner booked into a
  // session) between when the form loaded and when it was saved. Never
  // auto-retry — the caller must refetch fresh data first.
  CONCURRENCY_CONFLICT: "Dữ liệu gói tập vừa được thay đổi (có thể do học viên vừa đặt lịch). Vui lòng tải lại và thử lưu lại.",
  // Booking / session scheduling
  BOOKING_NOT_FOUND: "Không tìm thấy gói đặt lịch.",
  BOOKING_NOT_ACTIVE: "Gói tập đã hết hạn hoặc chưa được kích hoạt.",
  BOOKING_EXPIRED: "Gói tập đã hết hạn.",
  SESSION_LIMIT_EXCEEDED: "Gói tập này đã hết số buổi có thể đặt. Vui lòng kiểm tra lại gói tập hoặc mua gói mới.",
  SCHEDULE_CONFLICT: "Khung giờ này vừa được đặt. Vui lòng chọn khung giờ khác.",
  ScheduleConflict: "Khung giờ này vừa được đặt. Vui lòng chọn khung giờ khác.",
  SLOT_NOT_AVAILABLE: "Khung giờ này không còn trống. Vui lòng chọn khung giờ khác.",
  SLOT_NOT_FOUND: "Không tìm thấy khung giờ.",
  WRONG_COACH_SLOT: "Khung giờ này không thuộc huấn luyện viên trong gói của bạn.",
  SESSION_NOT_FOUND: "Không tìm thấy buổi tập.",
  SESSION_ALREADY_CONFIRMED: "Buổi tập này đã được xác nhận.",
  SESSION_ALREADY_CANCELLED: "Buổi tập này đã bị huỷ.",
  SESSION_ALREADY_COMPLETED: "Buổi tập này đã hoàn thành.",
  SESSION_NOT_SCHEDULED: "Buổi tập chưa được xác nhận — không thể hoàn thành.",
  // Payment / purchase
  MANUAL_PURCHASE_DISABLED: "Thanh toán thử đã bị tắt. Vui lòng dùng PayOS.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  // Withdrawal
  WITHDRAWAL_INSUFFICIENT_BALANCE: "Số dư ví không đủ để rút.",
  WITHDRAWAL_AMOUNT_TOO_SMALL: "Số tiền rút tối thiểu chưa đạt.",
  WITHDRAWAL_PENDING_EXISTS: "Bạn đang có yêu cầu rút tiền chờ xử lý.",
  WITHDRAWAL_REQUEST_NOT_FOUND: "Không tìm thấy yêu cầu rút tiền.",
  INSUFFICIENT_WALLET_BALANCE: "Số dư khả dụng không đủ để thực hiện yêu cầu.",
  INVALID_WITHDRAWAL_STATUS: "Trạng thái yêu cầu rút tiền không hợp lệ cho thao tác này.",
  PAYOUT_ALREADY_PROCESSING: "PayOS đang xử lý giao dịch này. Vui lòng cập nhật trạng thái trước khi thao tác tiếp.",
  PAYOUT_ALREADY_PAID: "Yêu cầu rút tiền này đã được thanh toán.",
  PAYOUT_NOT_FOUND: "Không tìm thấy yêu cầu rút tiền.",
  PAYOUT_REFRESH_FAILED: "Không thể làm mới trạng thái chuyển khoản. Vui lòng thử lại.",
  PAYOUT_STATUS_REFRESH_REQUIRED: "Vui lòng cập nhật trạng thái PayOS trước khi thao tác tiếp.",
  // Payout account
  PAYOUT_ACCOUNT_REQUIRED:
    "Tài khoản nhận tiền chưa được xác minh. Vui lòng chờ quản trị viên duyệt trước khi rút.",
  PAYOUT_ACCOUNT_NOT_FOUND: "Bạn chưa thêm tài khoản nhận tiền.",
  PAYOUT_ACCOUNT_NOT_VERIFIED:
    "Tài khoản nhận tiền đang chờ duyệt. Bạn có thể rút tiền sau khi được xác minh.",
  INVALID_BANK_BIN: "Mã BIN ngân hàng không hợp lệ (phải đủ 6 chữ số).",
  // Reviews
  REVIEW_NOT_FOUND: "Không tìm thấy đánh giá.",
  REVIEW_NOT_ALLOWED: "Bạn cần có gói tập đã thanh toán với coach này để đánh giá, hoặc không được tự đánh giá chính mình.",
  REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá coach này. Hãy chỉnh sửa đánh giá hiện tại.",
  REVIEW_EDIT_EXPIRED: "Gói tập đã hết hạn. Không thể chỉnh sửa đánh giá.",
  REVIEW_NOT_OWNED: "Bạn không có quyền sửa hoặc xoá đánh giá này.",
  REVIEW_REPORT_NOT_ALLOWED: "Bạn chỉ có thể báo cáo đánh giá thuộc hồ sơ coach của mình.",
  // Common
  COMMON_VALIDATION_ERROR: "Thông tin chưa hợp lệ.",
  COMMON_INTERNAL_SERVER_ERROR: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  MOCK_MODE:
    "Tính năng huấn luyện viên cần kết nối đến backend thật (đặt NEXT_PUBLIC_API_BASE_URL).",
};

/**
 * Resolve the best Vietnamese message for any error thrown by the coach flow.
 * Always returns a non-empty, user-presentable string.
 *
 * Handles both `ApiResultError` (older coach flow) and the newer `ApiError`
 * from `api-client.ts` whose `body` carries the backend `Result<T>` envelope
 * with an `error.code` field.
 */
export function messageForApiError(err: unknown): string {
  // 1. Newer ApiError from apiFetch / unwrap.
  if (err instanceof Error && err.name === "ApiError") {
    const raw = (err as { body?: unknown }).body;
    // `body` may be EITHER the full Result envelope `{ error: { code, … } }`
    // (thrown by apiFetch on a non-2xx response) OR the flat error object
    // `{ code, message, details }` (thrown by unwrap on isSuccess=false).
    let e: { code?: string; message?: string; details?: string[] } | undefined;
    if (raw && typeof raw === "object") {
      const env = raw as { error?: unknown };
      e =
        env.error && typeof env.error === "object"
          ? (env.error as typeof e)
          : (raw as typeof e);
    }
    if (e?.code && ERROR_MESSAGES_VI[e.code]) return ERROR_MESSAGES_VI[e.code];
    if (e?.code === "COMMON_VALIDATION_ERROR" && e?.details?.length) return e.details[0];
    if (e?.message && e.message.trim()) return e.message.trim();
  }

  if (err instanceof ApiResultError) {
    // 2. Known backend code.
    if (err.code && ERROR_MESSAGES_VI[err.code]) {
      return ERROR_MESSAGES_VI[err.code];
    }
    // 3. Validation details (show the first concrete rule message).
    if (err.code === "COMMON_VALIDATION_ERROR" && err.details?.length) {
      return err.details[0];
    }
    // 4. Backend's own message, when meaningful.
    if (err.message && err.message.trim().length > 0) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

/** All validation detail lines, if the error carries them (for inline display). */
export function validationDetails(err: unknown): string[] {
  return err instanceof ApiResultError ? (err.details ?? []) : [];
}

/**
 * Lightweight variant for session / booking components that catch plain `Error`
 * thrown by `apiFetch`. Reads the `body` of ApiError first (contains the
 * backend's JSON error envelope with `code`), then falls back to scanning the
 * message string.
 */
export function sessionErrorMessage(err: unknown, fallback = "Thao tác thất bại. Vui lòng thử lại."): string {
  // 1. ApiError from apiFetch: body contains { error: { code } } or { code }.
  if (err instanceof Error && err.name === "ApiError") {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === "object") {
      const envelope = body as { error?: { code?: string; message?: string }; code?: string; message?: string };
      const e = envelope.error ?? envelope;
      if (e.code && ERROR_MESSAGES_VI[e.code]) return ERROR_MESSAGES_VI[e.code];
      // HTTP 409 without a code → generic conflict message
      const status = (err as { status?: number }).status;
      if (!e.code && status === 409) return "Khung giờ hoặc gói tập đang xảy ra xung đột. Vui lòng thử lại.";
      if (e.message?.trim()) return e.message.trim();
    }
    // HTTP 409 fallback when body could not be parsed
    const status = (err as { status?: number }).status;
    if (status === 409) return "Khung giờ hoặc gói tập đang xảy ra xung đột. Vui lòng thử lại.";
  }

  // 2. Scan the raw message for known backend error code patterns.
  const raw = err instanceof Error ? err.message : String(err);
  for (const [code, msg] of Object.entries(ERROR_MESSAGES_VI)) {
    if (raw.toLowerCase().includes(code.toLowerCase())) return msg;
  }

  // 3. Raw message or fallback.
  return raw.trim() || fallback;
}
