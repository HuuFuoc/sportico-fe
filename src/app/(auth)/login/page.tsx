"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, Lock, Mail } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Divider } from "@/components/ui/Divider";
import {
  loginSchema,
  zodResolver,
  type LoginValues,
} from "@/lib/validation/auth";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1100));
    // Demo: pretend "wrong@example.com" returns an error
    if (values.email === "wrong@example.com") {
      setServerError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      window.location.href = "/learner/dashboard";
    }, 900);
  };

  return (
    <AuthCard
      title="Chào mừng trở lại"
      subtitle={
        <>
          Mới biết đến Sportico?{" "}
          <Link
            href="/register"
            className="font-semibold text-violet-700 underline-offset-4 hover:underline"
          >
            Tạo tài khoản
          </Link>
        </>
      }
      footer={
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <Lock size={11} className="text-emerald-500" />
          Bảo vệ bằng mã hóa cấp doanh nghiệp
        </span>
      }
    >
      {/* Social */}
      <SocialButtons disabled={isSubmitting || success} />

      <Divider>hoặc tiếp tục bằng email</Divider>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          placeholder="ban@congty.com"
          autoComplete="email"
          inputMode="email"
          leadingIcon={<Mail size={15} />}
          error={errors.email?.message}
          success={Boolean(touchedFields.email && dirtyFields.email)}
          {...register("email")}
        />

        <PasswordField
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        {/* Remember / Forgot */}
        <div className="flex items-center justify-between">
          <Checkbox label="Ghi nhớ tôi trong 30 ngày" {...register("remember")} />
          <Link
            href="#"
            className="text-[12px] font-semibold text-violet-700 underline-offset-4 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Server error */}
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
          trailing={
            success ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />
          }
        >
          {success ? "Đăng nhập thành công — đang chuyển…" : "Đăng nhập"}
        </AuthButton>
      </form>
    </AuthCard>
  );
}
