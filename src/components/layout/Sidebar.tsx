"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const LEARNER_NAV: NavItem[] = [
  { href: "/learner/dashboard", label: "Dashboard", icon: "home" },
  { href: "/learner/coaches", label: "Find Coaches", icon: "search" },
  { href: "/learner/ai-match", label: "AI Match", icon: "psychology" },
  { href: "/learner/schedule", label: "My Schedule", icon: "calendar_today" },
  { href: "/learner/messages", label: "Messages", icon: "chat" },
  { href: "/learner/progress", label: "Progress", icon: "insights" },
];

const COACH_NAV: NavItem[] = [
  { href: "/coach/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/coach/learners", label: "My Learners", icon: "groups" },
  { href: "/coach/schedule", label: "Schedule", icon: "calendar_today" },
  { href: "/coach/messages", label: "Messages", icon: "mail" },
  { href: "/coach/earnings", label: "Earnings", icon: "payments" },
  { href: "/coach/profile", label: "My Profile", icon: "account_circle" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "group" },
  {
    href: "/admin/verifications",
    label: "Verifications",
    icon: "verified_user",
  },
  { href: "/admin/revenue", label: "Revenue", icon: "payments" },
  { href: "/admin/ai-settings", label: "AI Settings", icon: "psychology" },
  { href: "/admin/console", label: "Console", icon: "terminal" },
];

function navForRole(role: AppRole): NavItem[] {
  switch (role) {
    case "coach":
      return COACH_NAV;
    case "admin":
      return ADMIN_NAV;
    default:
      return LEARNER_NAV;
  }
}

interface SidebarProps {
  role: AppRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navForRole(role);
  const mobileOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const settingsHref =
    role === "coach"
      ? "/coach/settings"
      : role === "admin"
        ? "/admin/console"
        : "/learner/settings";

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={() => setMobileSidebarOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/30 z-40 lg:hidden transition-opacity",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-surface-container-lowest border-r border-[var(--color-border-soft)] z-50 flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-primary text-on-primary flex items-center justify-center">
              <MaterialIcon name="rocket_launch" filled size={18} weight={500} />
            </div>
            <div>
              <p className="text-h3 text-primary leading-none">ProCoach AI</p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-on-surface-variant mt-0.5">
                Elite Performance
              </p>
            </div>
          </Link>
        </div>

        {/* Coach-only CTA */}
        {role === "coach" && (
          <div className="px-4 pb-3">
            <Link
              href="/coach/schedule"
              className="w-full flex items-center justify-center gap-1.5 bg-primary text-on-primary text-body-base font-medium rounded-[6px] py-2 hover:bg-[#2d20b8] transition-colors"
            >
              <MaterialIcon name="add" size={18} weight={500} />
              New Session
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-[6px] text-body-base transition-colors relative",
                  active
                    ? "bg-primary/8 text-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                )}
                <MaterialIcon
                  name={item.icon}
                  size={20}
                  weight={active ? 500 : 400}
                  filled={active}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Settings */}
        <div className="px-3 pb-4 pt-3 border-t border-[var(--color-border-soft)] space-y-0.5">
          <Link
            href={settingsHref}
            className="flex items-center gap-3 px-3 py-2 rounded-[6px] text-body-base text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <MaterialIcon name="settings" size={20} />
            Settings
          </Link>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-body-base text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          >
            <MaterialIcon name="logout" size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
