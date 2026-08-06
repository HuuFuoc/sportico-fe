"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { motion } from "motion/react";
import { ArrowRight, MailCheck, Mail, User } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { register as registerUser, AuthError } from "@/lib/auth-api";
import { showError } from "@/lib/toast";
import {
  registerSchema,
  zodResolver,
  type RegisterValues,
} from "@/lib/validation/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  // Google signs the user in immediately (no email verification round trip),
  // so the email form must not submit underneath it.
  const [googleBusy, setGoogleBusy] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = async (values: RegisterValues) => {
    if (googleBusy) return;
    try {
      // Backend grants the learner role, creates an INACTIVE user, emails a
      // verification link, and returns NO token. So we do not store a token and
      // do not redirect to a dashboard — we prompt the user to verify.
      await registerUser({
        email: values.email,
        password: values.password,
        fullName: values.name,
      });

      setRegistered(true);
      // Soft hand-off to login; user can also click the link immediately.
      setTimeout(() => router.push("/login"), 3500);
    } catch (err) {
      showError(
        err instanceof AuthError
          ? err.message
          : "Không thể đăng ký tài khoản. Vui lòng kiểm tra lại thông tin.",
      );
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Tạo tài khoản Sportico"
        subtitle="Xác minh email để bắt đầu tập luyện với huấn luyện viên đã được xác thực."
        footer={
          <>
            Khi tiếp tục, bạn đồng ý với{" "}
            <Link href="/register" className="text-slate-700 hover:text-slate-900">
              Điều khoản
            </Link>{" "}
            và{" "}
            <Link href="/register" className="text-slate-700 hover:text-slate-900">
              Chính sách bảo mật
            </Link>
            .
          </>
        }
      >
        {registered ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 text-white">
              <MailCheck size={22} />
            </span>
            <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
              Đăng ký thành công
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
              Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#3525cd] via-indigo-600 to-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] transition-transform hover:-translate-y-px"
            >
              Đến trang đăng nhập
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <AuthInput
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              leadingIcon={<User size={15} />}
              error={errors.name?.message}
              success={Boolean(touchedFields.name && dirtyFields.name)}
              {...register("name")}
            />

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

            <div>
              <PasswordField
                label="Mật khẩu"
                autoComplete="new-password"
                placeholder="Tạo mật khẩu mạnh"
                error={errors.password?.message}
                {...register("password")}
              />
              <PasswordStrength value={passwordValue} />
            </div>

            <PasswordField
              label="Xác nhận mật khẩu"
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Checkbox
              label={
                <>
                  Tôi đồng ý với{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-indigo-700 underline-offset-4 hover:underline"
                  >
                    Điều khoản
                  </Link>{" "}
                  và{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-indigo-700 underline-offset-4 hover:underline"
                  >
                    Chính sách bảo mật
                  </Link>
                  .
                </>
              }
              error={errors.terms?.message}
              {...register("terms")}
            />

            <AuthButton
              type="submit"
              loading={isSubmitting}
              disabled={googleBusy}
              trailing={<ArrowRight size={15} />}
            >
              Tạo tài khoản
            </AuthButton>
          </form>
        )}

        {!registered && (
          <GoogleLoginButton
            text="signup_with"
            disabled={isSubmitting}
            onBusyChange={setGoogleBusy}
          />
        )}
      </AuthCard>

      <AuthSwitchLink
        prompt="Đã có tài khoản?"
        href="/login"
        cta="Đăng nhập"
      />
    </div>
  );
}
