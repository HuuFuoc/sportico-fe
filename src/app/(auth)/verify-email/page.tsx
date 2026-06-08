"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Loader2, MailCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { verifyEmail, resendVerificationEmail, AuthError } from "@/lib/auth-api";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  // The `/api/auth/verify-email` route handler verifies server-side and
  // redirects here with a `status` (and optional `message`); in that case we
  // just render the outcome. A bare `?token=` (direct visit) is verified
  // client-side as a fallback.
  const presetStatus = params.get("status");
  const presetMessage = params.get("message");

  const initialStatus: Status =
    presetStatus === "success"
      ? "success"
      : presetStatus === "error"
        ? "error"
        : token
          ? "verifying"
          : "error";

  const [status, setStatus] = useState<Status>(initialStatus);
  const [message, setMessage] = useState<string>(() => {
    if (presetStatus === "success")
      return "Xác minh email thành công. Bạn có thể đăng nhập ngay bây giờ.";
    if (presetStatus === "error")
      return presetMessage ?? "Liên kết xác minh không hợp lệ hoặc đã hết hạn.";
    return token
      ? ""
      : "Thiếu mã xác minh. Vui lòng mở liên kết từ email của bạn.";
  });
  // Guard against React's double-invoke in dev so we verify exactly once.
  const ran = useRef(false);

  // Resend verification email state
  const [resendEmail, setResendEmail] = useState("");
  const [resendEmailError, setResendEmailError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    const trimmed = resendEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResendEmailError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setResendEmailError("");
    setResendFeedback(null);
    setResending(true);
    try {
      await resendVerificationEmail(trimmed);
      setResendFeedback({
        ok: true,
        msg: "Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.",
      });
      setResendCooldown(60);
    } catch (err) {
      setResendFeedback({
        ok: false,
        msg:
          err instanceof AuthError
            ? err.message
            : "Không thể gửi lại email xác minh. Vui lòng thử lại sau.",
      });
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    // Skip the client-side call when the server already resolved the outcome.
    if (presetStatus || !token || ran.current) return;
    ran.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Xác minh email thành công. Bạn có thể đăng nhập ngay bây giờ.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof AuthError
            ? err.message
            : "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
        );
      });
  }, [token, presetStatus]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Loader2 size={22} className="animate-spin" />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
          Đang xác minh email
        </h2>
        <p className="mt-1.5 text-[13.5px] text-slate-500">
          Chỉ mất vài giây…
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 text-white">
          <MailCheck size={22} />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
          Đã xác minh email
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
          {message}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#3525cd] via-indigo-600 to-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] transition-transform hover:-translate-y-px"
        >
          Đến trang đăng nhập
          <ArrowRight size={15} />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <TriangleAlert size={22} />
      </span>
      <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
        Xác minh thất bại
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
        {message}
      </p>
      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-5 py-2.5 text-[13.5px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        Về trang đăng nhập
        <ArrowRight size={15} />
      </Link>

      <div className="mt-6 w-full border-t border-slate-100 pt-5">
        <p className="text-center text-[12.5px] text-slate-400 mb-3">
          Chưa nhận được email xác minh?
        </p>
        <input
          type="email"
          value={resendEmail}
          onChange={(e) => {
            setResendEmail(e.target.value);
            setResendEmailError("");
          }}
          placeholder="Nhập địa chỉ email của bạn"
          className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-colors"
        />
        {resendEmailError && (
          <p className="mt-1 text-[11.5px] text-rose-500">{resendEmailError}</p>
        )}
        {resendFeedback && (
          <p className={`mt-2 text-[12px] ${resendFeedback.ok ? "text-emerald-600" : "text-rose-500"}`}>
            {resendFeedback.msg}
          </p>
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
          {resending
            ? "Đang gửi..."
            : resendCooldown > 0
              ? `Gửi lại sau ${resendCooldown}s`
              : "Gửi lại email xác minh"}
        </button>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Xác minh email"
        subtitle="Đang xác nhận tài khoản Sportico của bạn."
      >
        <Suspense
          fallback={
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Loader2 size={22} className="animate-spin" />
              </span>
              <p className="mt-4 text-[13.5px] text-slate-500">Đang tải…</p>
            </div>
          }
        >
          <VerifyEmailInner />
        </Suspense>
      </AuthCard>

      <AuthSwitchLink
        prompt="Chưa có tài khoản?"
        href="/register"
        cta="Tạo tài khoản"
      />
    </div>
  );
}
