// ============================================================================
// Email-verification landing endpoint.
//
// The backend sends verification emails whose link points at THIS frontend
// path: `/api/auth/verify-email?token=...`. We verify the token server-side
// (a direct server→server call to the backend — no CORS, no client config
// needed), then redirect to the user-facing `/verify-email` page with a status
// so the result is shown exactly once (the token is single-use).
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ??
  "https://sportico-api-khoi-g3bpg4a3dnhehng8.japaneast-01.azurewebsites.net";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirect = new URL("/verify-email", request.nextUrl.origin);

  if (!token) {
    redirect.searchParams.set("status", "error");
    redirect.searchParams.set(
      "message",
      "Thiếu mã xác minh. Vui lòng mở liên kết từ email của bạn.",
    );
    return NextResponse.redirect(redirect);
  }

  try {
    const res = await fetch(
      `${BACKEND_ORIGIN}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    const body = (await res.json().catch(() => null)) as {
      isSuccess?: boolean;
      error?: { message?: string | null } | null;
    } | null;

    if (res.ok && body?.isSuccess) {
      redirect.searchParams.set("status", "success");
    } else {
      redirect.searchParams.set("status", "error");
      if (body?.error?.message) {
        redirect.searchParams.set("message", body.error.message);
      }
    }
  } catch {
    redirect.searchParams.set("status", "error");
    redirect.searchParams.set(
      "message",
      "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
    );
  }

  return NextResponse.redirect(redirect);
}
