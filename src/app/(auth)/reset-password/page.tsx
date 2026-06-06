"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthButton } from "@/components/ui/AuthButton";
import { apiFetch, isMockMode } from "@/lib/api-client";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import { showError } from "@/lib/toast";
import { z } from "zod";
import { zodResolver } from "@/lib/validation/auth";

const schema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirm: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

const EASE = [0.16, 1, 0.3, 1] as const;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = async (values: Values) => {
    if (!token) {
      showError("Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại.");
      return;
    }
    if (isMockMode()) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }
    try {
      const raw = await apiFetch<{ isSuccess: boolean; error?: { message?: string } }>(
        ep.auth.resetPassword,
        {
          method: "POST",
          body: JSON.stringify({ token, newPassword: values.password }),
        },
      );
      if (raw && !raw.isSuccess) {
        showError(raw.error?.message ?? "Đặt lại mật khẩu không thành công.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      showError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    }
  };

  if (!token && !isMockMode()) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="text-[14px] text-red-600">
          Liên kết đặt lại không hợp lệ hoặc đã hết hạn.
        </p>
        <Link href="/forgot-password" className="text-[13px] text-violet-600 hover:underline">
          Yêu cầu liên kết mới
        </Link>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex flex-col items-center gap-4 py-4 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-slate-900">
              Mật khẩu đã được đặt lại
            </p>
            <p className="mt-1 text-[13.5px] text-slate-500">
              Đang chuyển hướng đến trang đăng nhập…
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <PasswordField
            label="Mật khẩu mới"
            autoComplete="new-password"
            placeholder="Ít nhất 8 ký tự"
            {...register("password")}
            error={errors.password?.message}
          />
          <PasswordField
            label="Xác nhận mật khẩu"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            {...register("confirm")}
            error={errors.confirm?.message}
          />

          <AuthButton type="submit" loading={isSubmitting}>
            Đặt lại mật khẩu
          </AuthButton>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Đặt lại mật khẩu"
      subtitle="Tạo mật khẩu mới cho tài khoản của bạn."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>

      <div className="mt-4 flex justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthCard>
  );
}
