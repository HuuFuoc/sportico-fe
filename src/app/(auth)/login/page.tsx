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
import { useAppStore } from "@/lib/store/useAppStore";
import {
  loginSchema,
  zodResolver,
  type LoginValues,
} from "@/lib/validation/auth";

export default function LoginPage() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      // TODO(auth): backend login does not return role and there is no /me
      // endpoint. Redirect defaults to learner until a profile/current-user
      // endpoint or role claim is available.
      setRole("learner");
      router.push("/learner/dashboard");
    } catch (err) {
      setServerError(
        err instanceof AuthError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Log in to Sportico"
        subtitle="Welcome back — pick up right where you left off."
        footer={
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Lock size={11} className="text-emerald-500" />
            Protected with enterprise-grade encryption
          </span>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@company.com"
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

          <div className="flex items-center justify-between">
            <Checkbox label="Remember me for 30 days" {...register("remember")} />
            <Link
              href="/login"
              className="text-[12px] font-semibold text-violet-700 underline-offset-4 hover:underline"
            >
              Forgot password?
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
            {success ? "Signed in — redirecting…" : "Log in"}
          </AuthButton>
        </form>
      </AuthCard>

      <AuthSwitchLink
        prompt="New to Sportico?"
        href="/register"
        cta="Create an account"
      />
    </div>
  );
}
