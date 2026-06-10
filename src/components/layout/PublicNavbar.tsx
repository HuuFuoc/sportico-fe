"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { PillNav, type PillNavItem } from "@/components/ui/PillNav";
import { useAuthStore, primaryRole } from "@/lib/store/useAuthStore";
import { logout } from "@/lib/auth-api";
import { avatarFor, cn } from "@/lib/utils";
import type { Role } from "@/types";

interface PublicNavbarProps {
  /**
   * `solid` (default) — white background, bottom border. Use on clean pages.
   * `transparent` — overlays a dark hero (white text), then switches to
   * `solid` automatically once the user scrolls past 40px.
   */
  variant?: "transparent" | "solid";
}

// Role-aware center menus. Routes are mapped to pages that actually exist in
// this app (e.g. become-coach → /onboarding, /coach → /coach/dashboard).
const GUEST_LINKS: PillNavItem[] = [
  { label: "Huấn luyện viên", href: "/coaches" },
  { label: "Về chúng tôi", href: "/about" },
  { label: "Trở thành HLV", href: "/onboarding" },
];

const LEARNER_LINKS: PillNavItem[] = [
  { label: "Huấn luyện viên", href: "/coaches" },
  { label: "Lịch học", href: "/learner/bookings" },
];

const COACH_LINKS: PillNavItem[] = [
  { label: "Dashboard", href: "/coach/dashboard" },
  { label: "Học viên", href: "/coach/learners" },
  { label: "Lịch dạy", href: "/coach/schedule" },
];

const ADMIN_LINKS: PillNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Người dùng", href: "/admin/users" },
  { label: "Báo cáo", href: "/admin/reviews" },
];

function menuFor(isAuthenticated: boolean, role: Role): PillNavItem[] {
  if (!isAuthenticated) return GUEST_LINKS;
  if (role === "admin") return ADMIN_LINKS;
  if (role === "coach") return COACH_LINKS;
  return LEARNER_LINKS;
}

function dashboardHref(role: Role): string {
  return `/${role}/dashboard`;
}

function settingsHref(role: Role): string {
  if (role === "admin") return "/admin/console";
  return `/${role}/settings`;
}

export function PublicNavbar({ variant = "solid" }: PublicNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Auth state from the hydrated store
  const authUser = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const isAuthenticated = authStatus === "authenticated" && authUser !== null;

  // Derive the UI role from the real auth user: admin > coach > learner.
  const role: Role = primaryRole(authUser) ?? "learner";

  const displayName = authUser?.fullName ?? "Người dùng";
  const avatarSrc = authUser?.avatarUrl ?? avatarFor(authUser?.id ?? "guest");
  const items = menuFor(isAuthenticated, role);

  // Logout handler: clear tokens + auth store + go to login
  const handleLogout = () => {
    logout();
    useAuthStore.getState().clear();
    router.push("/login");
  };

  // Scroll-aware: transparent variant flips to solid after 40px.
  useEffect(() => {
    if (variant !== "transparent") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const transparent = variant === "transparent" && !scrolled;

  // Ghost pills (text only) when inactive; filled when active/hovered. Colors
  // flip with the header state so contrast holds on both the white solid bar
  // and the dark hero. baseColor = the fill of the hover circle + active pill.
  const pillColors = transparent
    ? { base: "#ffffff", pill: "transparent", text: "#ffffff", hover: "#3525cd" }
    : { base: "#3525cd", pill: "transparent", text: "#3525cd", hover: "#ffffff" };

  const rightContent = isAuthenticated ? (
    <UserMenu
      displayName={displayName}
      avatarSrc={avatarSrc}
      role={role}
      transparent={transparent}
      open={menuOpen}
      onToggle={() => setMenuOpen((v) => !v)}
      onClose={() => setMenuOpen(false)}
      onLogout={handleLogout}
      menuRef={menuRef}
    />
  ) : (
    <>
      <Link
        href="/login"
        className={cn(
          "rounded-full border px-5 py-3 text-body-base font-semibold transition-colors",
          transparent
            ? "border-white/40 text-white hover:bg-white/10"
            : "border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        )}
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="hidden rounded-full bg-primary px-5 py-3 text-body-base font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] sm:inline-flex"
      >
        Bắt đầu
      </Link>
    </>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-20 transition-colors duration-200",
        transparent
          ? "bg-transparent"
          : "border-b border-[var(--color-border-soft)] bg-surface-container-lowest",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center px-6">
        <PillNav
          logo="/logo.png"
          logoAlt="Sportico"
          items={items}
          activeHref={pathname}
          baseColor={pillColors.base}
          pillColor={pillColors.pill}
          pillTextColor={pillColors.text}
          hoveredPillTextColor={pillColors.hover}
          initialLoadAnimation={variant === "transparent"}
          rightContent={rightContent}
        />
      </div>
    </header>
  );
}

// ── UserMenu dropdown ─────────────────────────────────────────────────────────

function UserMenu({
  displayName,
  avatarSrc,
  role,
  transparent,
  open,
  onToggle,
  onClose,
  onLogout,
  menuRef,
}: {
  displayName: string;
  avatarSrc: string;
  role: Role;
  transparent: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors",
          transparent
            ? "bg-white/10 hover:bg-white/15"
            : "bg-surface-container-low hover:bg-surface-container",
        )}
      >
        <img
          src={avatarSrc}
          alt={displayName}
          className="h-10 w-10 rounded-full object-cover"
        />
        <span
          className={cn(
            "hidden max-w-[140px] truncate text-body-sm font-semibold sm:inline",
            transparent ? "text-white" : "text-on-surface",
          )}
        >
          {displayName}
        </span>
        <MaterialIcon
          name="expand_more"
          size={18}
          className={cn(
            "transition-transform",
            open && "rotate-180",
            transparent ? "text-white/80" : "text-on-surface-variant",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_12px_32px_-12px_rgba(15,15,30,0.18),0_2px_6px_rgba(15,15,30,0.06)]"
        >
          <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
            <p className="truncate text-body-base font-semibold text-on-surface">
              {displayName}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              {role === "learner"
                ? "Học viên"
                : role === "coach"
                  ? "Huấn luyện viên"
                  : "Quản trị viên"}
            </p>
          </div>
          <div className="py-1">
            <MenuItem
              href={dashboardHref(role)}
              icon="dashboard"
              label="Bảng điều khiển"
              onSelect={onClose}
            />
            <MenuItem
              href={settingsHref(role)}
              icon="settings"
              label="Cài đặt"
              onSelect={onClose}
            />
          </div>
          <div className="border-t border-[var(--color-border-soft)] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-body-base text-error transition-colors hover:bg-error/5"
            >
              <MaterialIcon name="logout" size={18} />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MenuItem helper ───────────────────────────────────────────────────────────

function MenuItem({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 px-4 py-2.5 text-body-base text-on-surface transition-colors hover:bg-surface-container-low"
    >
      <MaterialIcon name={icon} size={18} className="text-on-surface-variant" />
      {label}
    </Link>
  );
}
