"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { login, AuthError } from "@/lib/auth-api";
import { getCurrentUser } from "@/lib/auth-session";
import { isMockMode } from "@/lib/api-client";
import { useAppStore } from "@/lib/store/useAppStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { showError, showInfo } from "@/lib/toast";
import type { Role } from "@/types";
import {
  loginSchema,
  zodResolver,
  type LoginValues,
} from "@/lib/validation/auth";

/** Pick the landing role from the backend roles array (admin > coach > learner). */
function roleFromBackend(roles: string[]): Role {
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.includes("admin")) return "admin";
  if (lower.includes("coach")) return "coach";
  return "learner";
}

/** Post-login destination by role. */
function postLoginHref(role: Role): string {
  if (role === "admin") return "/admin/settings?fromLogin=1";
  if (role === "coach") return "/coach/settings?fromLogin=1";
  return "/learner/settings?fromLogin=1";
}

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("session") === "expired") {
      showInfo("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }, []);

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
          role = roleFromBackend(me.roles);
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
            disabled={success}
            trailing={success ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
          >
            {success ? "Đang xác minh tài khoản…" : "Đăng nhập"}
          </AuthButton>
        </form>
      </AuthCard>

      <AuthSwitchLink
        prompt="Chưa có tài khoản?"
        href="/register"
        cta="Tạo tài khoản"
      />
    </div>
  );
}
