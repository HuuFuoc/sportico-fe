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
  // Common
  COMMON_VALIDATION_ERROR: "Thông tin chưa hợp lệ.",
  COMMON_INTERNAL_SERVER_ERROR: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  MOCK_MODE:
    "Tính năng huấn luyện viên cần kết nối đến backend thật (đặt NEXT_PUBLIC_API_BASE_URL).",
};

/**
 * Resolve the best Vietnamese message for any error thrown by the coach flow.
 * Always returns a non-empty, user-presentable string.
 */
export function messageForApiError(err: unknown): string {
  if (err instanceof ApiResultError) {
    // 1. Known backend code.
    if (err.code && ERROR_MESSAGES_VI[err.code]) {
      return ERROR_MESSAGES_VI[err.code];
    }
    // 2. Validation details (show the first concrete rule message).
    if (err.code === "COMMON_VALIDATION_ERROR" && err.details?.length) {
      return err.details[0];
    }
    // 3. Backend's own message, when meaningful.
    if (err.message && err.message.trim().length > 0) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

/** All validation detail lines, if the error carries them (for inline display). */
export function validationDetails(err: unknown): string[] {
  return err instanceof ApiResultError ? (err.details ?? []) : [];
}
