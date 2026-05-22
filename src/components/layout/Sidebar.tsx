"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { getUserById } from "@/lib/mock/users";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const LEARNER_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/learner/dashboard", label: "Dashboard", icon: "space_dashboard" },
    ],
  },
  {
    label: "Train",
    items: [
      { href: "/learner/coaches", label: "Find Coaches", icon: "search" },
      { href: "/learner/ai-match", label: "AI Match", icon: "auto_awesome" },
      { href: "/learner/schedule", label: "My Schedule", icon: "calendar_today" },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/learner/messages", label: "Messages", icon: "forum" },
      { href: "/learner/progress", label: "Progress", icon: "monitoring" },
    ],
  },
];

const COACH_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/coach/dashboard", label: "Dashboard", icon: "space_dashboard" },
    ],
  },
  {
    label: "Coaching",
    items: [
      { href: "/coach/learners", label: "My Learners", icon: "groups" },
      { href: "/coach/schedule", label: "Schedule", icon: "calendar_today" },
      { href: "/coach/messages", label: "Messages", icon: "forum" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/coach/earnings", label: "Earnings", icon: "payments" },
      { href: "/coach/profile", label: "My Profile", icon: "account_circle" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "space_dashboard" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/users", label: "Users", icon: "group" },
      { href: "/admin/verifications", label: "Verifications", icon: "verified_user" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/revenue", label: "Revenue", icon: "payments" },
      { href: "/admin/ai-settings", label: "AI Settings", icon: "auto_awesome" },
      { href: "/admin/console", label: "Console", icon: "terminal" },
    ],
  },
];

function navForRole(role: AppRole): NavGroup[] {
  switch (role) {
    case "coach":
      return COACH_NAV;
    case "admin":
      return ADMIN_NAV;
    default:
      return LEARNER_NAV;
  }
}

const ROLE_LABEL: Record<AppRole, string> = {
  learner: "Learner",
  coach: "Coach",
  admin: "Admin",
};

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const groups = navForRole(role);
  const mobileOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = getUserById(currentUserId);

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
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-[var(--color-border-soft)] bg-surface-container-lowest/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="px-5 pb-3 pt-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-violet-500 text-on-primary shadow-[0_8px_18px_-8px_rgba(53,37,205,0.7)]">
              <MaterialIcon name="rocket_launch" filled size={19} weight={500} />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-none text-on-surface">
                ProCoach AI
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                Elite Performance
              </p>
            </div>
          </Link>
        </div>

        {/* Coach-only CTA */}
        {role === "coach" && (
          <div className="px-3 pb-1 pt-1">
            <Link
              href="/coach/schedule"
              className="flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-primary py-2.5 text-[13px] font-semibold text-on-primary shadow-[0_10px_22px_-12px_rgba(53,37,205,0.8)] transition-colors hover:bg-[#2d20b8]"
            >
              <MaterialIcon name="add" size={17} weight={500} />
              New Session
            </Link>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-1.5">
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-on-surface-variant/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13.5px] transition-colors",
                        active
                          ? "bg-primary/[0.08] font-semibold text-primary"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <MaterialIcon
                        name={item.icon}
                        size={20}
                        filled={active}
                        weight={active ? 500 : 400}
                        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile */}
        <div className="border-t border-[var(--color-border-soft)] p-3">
          <div className="flex items-center gap-2.5 rounded-[11px] border border-[var(--color-border-soft)] bg-surface-container-low/60 p-2">
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MaterialIcon name="person" filled size={18} />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-container-lowest bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-on-surface">
                {user?.name ?? "ProCoach user"}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {ROLE_LABEL[role]} · Online
              </p>
            </div>
            <Link
              href={settingsHref}
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <MaterialIcon name="settings" size={18} />
            </Link>
          </div>
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <MaterialIcon name="logout" size={19} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
