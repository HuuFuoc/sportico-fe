"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isMockMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { logout } from "@/lib/auth-api";
import { UserAvatar } from "@/components/common/UserAvatar";

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
    label: "Tập luyện",
    items: [
      { href: "/learner/schedule", label: "Lịch tập", icon: "calendar_today" },
    ],
  },
  {
    label: "Hoạt động",
    items: [
      { href: "/learner/bookings", label: "Gói tập", icon: "inventory_2" },
      { href: "/learner/plan", label: "Lộ trình", icon: "fitness_center" },
      { href: "/learner/messages", label: "Tin nhắn", icon: "forum" },
      { href: "/learner/progress", label: "Tiến độ", icon: "monitoring" },
    ],
  },
  {
    label: "Tài khoản",
    items: [
      { href: "/learner/settings", label: "Cài đặt", icon: "settings" },
    ],
  },
];

const COACH_NAV: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/coach/dashboard", label: "Bảng điều khiển", icon: "space_dashboard" },
    ],
  },
  {
    label: "Huấn luyện",
    items: [
      { href: "/coach/learners", label: "Học viên", icon: "groups" },
      { href: "/coach/schedule", label: "Lịch", icon: "calendar_today" },
      { href: "/coach/messages", label: "Tin nhắn", icon: "forum" },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      { href: "/coach/training-packages", label: "Gói tập", icon: "inventory_2" },
      { href: "/coach/earnings", label: "Thu nhập", icon: "payments" },
      { href: "/coach/profile", label: "Hồ sơ", icon: "account_circle" },
      { href: "/coach/settings", label: "Cài đặt", icon: "settings" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/admin/dashboard", label: "Bảng điều khiển", icon: "space_dashboard" },
    ],
  },
  {
    label: "Quản lý người dùng",
    items: [
      { href: "/admin/users", label: "Người dùng", icon: "group" },
      { href: "/admin/reviews", label: "Đánh giá", icon: "star" },
    ],
  },
  {
    label: "Duyệt & Xác minh",
    items: [
      { href: "/admin/verifications", label: "Duyệt gói tập", icon: "inventory_2" },
      { href: "/admin/bank-verifications", label: "Duyệt tài khoản NH", icon: "account_balance" },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { href: "/admin/revenue", label: "Doanh thu", icon: "payments" },
      { href: "/admin/withdrawals", label: "Rút tiền", icon: "account_balance_wallet" },
      { href: "/admin/vouchers", label: "Voucher", icon: "local_offer" },
    ],
  },
  {
    label: "Cộng đồng",
    items: [
      { href: "/admin/community", label: "Kiểm duyệt bài đăng", icon: "shield" },
      { href: "/admin/reports", label: "Báo cáo vi phạm", icon: "flag" },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/admin/settings", label: "Cài đặt tài khoản", icon: "manage_accounts" },
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
  learner: "Học viên",
  coach: "Huấn luyện viên",
  admin: "Quản trị",
};

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = navForRole(role);
  const mobileOpen = useAppStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const currentUserId = useAppStore((s) => s.currentUserId);

  // ── Live mode: use the hydrated /api/auth/me user (real name, email, avatar).
  // ── Mock/demo mode: fall back to the mock fixture user (supports demo flows).
  const authUser = useAuthStore((s) => s.user);
  const { data: mockUser } = useApiResource(
    () => (isMockMode() ? api.fetchUser(currentUserId) : Promise.resolve(null)),
    [currentUserId],
  );

  // Prefer the hydrated backend user; fall back to the mock fixture.
  const displayName = authUser?.fullName ?? mockUser?.name ?? "Người dùng Sportico";
  const displayAvatar = authUser?.avatarUrl ?? mockUser?.avatarUrl ?? null;
  const displayEmail = authUser?.email ?? mockUser?.email ?? null;

  const handleLogout = () => {
    logout();
    useAuthStore.getState().clear();
    // replace, not push — prevents back-button from returning to a protected page
    router.replace("/login");
  };

  const settingsHref =
    role === "coach"
      ? "/coach/settings"
      : role === "admin"
        ? "/admin/settings"
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
          <Link
            href="/"
            aria-label="Sportico — home"
            className="inline-flex items-center"
          >
            <img
              src="/logo.png"
              alt="Sportico"
              className="h-10 w-auto rounded-[8px]"
            />
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
              Tạo buổi tập
            </Link>
          </div>
        )}

        {/* Learner CTA — become a coach */}
        {role === "learner" && (
          <div className="px-3 pb-1 pt-1">
            <Link
              href="/onboarding"
              className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-primary/30 bg-primary/[0.06] py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.1]"
            >
              <MaterialIcon name="workspace_premium" size={17} weight={500} />
              Trở thành HLV
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
              <UserAvatar
                avatarUrl={displayAvatar}
                name={displayName}
                email={displayEmail}
                size="sm"
                className="h-9 w-9 text-[12px]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-container-lowest bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-on-surface">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-on-surface-variant">
                {displayEmail ?? ROLE_LABEL[role]}
              </p>
            </div>
            <Link
              href={settingsHref}
              aria-label="Cài đặt"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <MaterialIcon name="settings" size={18} />
            </Link>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <MaterialIcon name="logout" size={19} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
