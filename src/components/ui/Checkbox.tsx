"use client";

import { forwardRef, useId, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, error, id, className, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errId = error ? `${inputId}-err` : undefined;
    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className="group inline-flex cursor-pointer items-start gap-2 select-none"
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-invalid={Boolean(error)}
            aria-describedby={errId}
            className="peer sr-only"
            {...rest}
          />
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all",
              "border-slate-300 bg-white group-hover:border-slate-400",
              "peer-checked:border-violet-600 peer-checked:bg-gradient-to-br peer-checked:from-violet-600 peer-checked:to-fuchsia-500 peer-checked:shadow-[0_2px_8px_-2px_rgba(124,58,237,0.4)]",
              "peer-checked:[&_svg]:opacity-100",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white",
              error && "border-rose-400",
            )}
          >
            <Check
              size={10}
              strokeWidth={3.5}
              className="text-white opacity-0 transition-opacity"
            />
          </span>
          <span className="text-[12.5px] leading-snug text-slate-600 group-hover:text-slate-800">
            {label}
          </span>
        </label>
        {error && (
          <p
            id={errId}
            role="alert"
            className="ml-6 mt-1 text-[11px] font-medium text-rose-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
