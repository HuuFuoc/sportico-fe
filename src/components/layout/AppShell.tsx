"use client";

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RoleSwitcher } from "./RoleSwitcher";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";

interface AppShellProps {
  role: AppRole;
  title?: string;
  /** Override the global search bar placeholder for this specific page. */
  searchPlaceholder?: string;
  /** Optional right-side rail (e.g. Ask AI panel on learner dashboard). */
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ role, title, searchPlaceholder, rightRail, children }: AppShellProps) {
  // Sync route role with global store so RoleSwitcher reflects current section
  const setRole = useAppStore((s) => s.setRole);
  const currentRole = useAppStore((s) => s.currentRole);

  useEffect(() => {
    if (currentRole !== role) setRole(role);
    // intentionally only on role change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role={role} />
      <TopBar role={role} title={title} searchPlaceholder={searchPlaceholder} />
      <main className="lg:ml-64 pt-16 min-h-screen flex">
        <div className="flex-1 min-w-0 px-4 sm:px-6 py-6">{children}</div>
        {rightRail && (
          <aside className="hidden xl:flex w-[320px] border-l border-[var(--color-border-soft)] bg-surface-container-low flex-col">
            {rightRail}
          </aside>
        )}
      </main>
      <RoleSwitcher />
    </div>
  );
}
