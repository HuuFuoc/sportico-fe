"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { verifyEmail, AuthError } from "@/lib/auth-api";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string>(
    token
      ? ""
      : "Verification token is missing. Please open the link from your email.",
  );
  // Guard against React's double-invoke in dev so we verify exactly once.
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Email verified successfully. You can now log in.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof AuthError
            ? err.message
            : "Invalid or expired verification token.",
        );
      });
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
          <Loader2 size={22} className="animate-spin" />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
          Verifying your email
        </h2>
        <p className="mt-1.5 text-[13.5px] text-slate-500">
          This only takes a moment…
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 text-white">
          <MailCheck size={22} />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
          Email verified
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
          {message}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(124,58,237,0.4)] transition-transform hover:-translate-y-px"
        >
          Go to login
          <ArrowRight size={15} />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <TriangleAlert size={22} />
      </span>
      <h2 className="mt-4 text-[16px] font-semibold text-slate-900">
        Verification failed
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
        {message}
      </p>
      <Link
        href="/login"
        className="mt-5 inline-flex items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-5 py-2.5 text-[13.5px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        Back to login
        <ArrowRight size={15} />
      </Link>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-[460px]">
      <AuthCard
        title="Verify your email"
        subtitle="Confirming your Sportico account."
      >
        <Suspense
          fallback={
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <Loader2 size={22} className="animate-spin" />
              </span>
              <p className="mt-4 text-[13.5px] text-slate-500">Loading…</p>
            </div>
          }
        >
          <VerifyEmailInner />
        </Suspense>
      </AuthCard>

      <AuthSwitchLink
        prompt="New to Sportico?"
        href="/register"
        cta="Create an account"
      />
    </div>
  );
}
