"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { AuthInput } from "@/components/ui/AuthInput";

interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { label = "Password", error, hint, ...rest },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    return (
      <AuthInput
        ref={ref}
        type={visible ? "text" : "password"}
        label={label}
        hint={hint}
        error={error}
        leadingIcon={<Lock size={15} />}
        autoComplete={rest.autoComplete ?? "current-password"}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
        {...rest}
      />
    );
  },
);
