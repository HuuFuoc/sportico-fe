// ============================================================================
// Result<T> envelope caller for the coach/training-package flow.
//
// Sits on top of `apiFetch` (api-client.ts) and unwraps the backend's standard
// `Result<T>` envelope:
//
//   success : { isSuccess: true,  data: T }
//   failure : { isSuccess: false, error: { code, message, type, details? } }
//
// Failures arrive in TWO shapes and BOTH are normalised to {@link ApiResultError}:
//   1. Non-2xx responses → `apiFetch` throws `ApiError` whose `.body` is the
//      failure envelope (the ASP.NET ExceptionMiddleware / ApiBehaviorOptions).
//   2. 2xx responses that still carry `isSuccess: false` (services that return
//      `Result.Failure(...)` without throwing).
//
// Components NEVER call `fetch`/`apiFetch` directly — they call the typed
// functions in coach-api.ts / training-package-api.ts, which delegate here.
// ============================================================================

import { apiFetch, ApiError, isMockMode, type ApiFetchOptions } from "@/lib/api-client";
import type { PagedResult } from "@/lib/backend/dto";

/** Backend `error` object inside a failed `Result<T>`. */
export interface ApiErrorBody {
  code?: string | null;
  message?: string | null;
  type?: string | null;
  details?: string[] | null;
}

/** Normalised, throwable API failure. `code` is the backend error code (e.g.
 *  `COACH_PROFILE_ALREADY_EXISTS`) used for Vietnamese mapping in errors-vi.ts. */
export class ApiResultError extends Error {
  readonly code?: string;
  readonly type?: string;
  readonly details?: string[];
  /** HTTP status (0 for network / transport errors). */
  readonly status?: number;

  constructor(
    message: string,
    opts: {
      code?: string;
      type?: string;
      details?: string[];
      status?: number;
    } = {},
  ) {
    super(message);
    this.name = "ApiResultError";
    this.code = opts.code;
    this.type = opts.type;
    this.details = opts.details;
    this.status = opts.status;
  }
}

interface ResultEnvelope<T> {
  isSuccess?: boolean;
  data?: T | null;
  /** Generic non-typed `Result` uses `message`; `Result<T>` uses `error`. */
  message?: string | null;
  error?: ApiErrorBody | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Pull the failure envelope out of a thrown ApiError / raw body. */
function errorFromBody(body: unknown, status: number): ApiResultError {
  const env = isRecord(body) ? (body as ResultEnvelope<unknown>) : undefined;
  const err: ApiErrorBody | undefined = env?.error ?? undefined;
  const code = (err?.code ?? undefined) || undefined;
  const message =
    (err?.message ?? undefined) ||
    (typeof env?.message === "string" ? env.message : undefined) ||
    undefined;
  return new ApiResultError(message ?? defaultForStatus(status), {
    code: code ?? undefined,
    type: err?.type ?? undefined,
    details: err?.details ?? undefined,
    status,
  });
}

function defaultForStatus(status: number): string {
  if (status === 0) return "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu.";
  if (status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  return "Yêu cầu không thành công. Vui lòng thử lại.";
}

/** Guard rail: the coach flow requires the real backend (no mock fixtures). */
function assertLive(): void {
  if (isMockMode()) {
    throw new ApiResultError(
      "Tính năng huấn luyện viên cần kết nối đến backend thật (đặt NEXT_PUBLIC_API_BASE_URL).",
      { code: "MOCK_MODE" },
    );
  }
}

async function rawCall<T>(path: string, init?: ApiFetchOptions): Promise<ResultEnvelope<T>> {
  assertLive();
  try {
    return await apiFetch<ResultEnvelope<T>>(path, init ?? {});
  } catch (err) {
    if (err instanceof ApiError) throw errorFromBody(err.body, err.status);
    if (err instanceof ApiResultError) throw err;
    throw new ApiResultError(
      err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.",
      { status: 0 },
    );
  }
}

/** Call an endpoint and return the unwrapped `data` (throws on failure / null). */
export async function callData<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const result = await rawCall<T>(path, init);
  if (result?.isSuccess && result.data != null) return result.data;
  throw envelopeError(result);
}

/** Call a list endpoint and return the `PagedResult<T>` (tolerates null data). */
export async function callPage<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<PagedResult<T>> {
  const result = await rawCall<PagedResult<T>>(path, init);
  if (result?.isSuccess) {
    return (
      result.data ?? {
        items: [],
        pageNumber: 1,
        pageSize: 0,
        totalCount: 0,
        totalPages: 0,
        hasPrevious: false,
        hasNext: false,
      }
    );
  }
  throw envelopeError(result);
}

/** Call an endpoint whose success carries no data (e.g. DELETE). */
export async function callVoid(path: string, init?: ApiFetchOptions): Promise<void> {
  const result = await rawCall<unknown>(path, init);
  if (result?.isSuccess) return;
  throw envelopeError(result);
}

function envelopeError(result: ResultEnvelope<unknown> | undefined): ApiResultError {
  const err: ApiErrorBody | undefined = result?.error ?? undefined;
  return new ApiResultError(
    (err?.message ?? undefined) ||
      (typeof result?.message === "string" ? result.message : undefined) ||
      "Yêu cầu không thành công. Vui lòng thử lại.",
    {
      code: err?.code ?? undefined,
      type: err?.type ?? undefined,
      details: err?.details ?? undefined,
      // HTTP 200 carrying `isSuccess: false`. Recording the status keeps
      // code+status error disambiguation (see social/errors.ts) total — an
      // undefined status there would fall through every status branch.
      status: 200,
    },
  );
}

// ---- Small JSON helpers (keep request bodies consistent) -------------------

export function jsonBody(body: unknown): ApiFetchOptions {
  return { body: JSON.stringify(body) };
}
