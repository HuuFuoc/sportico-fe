"use client";

import { forwardRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Premium SaaS button.
 *
 * - primary: soft violet→fuchsia gradient, low-key shadow, hover lift
 * - ghost: clean white surface with slate border, for social providers
 */
export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  function AuthButton(
    {
      variant = "primary",
      loading,
      leading,
      trailing,
      fullWidth = true,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    if (variant === "ghost") {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          {...rest}
          className={cn(
            "group relative inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-[13.5px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
            fullWidth && "w-full",
            className,
          )}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin text-slate-500" />
          ) : (
            <>
              {leading}
              <span>{children}</span>
              {trailing}
            </>
          )}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        {...rest}
        className={cn(
          "group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-gradient-to-r from-[#3525cd] via-indigo-600 to-violet-600 px-5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45),0_1px_2px_rgba(10,10,14,0.12)] transition-all hover:-translate-y-px hover:shadow-[0_8px_22px_-4px_rgba(99,102,241,0.6)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
          fullWidth && "w-full",
          className,
        )}
      >
        {/* Subtle hover wash */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-[#3525cd] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className="relative inline-flex items-center gap-2">
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              {leading}
              <span>{children}</span>
              {trailing}
            </>
          )}
        </span>
      </button>
    );
  },
);
