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
//   Me       : GET  /api/auth/me (Bearer)              → Result<CurrentUser>
//              The authoritative source of the user's roles + profiles (the JWT
//              roles are fixed at issue time, so /me is re-read after refresh).
//   Google   : POST /api/auth/google          { idToken }  → Result<LoginResponse>
//              POST /api/auth/google/exchange { code }     → Result<LoginResponse>
//              GET  /api/auth/google  → 302 to Google (browser navigation only)
//              Google credentials are single-use: they buy a Sportico token set
//              and are never stored, logged, or replayed as a Bearer token.
//
// There is NO logout endpoint — logout is client-side (discard tokens). Tokens
// are Bearer, stored via auth-token.ts and replayed by apiFetch.
//
// MOCK MODE (env unset): login/register resolve a demo success so the app stays
// navigable. LIVE MODE: real apiFetch calls only — never a fake success.
// ============================================================================

import {
  apiFetch,
  ApiError,
  isMockMode,
  API_BASE_URL,
  type ApiFetchOptions,
} from "@/lib/api-client";
import { endpoints } from "@/lib/api-endpoints";
import { backendEndpoints } from "@/lib/backend/endpoints";
import {
  setAuthTokens,
  clearAuthTokens,
  getRefreshToken,
  getAuthEmail,
} from "@/lib/auth-token";
import { googleAuthMessage } from "@/lib/auth-error-messages";
import type { CurrentUserResponse } from "@/lib/types/coach";

// ---- Envelope + payload types ----------------------------------------------

export interface Result<T = unknown> {
  isSuccess: boolean;
  message?: string;
  errorCode?: string;
  /** Backend validation lines. NULLABLE on the wire — never index it blind. */
  details?: string[];
  data?: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Backend `LoginResponse`. Structurally identical to {@link AuthTokens}, which
 * predates it — aliased rather than duplicated so there is exactly one shape.
 * Returned by password login, Google ID-token login and code exchange alike.
 */
export type LoginResponse = AuthTokens;

/** POST /api/auth/google — the ONLY field the backend accepts. */
export interface GoogleIdTokenLoginRequest {
  idToken: string;
}

/** POST /api/auth/google/exchange. */
export interface GoogleExchangeCodeRequest {
  code: string;
}

/** POST /api/auth/refresh-token — the email is required alongside the token. */
export interface RefreshTokenRequest {
  email: string;
  refreshToken: string;
}

/** Rotated token set: BOTH tokens and the expiry are replaced. */
export type RefreshTokenResponse = AuthTokens;

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

/** A user-presentable auth failure. Pages render `.message`; `.errorCode` is the
 *  backend code (e.g. AUTH_INVALID_CREDENTIALS) for finer handling, and
 *  `.status` the HTTP status when one is known (0 for transport failures,
 *  undefined when the failure never reached the network). */
export class AuthError extends Error {
  readonly errorCode?: string;
  readonly status?: number;
  constructor(message: string, errorCode?: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.errorCode = errorCode;
    this.status = status;
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

// ---- Google sign-in --------------------------------------------------------

/**
 * Exchange a Google Identity Services ID token for a Sportico token set.
 *
 * The returned tokens are deliberately NOT persisted here: the session is only
 * completed once GET /api/auth/me confirms it (see `useGoogleLogin`), so a
 * half-authenticated UI state is impossible.
 *
 * `omitAuth` matters twice over: it stops a stale Bearer token being replayed
 * onto a login call, and it stops a 401 from this endpoint being mistaken for
 * an expired session — refreshing a token we do not have yet is meaningless,
 * and the interceptor would bounce the user to /login mid-login.
 */
export async function googleIdTokenLogin(
  idToken: string,
): Promise<LoginResponse> {
  if (isMockMode()) {
    throw new AuthError("Đăng nhập Google cần kết nối đến backend thật.");
  }
  const body: GoogleIdTokenLoginRequest = { idToken };
  const result = await request<LoginResponse>(endpoints.auth.google, {
    method: "POST",
    body: JSON.stringify(body),
    omitAuth: true,
  });
  return requireTokens(result, "Đăng nhập Google không thành công. Vui lòng thử lại.");
}

/**
 * Exchange the one-time code from the redirect callback for a Sportico token
 * set. The code is single-use and short-lived (~90s) — never retried, never
 * stored, never logged.
 */
export async function googleExchangeCode(
  code: string,
): Promise<LoginResponse> {
  if (isMockMode()) {
    throw new AuthError("Đăng nhập Google cần kết nối đến backend thật.");
  }
  const body: GoogleExchangeCodeRequest = { code };
  const result = await request<LoginResponse>(endpoints.auth.googleExchange, {
    method: "POST",
    body: JSON.stringify(body),
    omitAuth: true,
  });
  return requireTokens(result, "Liên kết đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
}

/**
 * Start the redirect OAuth fallback. GET /api/auth/google answers 302 to
 * Google's consent screen, so it has to be a real browser navigation —
 * fetch()/apiFetch would follow the redirect in JS and throw away the
 * navigation the OAuth handshake depends on.
 */
export function startGoogleRedirectLogin(): void {
  if (typeof window === "undefined") return;
  window.location.assign(`${googleRedirectBase()}${endpoints.auth.google}`);
}

/**
 * Origin to navigate to when STARTING the redirect flow — deliberately not the
 * same-origin `/api-proxy` prefix the XHR calls use.
 *
 * The backend's OAuth challenge sets an anti-forgery correlation cookie scoped
 * to `/api/auth/google/callback` on the BACKEND host, and Google sends the user
 * straight back to that host. Routed through the Next rewrite the browser would
 * instead attach that cookie to the FRONTEND host, and the handshake would fail
 * with a correlation error before any code is ever issued.
 *
 * Falls back to API_BASE_URL, which is already right whenever the base URL is
 * an absolute backend origin rather than a proxy prefix.
 */
function googleRedirectBase(): string {
  const origin = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "")
    .trim()
    .replace(/\/+$/, "");
  return origin || API_BASE_URL;
}

/** Shared success check for both Google entry points. */
function requireTokens(
  result: Result<LoginResponse>,
  fallback: string,
): LoginResponse {
  if (!result.isSuccess || !result.data?.accessToken) {
    throw new AuthError(
      googleAuthMessage(result.errorCode) ??
        result.details?.[0] ??
        result.message ??
        fallback,
      result.errorCode,
    );
  }
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
        "Xác minh email thất bại.",
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
 * Wired into apiFetch's 401 interceptor by AuthBootstrap. `omitAuth` is
 * REQUIRED on the call below: this endpoint authenticates from the body, and
 * without it a 401 here would re-enter the interceptor, which would await the
 * very refresh promise it is running inside — a deadlock, not a retry.
 */
export async function refreshTokens(): Promise<RefreshTokenResponse> {
  if (isMockMode()) {
    throw new AuthError("Làm mới phiên không khả dụng ở chế độ mock.");
  }
  const email = getAuthEmail();
  const refreshToken = getRefreshToken();
  if (!email || !refreshToken) {
    clearAuthTokens();
    throw new AuthError("Phiên đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const body: RefreshTokenRequest = { email, refreshToken };
  let result: Result<RefreshTokenResponse>;
  try {
    result = await request<RefreshTokenResponse>(endpoints.auth.refreshToken, {
      method: "POST",
      body: JSON.stringify(body),
      omitAuth: true,
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
        "Phiên đã hết hạn. Vui lòng đăng nhập lại.",
      result.errorCode,
    );
  }

  setAuthTokens({ ...result.data, email });
  return result.data;
}

// ---- Current user (GET /api/auth/me) ---------------------------------------

/**
 * Fetch the authenticated user with their backend-sourced roles + profiles.
 * This is the AUTHORITATIVE role source (the access-token JWT bakes roles at
 * issue time, so it can be stale right after coach registration — call this
 * after a token refresh to observe the freshly-granted coach role).
 *
 * Throws {@link AuthError} on any failure (no token, 401, mock mode, network).
 */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  if (isMockMode()) {
    throw new AuthError("Thông tin người dùng cần backend thật.");
  }
  const result = await request<CurrentUserResponse>(endpoints.auth.me, {
    method: "GET",
    // Suppress auto-redirect: a 401 here (e.g. during the login post-flow)
    // must not discard the just-issued tokens and loop back to /login.
    suppressAuthRedirect: true,
  });
  if (!result.isSuccess || !result.data) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Không tải được thông tin người dùng.",
      result.errorCode,
    );
  }
  return result.data;
}

// ---- Resend verification email ---------------------------------------------

/**
 * Request a new email verification link for an unverified account.
 * Safe to call from the post-register screen or the login "resend" prompt.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  if (isMockMode()) return;

  const result = await request(backendEndpoints.auth.resendVerification, {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!result.isSuccess) {
    throw new AuthError(
      messageForCode(result.errorCode) ??
        result.message ??
        "Không gửi được email xác minh. Vui lòng thử lại.",
      result.errorCode,
    );
  }
}

// ---- Logout (client-side only) ---------------------------------------------

/** Sign out. No backend endpoint exists — just discard the tokens. */
export function logout(): void {
  clearAuthTokens();
}

// ---- Mock-mode session -----------------------------------------------------

async function mockLogin(payload: LoginPayload): Promise<AuthTokens> {
  // Mirrors the documented demo test path (see CLAUDE.md §7).
  if (payload.email.trim().toLowerCase() === "wrong@example.com") {
    throw new AuthError("Email hoặc mật khẩu không đúng.");
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
  init: ApiFetchOptions,
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
    details: error ? pickStringArray(error.details) : undefined,
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
    // `details` is nullable on the wire — only the first line is shown, and
    // only after confirming the array actually has one.
    const detail = error ? pickStringArray(error.details)?.[0] : undefined;
    if (err.status === 0) {
      return new AuthError(
        "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
        code,
        0,
      );
    }
    return new AuthError(
      messageForCode(code, err.status) ??
        detail ??
        serverMsg ??
        defaultForStatus(err.status),
      code,
      err.status,
    );
  }
  return new AuthError("Đã xảy ra lỗi. Vui lòng thử lại.");
}

/** Map a backend errorCode to friendly copy. Returns undefined for codes that
 *  should defer to the backend's own message (e.g. validation errors). */
function messageForCode(
  code: string | undefined,
  status?: number,
): string | undefined {
  // AUTH_GOOGLE_* copy lives in one shared map so the button, the redirect
  // callback and this error shaper cannot drift apart. Only that prefix is
  // delegated: the COMMON_* entries in the map are written for the Google
  // surfaces, while password login has better, more specific copy below.
  if (code?.startsWith("AUTH_GOOGLE_")) {
    const google = googleAuthMessage(code, status);
    if (google) return google;
  }

  switch (code) {
    case "AUTH_INVALID_CREDENTIALS":
      // Google-created accounts may have no password at all, but the backend
      // deliberately does not reveal whether an email exists — so hint at the
      // Google button without asserting anything about this address.
      return "Email hoặc mật khẩu không đúng. Nếu trước đây bạn đăng ký bằng Google, hãy thử nút Đăng nhập với Google.";
    case "COMMON_ACCOUNT_NOT_ACTIVE":
      // 403 = disabled by an admin (no amount of email verification helps).
      // 401 / unknown = never activated → point at the resend-verification UI.
      if (status === 403) return "Tài khoản của bạn đã bị khóa.";
      return "Vui lòng xác minh email trước khi đăng nhập.";
    case "USER_EMAIL_ALREADY_EXISTS":
      return "Email này đã được đăng ký.";
    case "AUTH_INVALID_REFRESH_TOKEN":
    case "AUTH_REFRESH_TOKEN_EXPIRED":
      return "Phiên đã hết hạn. Vui lòng đăng nhập lại.";
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
  if (status === 401 || status === 403)
    return "Email hoặc mật khẩu không đúng.";
  if (status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại.";
  return "Yêu cầu thất bại. Vui lòng thử lại.";
}

// ---- Small helpers ---------------------------------------------------------

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** `details` is `string[] | null` on the wire — normalise to a non-empty array
 *  or undefined so callers never index into null. */
function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const lines = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return lines.length > 0 ? lines : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
