"use client";

// ============================================================================
// Shared form primitives for the Create-Package form. Keep the existing app
// style (soft borders, rounded-[8px], indigo focus, no shadows on inputs).
// ============================================================================

import { cn } from "@/lib/utils";
import { WEEKDAYS } from "./schedule";

// ── Section card ─────────────────────────────────────────────────────────────

export function SectionCard({
  step,
  title,
  description,
  icon,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-[13.5px] font-semibold text-on-surface">
            <span className="mr-1 text-on-surface-variant/60 tabular-nums">
              {step}.
            </span>
            {title}
          </h4>
          {description && (
            <p className="text-[11.5px] text-on-surface-variant">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Field wrapper ────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-[12px] font-semibold text-on-surface">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
        {hint && <span className="text-[10.5px] text-on-surface-variant">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full h-10 px-3 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[13.5px]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLASS, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        INPUT_CLASS,
        "cursor-pointer appearance-none pr-8",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full px-3 py-2.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[13.5px] resize-none leading-relaxed",
        props.className,
      )}
    />
  );
}

// ── Toggle (offline ⇄ online) ────────────────────────────────────────────────

export function ModeToggle({
  isOnline,
  onChange,
  className,
}: {
  isOnline: boolean;
  onChange: (online: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isOnline)}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 text-[13.5px]",
        className,
      )}
    >
      <span className="font-medium text-on-surface">
        {isOnline ? "Trực tuyến" : "Trực tiếp"}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          isOnline ? "bg-primary" : "bg-surface-container-high",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            isOnline ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

// ── Weekday picker (button group) ────────────────────────────────────────────

export function WeekdayPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (js: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((w) => {
        const active = selected.includes(w.js);
        return (
          <button
            key={w.js}
            type="button"
            onClick={() => onToggle(w.js)}
            aria-pressed={active}
            className={cn(
              "h-9 min-w-[44px] rounded-[8px] border px-2 text-[12.5px] font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-white"
                : "border-[var(--color-border-soft)] bg-surface-container-low text-on-surface-variant hover:border-primary/40 hover:text-primary",
            )}
            title={w.label}
          >
            {w.short}
          </button>
        );
      })}
    </div>
  );
}
