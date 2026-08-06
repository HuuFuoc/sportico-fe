"use client";

// ============================================================================
// /auth/google/callback — landing page for the redirect OAuth fallback.
//
// The backend sends the browser here with exactly one of:
//   ?code=<one-time-code>       → exchange it for a Sportico token set
//   ?error=<stable-error-code>  → show the mapped message, exchange nothing
//
// Hard rules this page exists to enforce:
//   • The code is single-use and expires in ~90s. It is exchanged EXACTLY
//     once — `consumedRef` survives React Strict Mode's double effect, which
//     would otherwise produce a bogus AUTH_GOOGLE_EXCHANGE_CODE_ALREADY_USED.
//   • The code never touches localStorage, sessionStorage, the console, or
//     any analytics call, and it is stripped from the URL the moment it has
//     been read into a local variable — before the request is even issued.
//   • `?error=` carries a stable code, not an exception. It is mapped by
//     `getAuthErrorMessage`, never wrapped into a fake Error object: such an
//     object is not an instance of any error class we check for downstream.
//
// The query string is read from `window.location` inside an effect rather than
// via `useSearchParams()` — this page is client-only by nature, and it keeps
// the read and the strip in one place with no Suspense bail-out.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import { takeReturnTo } from "@/lib/auth-post-login";
import { useGoogleLogin } from "@/lib/hooks/useGoogleLogin";

export default function GoogleCallbackPage() {
  const { loginWithExchangeCode, error: exchangeError } = useGoogleLogin();

  // Set before any await so React Strict Mode's second invocation is a no-op.
  const consumedRef = useRef(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorCode = params.get("error");

    // Both values are now held locally — drop the sensitive query string from
    // the URL (and from the history entry) before doing anything else.
    window.history.replaceState(null, "", window.location.pathname);

    if (errorCode) {
      setRedirectError(getAuthErrorMessage(errorCode));
      return;
    }
    if (!code) {
      setRedirectError(
        "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      );
      return;
    }

    // Navigates on success; surfaces failures through the hook's `error`.
    void loginWithExchangeCode(code, { returnTo: takeReturnTo() });
  }, [loginWithExchangeCode]);

  const message = redirectError ?? exchangeError;

  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title={message ? "Đăng nhập Google thất bại" : "Đang hoàn tất đăng nhập"}
        subtitle={
          message
            ? "Không thể hoàn tất phiên đăng nhập Google."
            : "Vui lòng đợi trong giây lát…"
        }
      >
        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <TriangleAlert size={22} />
            </span>
            <p
              role="alert"
              className="mt-4 text-[13.5px] leading-relaxed text-slate-600"
            >
              {message}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#3525cd] via-indigo-600 to-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] transition-transform hover:-translate-y-px"
            >
              Quay lại đăng nhập
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Loader2 size={22} className="animate-spin" />
            </span>
            <p className="mt-4 text-[13.5px] text-slate-500">
              Đang xác thực tài khoản Google của bạn…
            </p>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
