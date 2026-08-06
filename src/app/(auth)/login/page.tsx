"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight, CheckCircle2, Lock, Mail, RefreshCw } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { login, resendVerificationEmail, AuthError } from "@/lib/auth-api";
import { getCurrentUser } from "@/lib/auth-session";
import { isMockMode } from "@/lib/api-client";
import { postLoginHref } from "@/lib/auth-post-login";
import { useAppStore } from "@/lib/store/useAppStore";
import { useAuthStore, primaryRole } from "@/lib/store/useAuthStore";
import { showError, showInfo, showSuccess } from "@/lib/toast";
import type { Role } from "@/types";
import {
  loginSchema,
  zodResolver,
  type LoginValues,
} from "@/lib/validation/auth";

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [success, setSuccess] = useState(false);
  // Google owns the auth state while it is working — block the email form so
  // the two flows cannot race to write tokens.
  const [googleBusy, setGoogleBusy] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("session") === "expired") {
      showInfo("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await resendVerificationEmail(unverifiedEmail);
      showSuccess("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.");
      setResendCooldown(60);
    } catch {
      showError("Không thể gửi lại email xác minh. Vui lòng thử lại sau.");
    } finally {
      setResending(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (values: LoginValues) => {
    if (googleBusy) return;
    setUnverifiedEmail(null);
    try {
      // 1. Authenticate — stores the new access + refresh tokens.
      await login({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });

      setSuccess(true);

      let role: Role = "learner";

      if (!isMockMode()) {
        // 2. Fetch the authoritative user from GET /api/auth/me BEFORE redirecting.
        //    This is the only reliable source of the user's role — the JWT alone
        //    may not carry role claims (ASP.NET Identity embeds them at token
        //    issue time, but a freshly promoted coach might still have an old JWT).
        //    hydrate() uses suppressAuthRedirect so a 401 cannot clear the
        //    just-issued tokens or bounce back to /login.
        //    hydrate() never throws — it returns null on failure.
        const me = await useAuthStore.getState().hydrate({ force: true });
        if (me) {
          role = primaryRole(me) ?? "learner";
          useAppStore.getState().setRole(role);
          if (me.id) useAppStore.getState().setCurrentUserId(me.id);
        } else {
          // /me unavailable (e.g. account not active yet) — fall back to the
          // role encoded in the JWT. If the JWT has no role claim, we land on
          // the learner dashboard which is the safest default.
          const jwt = getCurrentUser();
          role = jwt?.role ?? "learner";
          if (jwt?.userId) setCurrentUserId(jwt.userId);
          setRole(role);
        }
      } else {
        // Mock mode: "mock-access-token" is not a real JWT so role stays "learner".
        const jwt = getCurrentUser();
        role = jwt?.role ?? "learner";
        if (jwt?.userId) setCurrentUserId(jwt.userId);
        setRole(role);
      }

      // 3. Redirect to the correct dashboard for this user's role.
      //    Honour ?redirect= placed by the 401 interceptor (internal paths only).
      const sp = new URLSearchParams(window.location.search);
      const dest = sp.get("redirect");
      router.push(dest && dest.startsWith("/") ? dest : postLoginHref(role));
    } catch (err) {
      setSuccess(false);
      if (err instanceof AuthError && err.errorCode === "COMMON_ACCOUNT_NOT_ACTIVE") {
        setUnverifiedEmail(values.email);
      }
      showError(
        err instanceof AuthError
          ? err.message
          : "Đã xảy ra lỗi. Vui lòng thử lại.",
      );
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Đăng nhập Sportico"
        subtitle="Tiếp tục kế hoạch tập luyện và kết nối lại với huấn luyện viên của bạn."
        footer={
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Lock size={11} className="text-emerald-500" />
            Bảo vệ bằng mã hoá cấp doanh nghiệp
          </span>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <AuthInput
            label="Email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            inputMode="email"
            leadingIcon={<Mail size={15} />}
            error={errors.email?.message}
            success={Boolean(touchedFields.email && dirtyFields.email)}
            {...register("email")}
          />

          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between">
            <Checkbox
              label="Ghi nhớ đăng nhập trong 30 ngày"
              {...register("remember")}
            />
            <Link
              href="/forgot-password"
              className="text-[12px] font-semibold text-indigo-700 underline-offset-4 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <AuthButton
            type="submit"
            loading={isSubmitting}
            disabled={success || googleBusy}
            trailing={success ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
          >
            {success ? "Đang xác minh tài khoản…" : "Đăng nhập"}
          </AuthButton>
        </form>

        <GoogleLoginButton
          text="signin_with"
          disabled={isSubmitting || success}
          onBusyChange={setGoogleBusy}
        />

        {unverifiedEmail && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-[12px] text-slate-500 mb-2">
              Email{" "}
              <span className="font-medium text-slate-700">{unverifiedEmail}</span>{" "}
              chưa được xác minh.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
              {resending
                ? "Đang gửi..."
                : resendCooldown > 0
                  ? `Gửi lại sau ${resendCooldown}s`
                  : "Gửi lại email xác minh"}
            </button>
          </div>
        )}
      </AuthCard>

      <AuthSwitchLink
        prompt="Chưa có tài khoản?"
        href="/register"
        cta="Tạo tài khoản"
      />
    </div>
  );
}
