// ============================================================================
// Centralized Vietnamese copy for Google / account auth failures.
//
// TWO distinct entry points — do not collapse them:
//
//   • `googleAuthMessage(code, status)` — lookup that returns `undefined` for
//     unknown codes so the caller can fall back to the backend's own message.
//     Used by `auth-api.ts` when shaping an {@link AuthError}.
//
//   • `getAuthErrorMessage(code, status)` — ALWAYS returns a sentence. Used by
//     the redirect callback page, which receives a bare stable error code in
//     `?error=` and has no ApiException to read. It must never be built by
//     faking an error object (`Object.assign(new Error(code), …)`): such an
//     object is not an instance of any of our error classes, so every
//     `instanceof` branch downstream silently misses it.
// ============================================================================

export const GOOGLE_AUTH_MESSAGES: Record<string, string> = {
  AUTH_GOOGLE_INVALID_TOKEN: "Đăng nhập Google thất bại. Vui lòng thử lại.",
  AUTH_GOOGLE_EMAIL_NOT_VERIFIED: "Email Google của bạn chưa được xác minh.",
  AUTH_GOOGLE_ACCOUNT_CONFLICT:
    "Tài khoản này đã liên kết với một tài khoản Google khác.",
  AUTH_GOOGLE_LOGIN_FAILED:
    "Đăng nhập Google không thành công. Vui lòng thử lại.",
  AUTH_GOOGLE_CONFIGURATION_MISSING:
    "Đăng nhập Google hiện chưa khả dụng. Vui lòng dùng email và mật khẩu.",
  AUTH_GOOGLE_EXTERNAL_PRINCIPAL_INVALID:
    "Phiên đăng nhập Google đã hết hiệu lực. Vui lòng thử lại.",
  AUTH_GOOGLE_EXCHANGE_CODE_INVALID:
    "Liên kết đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  AUTH_GOOGLE_EXCHANGE_CODE_EXPIRED:
    "Liên kết đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  AUTH_GOOGLE_EXCHANGE_CODE_ALREADY_USED:
    "Liên kết đăng nhập đã được sử dụng. Vui lòng đăng nhập lại.",
  COMMON_ACCOUNT_NOT_ACTIVE:
    "Tài khoản của bạn chưa hoạt động hoặc đã bị khóa.",
  COMMON_VALIDATION_ERROR: "Dữ liệu đăng nhập không hợp lệ.",
};

/** The one code that means "the platform has no Google credentials configured". */
export const GOOGLE_UNAVAILABLE_CODE = "AUTH_GOOGLE_CONFIGURATION_MISSING";

/**
 * True when the failure means Google sign-in is unusable for this session, so
 * the UI should hide the Google option rather than invite a pointless retry.
 */
export function isGoogleUnavailable(
  code: string | undefined,
  status: number | undefined,
): boolean {
  return code === GOOGLE_UNAVAILABLE_CODE || status === 503;
}

/**
 * Vietnamese copy for a known auth error code, or `undefined` when the code is
 * unknown (caller should fall back to the backend message).
 *
 * `COMMON_ACCOUNT_NOT_ACTIVE` is split by HTTP status when one is available:
 * 403 means the account was disabled, 401 means it was never activated.
 */
export function googleAuthMessage(
  code: string | undefined,
  status?: number,
): string | undefined {
  if (!code) return undefined;
  if (code === "COMMON_ACCOUNT_NOT_ACTIVE") {
    if (status === 403) return "Tài khoản của bạn đã bị khóa.";
    if (status === 401) return "Tài khoản của bạn chưa được kích hoạt.";
  }
  return GOOGLE_AUTH_MESSAGES[code];
}

/**
 * Total mapping for a stable error code arriving in a redirect query string.
 * Never throws, never returns an empty string, and never echoes a raw code at
 * the user.
 */
export function getAuthErrorMessage(
  code: string | null | undefined,
  status?: number,
): string {
  return (
    googleAuthMessage(code ?? undefined, status) ??
    "Đăng nhập Google không thành công. Vui lòng thử lại."
  );
}
