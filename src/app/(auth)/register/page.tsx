"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, Mail, User } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Divider } from "@/components/ui/Divider";
import {
  registerSchema,
  zodResolver,
  type RegisterValues,
} from "@/lib/validation/auth";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setServerError(null);
    await new Promise((r) => setTimeout(r, 1200));
    if (values.email === "taken@example.com") {
      setServerError("Email này đã được sử dụng cho một tài khoản khác.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      window.location.href = "/learner/dashboard";
    }, 900);
  };

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle={
        <>
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-violet-700 underline-offset-4 hover:underline"
          >
            Đăng nhập
          </Link>
        </>
      }
      footer={
        <>
          Bảo vệ bằng mã hóa cấp doanh nghiệp ·{" "}
          <Link href="#" className="text-slate-700 hover:text-slate-900">
            Bảo mật
          </Link>
        </>
      }
    >
      <SocialButtons disabled={isSubmitting || success} />

      <Divider>hoặc đăng ký bằng email</Divider>

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
          placeholder="ban@congty.com"
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
                href="#"
                className="font-semibold text-violet-700 underline-offset-4 hover:underline"
              >
                Điều khoản
              </Link>{" "}
              và{" "}
              <Link
                href="#"
                className="font-semibold text-violet-700 underline-offset-4 hover:underline"
              >
                Chính sách bảo mật
              </Link>
              .
            </>
          }
          error={errors.terms?.message}
          {...register("terms")}
        />

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
          {success ? "Đã tạo tài khoản — đang đăng nhập…" : "Tạo tài khoản"}
        </AuthButton>
      </form>
    </AuthCard>
  );
}
