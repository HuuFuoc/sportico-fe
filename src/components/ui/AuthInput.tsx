"use client";

import { forwardRef, useId, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  hint?: string;
  error?: string;
  success?: boolean;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    { label, hint, error, success, leadingIcon, trailing, id, className, ...rest },
    ref,
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const [focused, setFocused] = useState(false);
    const reduce = useReducedMotion();
    const hasValue = Boolean(rest.value || rest.defaultValue);

    return (
      <div className={className}>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-[12.5px] font-medium text-slate-700"
          >
            {label}
          </label>
          {hint && !error && (
            <span id={hintId} className="text-[11px] text-slate-400">
              {hint}
            </span>
          )}
        </div>

        <div
          className={cn(
            "group relative flex items-center rounded-[12px] border bg-white transition-all",
            error
              ? "border-rose-400 ring-2 ring-rose-100"
              : focused
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300",
          )}
        >
          {leadingIcon && (
            <span
              className={cn(
                "pl-3 transition-colors",
                error
                  ? "text-rose-500"
                  : focused
                    ? "text-indigo-600"
                    : "text-slate-400",
              )}
            >
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              [errorId, hintId].filter(Boolean).join(" ") || undefined
            }
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            {...rest}
            className={cn(
              "h-11 flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400",
              leadingIcon ? "px-3" : "px-4",
              trailing && "pr-2",
            )}
          />
          {trailing && (
            <span className="flex items-center pr-2">{trailing}</span>
          )}
          {!trailing && success && hasValue && !error && (
            <span className="flex items-center pr-3 text-emerald-500">
              <CheckCircle2 size={15} />
            </span>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              key={error}
              id={errorId}
              role="alert"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-rose-600"
            >
              <AlertCircle size={11} />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
