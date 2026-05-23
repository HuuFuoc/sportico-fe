"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";
import { evaluatePassword } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

const TONE: Record<1 | 2 | 3 | 4, { bar: string; text: string }> = {
  1: { bar: "bg-rose-400", text: "text-rose-600" },
  2: { bar: "bg-amber-400", text: "text-amber-700" },
  3: { bar: "bg-cyan-500", text: "text-cyan-700" },
  4: { bar: "bg-emerald-500", text: "text-emerald-700" },
};

export function PasswordStrength({ value }: { value: string }) {
  const reduce = useReducedMotion();
  const { score, label, checks } = evaluatePassword(value);
  if (score === 0) {
    return null;
  }
  const tone = TONE[score];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 10 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: reduce ? 0 : 0.25 }}
      className="overflow-hidden"
    >
      {/* 4-segment meter */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((seg) => {
          const active = seg <= score;
          return (
            <div
              key={seg}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-100"
            >
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: active ? "100%" : "0%" }}
                transition={{
                  duration: reduce ? 0 : 0.4,
                  delay: reduce ? 0 : seg * 0.04,
                  ease: "easeOut",
                }}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  tone.bar,
                )}
              />
            </div>
          );
        })}
        <span
          className={cn(
            "ml-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]",
            tone.text,
          )}
        >
          {label}
        </span>
      </div>

      {/* Live check list */}
      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
        {checks.map((c) => (
          <div
            key={c.id}
            className="inline-flex items-center gap-1.5 text-slate-500"
          >
            <span
              className={cn(
                "inline-flex h-3 w-3 items-center justify-center rounded-full",
                c.passed
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-300",
              )}
            >
              {c.passed ? (
                <Check size={8} strokeWidth={3} />
              ) : (
                <X size={8} strokeWidth={3} />
              )}
            </span>
            <span className={cn(c.passed && "text-slate-700")}>{c.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
