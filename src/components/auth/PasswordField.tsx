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
    { label = "Mật khẩu", error, hint, ...rest },
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
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={visible}
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
        {...rest}
      />
    );
  },
);
