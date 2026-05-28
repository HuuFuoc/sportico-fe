"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, MailCheck, Mail, User } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { AuthInput } from "@/components/ui/AuthInput";
import { AuthButton } from "@/components/ui/AuthButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { register as registerUser, AuthError } from "@/lib/auth-api";
import {
  registerSchema,
  zodResolver,
  type RegisterValues,
} from "@/lib/validation/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

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
      setServerError(
        err instanceof AuthError
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.",
      );
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Create your account"
        subtitle="Join Sportico and start training with the right people."
        footer={
          <>
            By continuing you agree to our{" "}
            <Link href="/register" className="text-slate-700 hover:text-slate-900">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/register" className="text-slate-700 hover:text-slate-900">
              Privacy Policy
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
              Registration successful
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
              Please check your email to verify your account before logging in.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.4)] transition-transform hover:-translate-y-px"
            >
              Go to login
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <AuthInput
              label="Full name"
              placeholder="Jordan Pike"
              autoComplete="name"
              leadingIcon={<User size={15} />}
              error={errors.name?.message}
              success={Boolean(touchedFields.name && dirtyFields.name)}
              {...register("name")}
            />

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

            <div>
              <PasswordField
                label="Password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                {...register("password")}
              />
              <PasswordStrength value={passwordValue} />
            </div>

            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Checkbox
              label={
                <>
                  I agree to the{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-violet-700 underline-offset-4 hover:underline"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-violet-700 underline-offset-4 hover:underline"
                  >
                    Privacy Policy
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
              trailing={<ArrowRight size={15} />}
            >
              Create account
            </AuthButton>
          </form>
        )}
      </AuthCard>

      <AuthSwitchLink
        prompt="Already have an account?"
        href="/login"
        cta="Log in"
      />
    </div>
  );
}
