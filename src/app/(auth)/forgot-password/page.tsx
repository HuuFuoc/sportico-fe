"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { apiFetch, isMockMode } from "@/lib/api-client";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import { z } from "zod";
import { zodResolver } from "@/lib/validation/auth";

const schema = z.object({
  email: z.string().email("Email không hợp lệ."),
});
type Values = z.infer<typeof schema>;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    setServerError(null);
    if (isMockMode()) {
      setSubmittedEmail(values.email);
      setSent(true);
      return;
    }
    try {
      const raw = await apiFetch<{ isSuccess: boolean; error?: { message?: string } }>(
        ep.auth.forgotPassword,
        {
          method: "POST",
          body: JSON.stringify({ email: values.email }),
        },
      );
      if (raw && !raw.isSuccess) {
        setServerError(raw.error?.message ?? "Yêu cầu không thành công.");
        return;
      }
      setSubmittedEmail(values.email);
      setSent(true);
    } catch {
      setServerError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    }
  };

  return (
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn để nhận liên kết đặt lại mật khẩu."
    >
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
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
                Email đã được gửi
              </p>
              <p className="mt-1 text-[13.5px] text-slate-500">
                Chúng tôi đã gửi liên kết đặt lại mật khẩu đến{" "}
                <span className="font-medium text-slate-700">
                  {submittedEmail}
                </span>
                . Vui lòng kiểm tra hộp thư của bạn.
              </p>
            </div>
            <p className="text-[12px] text-slate-400">
              Không nhận được email?{" "}
              <button
                onClick={() => setSent(false)}
                className="font-medium text-violet-600 hover:underline"
              >
                Thử lại
              </button>
            </p>
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
            <AuthInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              {...register("email")}
              error={errors.email?.message}
            />

            {serverError && (
              <p role="alert" className="text-[13px] text-red-600">
                {serverError}
              </p>
            )}

            <AuthButton type="submit" loading={isSubmitting}>
              Gửi liên kết đặt lại
            </AuthButton>
          </motion.form>
        )}
      </AnimatePresence>

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
