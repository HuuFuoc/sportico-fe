// ============================================================================
// Auth integration layer — the ONLY place auth requests are made.
//
// Wired to the real Sportico backend (routes under /api, base =
// NEXT_PUBLIC_API_BASE_URL). All responses use the `Result` / `Result<T>`
// envelope: { isSuccess, message?, errorCode?, data? }.
//
//   Register : POST /api/auth/register   { email, password, fullName }
//              → Result (no token, inactive user, learner role, verify email)
//   Login    : POST /api/auth/login      { email, password }
//              → Result<{ accessToken, refreshToken, expiresAt }>
//              NOTE: login returns NO user object and NO role.
//   Refresh  : POST /api/auth/refresh-token { email, refreshToken }
//              → Result<{ accessToken, refreshToken, expiresAt }> (rotated)
//   Verify   : GET  /api/auth/verify-email?token=...   → Result
//   Coach    : POST /api/coaches/register (Bearer)     → Result<CoachProfile>
//
// There is NO /me endpoint and NO logout endpoint — do not add them. Logout is
// client-side (discard tokens). Tokens are Bearer, stored via auth-token.ts and
// replayed by apiFetch.
//
// MOCK MODE (env unset): login/register resolve a demo success so the app stays
// navigable. LIVE MODE: real apiFetch calls only — never a fake success.
// ============================================================================

import { apiFetch, ApiError, isMockMode } from "@/lib/api-client";
import { endpoints } from "@/lib/api-endpoints";
import {
  setAuthTokens,
  clearAuthTokens,
  getRefreshToken,
  getAuthEmail,
} from "@/lib/auth-token";

// ---- Envelope + payload types ----------------------------------------------

export interface Result<T = unknown> {
  isSuccess: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface RegisterResult {
  message: string;
}

export interface CoachOnboardingPayload {
  headline: string;
  bio?: string;
  experienceYears: number;
  sportIds: number[];
}

/** A user-presentable auth failure. Pages render `.message`; `.errorCode` is the
 *  backend code (e.g. AUTH_INVALID_CREDENTIALS) for finer handling. */
export class AuthError extends Error {
  readonly errorCode?: string;
  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = "AuthError";
    this.errorCode = errorCode;
  }
}

// ---- Login -----------------------------------------------------------------

/**
 * Authenticate and persist the token set. Returns the tokens on success or
 * throws an {@link AuthError} on failure. Never silently succeeds.
 *
 * NOTE: the backend login response contains NO user object and NO role, and
 * there is no /me endpoint — callers cannot learn the role from this call.
 */
export async function login(payload: LoginPayload): Promise<AuthTokens> {
  if (isMockMode()) return mockLogin(payload);

  const result = await request<AuthTokens>(endpoints.auth.login, {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  if (!result.isSuccess || !result.data?.accessToken) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Đăng nhập thất bại. Vui lòng thử lại.",
      result.errorCode,
    );
  }

  // Persist tokens + email (refresh-token requires the email).
  setAuthTokens({ ...result.data, email: payload.email });
  return result.data;
}

// ---- Register --------------------------------------------------------------

/**
 * Create an account. Backend creates an INACTIVE learner and emails a
 * verification link — it returns NO token and does NOT auto-login. Returns the
 * success message; the caller should prompt the user to verify their email.
 */
export async function register(
  payload: RegisterPayload,
): Promise<RegisterResult> {
  if (isMockMode()) return { message: "Đăng ký thành công" };

  const result = await request(endpoints.auth.register, {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
    }),
  });

  if (!result.isSuccess) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Đăng ký thất bại. Vui lòng thử lại.",
      result.errorCode,
    );
  }
  return { message: result.message ?? "Đăng ký thành công" };
}

// ---- Verify email (kept for future use; no UI yet) -------------------------

/** Confirm an email verification token. Activates the user backend-side. */
export async function verifyEmail(token: string): Promise<RegisterResult> {
  if (isMockMode()) return { message: "Xác minh email thành công" };

  const result = await request(endpoints.auth.verifyEmail(token), {
    method: "GET",
  });

  if (!result.isSuccess) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Xác minh thất bại.",
      result.errorCode,
    );
  }
  return { message: result.message ?? "Xác minh email thành công" };
}

// ---- Refresh token ---------------------------------------------------------

/**
 * Rotate the access + refresh token pair (both are replaced). The backend
 * requires the stored email alongside the refresh token. On ANY failure the
 * tokens are cleared so the user is forced to log in again.
 *
 * TODO(auth): wire this into apiFetch on a 401 to transparently re-auth.
 * Deferred to avoid a circular import (api-client ↔ auth-api); a 401
 * interceptor can live in a thin wrapper that imports both.
 */
export async function refreshTokens(): Promise<AuthTokens> {
  if (isMockMode()) {
    throw new AuthError("Làm mới phiên không khả dụng ở chế độ mock.");
  }
  const email = getAuthEmail();
  const refreshToken = getRefreshToken();
  if (!email || !refreshToken) {
    clearAuthTokens();
    throw new AuthError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  let result: Result<AuthTokens>;
  try {
    result = await request<AuthTokens>(endpoints.auth.refreshToken, {
      method: "POST",
      body: JSON.stringify({ email, refreshToken }),
    });
  } catch (err) {
    clearAuthTokens();
    throw err;
  }

  if (!result.isSuccess || !result.data?.accessToken) {
    clearAuthTokens();
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      result.errorCode,
    );
  }

  setAuthTokens({ ...result.data, email });
  return result.data;
}

// ---- Logout (client-side only) ---------------------------------------------

/** Sign out. No backend endpoint exists — just discard the tokens. */
export function logout(): void {
  clearAuthTokens();
}

// ---- Coach onboarding (future use; not wired to a page) --------------------

/**
 * Promote the authenticated user to coach and create their profile. Requires a
 * valid Bearer token (attached automatically by apiFetch). Not currently wired
 * to any page — there is no coach-onboarding flow yet.
 */
export async function registerCoachProfile(
  payload: CoachOnboardingPayload,
): Promise<Result> {
  if (isMockMode()) {
    throw new AuthError("Đăng ký huấn luyện viên cần API thật.");
  }
  const result = await request(endpoints.coachOnboarding, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!result.isSuccess) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Đăng ký huấn luyện viên thất bại.",
      result.errorCode,
    );
  }
  return result;
}

// ---- Mock-mode session -----------------------------------------------------

async function mockLogin(payload: LoginPayload): Promise<AuthTokens> {
  // Mirrors the documented demo test path (see CLAUDE.md §7).
  if (payload.email.trim().toLowerCase() === "wrong@example.com") {
    throw new AuthError("Sai email hoặc mật khẩu.");
  }
  const tokens: AuthTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  setAuthTokens({ ...tokens, email: payload.email });
  return tokens;
}

// ---- Request + envelope parsing --------------------------------------------

/** Perform an auth request and parse the `Result` envelope, mapping thrown
 *  ApiErrors to AuthErrors. */
async function request<T = unknown>(
  path: string,
  init: RequestInit,
): Promise<Result<T>> {
  try {
    const raw = await apiFetch<unknown>(path, init);
    return asResult<T>(raw);
  } catch (err) {
    throw toAuthError(err);
  }
}

function asResult<T>(raw: unknown): Result<T> {
  if (!isRecord(raw)) return { isSuccess: false };
  // Backend envelope nests the failure under `error: { code, message }`.
  // Fall back to top-level fields so older/alternate shapes still parse.
  const error = isRecord(raw.error) ? raw.error : undefined;
  return {
    isSuccess: raw.isSuccess === true,
    message: (error && pickString(error.message)) ?? pickString(raw.message),
    errorCode: (error && pickString(error.code)) ?? pickString(raw.errorCode),
    data: raw.data as T | undefined,
  };
}

// ---- Error normalization ---------------------------------------------------

function toAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  if (err instanceof ApiError) {
    const body = isRecord(err.body) ? err.body : undefined;
    // Failure envelope: { isSuccess:false, data:null, error:{ code, message } }.
    const error = body && isRecord(body.error) ? body.error : undefined;
    const code =
      (error && pickString(error.code)) ??
      (body ? pickString(body.errorCode) : undefined);
    const serverMsg =
      (error && pickString(error.message)) ??
      (body ? pickString(body.message) : undefined);
    if (err.status === 0) {
      return new AuthError(
        "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
        code,
      );
    }
    return new AuthError(
      messageForCode(code) ?? serverMsg ?? defaultForStatus(err.status),
      code,
    );
  }
  return new AuthError("Đã có lỗi xảy ra. Vui lòng thử lại.");
}

/** Map a backend errorCode to friendly copy. Returns undefined for codes that
 *  should defer to the backend's own message (e.g. validation errors). */
function messageForCode(code: string | undefined): string | undefined {
  switch (code) {
    case "AUTH_INVALID_CREDENTIALS":
      return "Sai email hoặc mật khẩu.";
    case "COMMON_ACCOUNT_NOT_ACTIVE":
      return "Vui lòng xác minh email trước khi đăng nhập.";
    case "USER_EMAIL_ALREADY_EXISTS":
      return "Email này đã được đăng ký.";
    case "AUTH_INVALID_REFRESH_TOKEN":
    case "AUTH_REFRESH_TOKEN_EXPIRED":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case "AUTH_INVALID_VERIFICATION_TOKEN":
      return "Liên kết xác minh không hợp lệ hoặc đã hết hạn.";
    case "COACH_PROFILE_ALREADY_EXISTS":
      return "Bạn đã có hồ sơ huấn luyện viên.";
    default:
      // COMMON_VALIDATION_ERROR, SPORT_INVALID, etc. → show backend message.
      return undefined;
  }
}

function defaultForStatus(status: number): string {
  if (status === 401 || status === 403) return "Sai email hoặc mật khẩu.";
  if (status >= 500) return "Đã có lỗi từ phía máy chủ. Vui lòng thử lại.";
  return "Yêu cầu thất bại. Vui lòng thử lại.";
}

// ---- Small helpers ---------------------------------------------------------

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
