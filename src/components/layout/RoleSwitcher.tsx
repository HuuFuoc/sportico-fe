"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";

const DEFAULT_ROUTE: Record<AppRole, string> = {
  learner: "/learner/schedule",
  coach: "/coach/dashboard",
  admin: "/admin/dashboard",
};

const ROLE_META: Record<AppRole, { label: string; icon: string }> = {
  learner: { label: "Learner", icon: "school" },
  coach: { label: "Coach", icon: "sports" },
  admin: { label: "Admin", icon: "admin_panel_settings" },
};

export function RoleSwitcher() {
  const role = useAppStore((s) => s.currentRole);
  const setRole = useAppStore((s) => s.setRole);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render in development
  if (!mounted || process.env.NODE_ENV === "production") return null;

  const switchTo = (next: AppRole) => {
    setRole(next);
    setOpen(false);
    router.push(DEFAULT_ROUTE[next]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end">
      {open && (
        <div className="mb-2 w-56 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-border-soft)]">
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              Dev — switch role
            </p>
          </div>
          {(Object.keys(ROLE_META) as AppRole[]).map((r) => {
            const meta = ROLE_META[r];
            const active = r === role;
            return (
              <button
                key={r}
                onClick={() => switchTo(r)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left text-body-base transition-colors",
                  active
                    ? "bg-primary/8 text-primary font-medium"
                    : "text-on-surface hover:bg-surface-container-low",
                )}
              >
                <MaterialIcon name={meta.icon} size={18} />
                {meta.label}
                {active && (
                  <MaterialIcon
                    name="check"
                    size={16}
                    className="ml-auto text-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-full pl-2 pr-3 py-1.5 hover:border-primary transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center">
          <MaterialIcon name={ROLE_META[role].icon} size={14} filled />
        </span>
        <span className="text-body-sm font-medium text-on-surface">
          {ROLE_META[role].label}
        </span>
        <MaterialIcon
          name="unfold_more"
          size={16}
          className="text-on-surface-variant"
        />
      </button>
    </div>
  );
}
