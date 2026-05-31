"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
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

/** Post-login destination by role — goes to the personal profile settings page
 *  with ?fromLogin=1 so the page shows an onboarding banner + "Skip" button.
 *  The user can complete their profile or navigate straight to their dashboard.
 */
function postLoginHref(role: Role): string {
  if (role === "admin") return "/admin/settings?fromLogin=1";
  if (role === "coach") return "/coach/settings?fromLogin=1";
  return "/learner/settings?fromLogin=1";
}

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Show a notice when the user was redirected here because their session expired.
  const sessionExpired =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("session") === "expired";

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
    setServerError(null);
    try {
      // Calls the real Auth API in live mode; resolves a demo success in mock
      // mode. `login()` stores the access/refresh tokens centrally. Never a fake
      // setTimeout success.
      await login({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });

      setSuccess(true);

      // Login returns no role/user. In live mode read GET /api/auth/me (the
      // authoritative roles + profiles) and route by backend roles; fall back to
      // the JWT claims in mock mode or if /me is unavailable.
      let role: Role = "learner";
      if (!isMockMode()) {
        const me = await useAuthStore.getState().hydrate({ force: true });
        if (me) {
          role = roleFromBackend(me.roles);
          if (me.id) setCurrentUserId(me.id);
        } else {
          const jwt = getCurrentUser();
          role = jwt?.role ?? "learner";
          if (jwt?.userId) setCurrentUserId(jwt.userId);
        }
      } else {
        const jwt = getCurrentUser();
        role = jwt?.role ?? "learner";
        if (jwt?.userId) setCurrentUserId(jwt.userId);
      }

      setRole(role);
      // Honour ?redirect= set by the 401 interceptor (internal paths only).
      const sp = new URLSearchParams(window.location.search);
      const dest = sp.get("redirect");
      router.push(dest && dest.startsWith("/") ? dest : postLoginHref(role));
    } catch (err) {
      setServerError(
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
          {sessionExpired && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-3 text-[13px] text-amber-800">
              Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
            </div>
          )}

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

          <AnimatePresence>
            {serverError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                className="overflow-hidden"
              >
                <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
                  {serverError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AuthButton
            type="submit"
            loading={isSubmitting}
            disabled={success}
            trailing={success ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
          >
            {success ? "Đăng nhập thành công – đang chuyển hướng…" : "Đăng nhập"}
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
