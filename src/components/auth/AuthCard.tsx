"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      className={cn("relative w-full max-w-[460px]", className)}
    >
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_36px_-12px_rgba(15,23,42,0.08)] sm:p-9">
        {/* Brand accent strip — matches landing-hero indigo→violet */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#3525cd] via-indigo-500 to-violet-500"
        />
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[14px] text-slate-500">{subtitle}</p>
        )}

        <div className="mt-7">{children}</div>

        {footer && (
          <div className="mt-7 border-t border-slate-100 pt-5 text-center text-[12px] text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  );
}
