"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StaggeredMenuButton } from "@/components/landing/StaggeredMenu";
import { cn } from "@/lib/utils";

interface PublicNavbarProps {
  /**
   * `solid` (default) — white background, bottom border. Use on clean pages.
   * `transparent` — overlays a dark hero (white text), then switches to
   * `solid` automatically once the user scrolls past 40px.
   */
  variant?: "transparent" | "solid";
}

interface NavLink {
  label: string;
  href: string;
}

// Public-facing nav. Only routes that exist on the platform are listed here;
// "Trở thành Huấn luyện viên" is treated as a CTA elsewhere because its
// visibility depends on the viewer's role.
const BASE_LINKS: NavLink[] = [
  { label: "Huấn Luyện Viên", href: "/learner/coaches" },
  { label: "Về Chúng Tôi", href: "/" },
];

const BECOME_COACH_HREF = "/coach/onboarding";
const LOGIN_HREF = "/login";
const REGISTER_HREF = "/register";

/** Returns `true` if this viewer should see the "Become a coach" CTA. Guests
 *  and signed-in learners see it; coaches and admins do not. */
function canShowBecomeCoach(role: Role, isAuthenticated: boolean): boolean {
  if (!isAuthenticated) return true;
  return role === "learner";
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
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware: transparent variant flips to solid after 40px.
  useEffect(() => {
    if (variant !== "transparent") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const transparent = variant === "transparent" && !scrolled;

  // ------------------------------------------------------------------------
  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 transition-colors duration-200",
        transparent
          ? "bg-transparent"
          : "border-b border-[var(--color-border-soft)] bg-surface-container-lowest",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label="Sportico — trang chủ"
          className="flex shrink-0 items-center"
        >
          <img
            src="/logo.png"
            alt="Sportico"
            className={cn(
              "h-9 w-auto rounded-[6px] transition-all",
              transparent
                ? "shadow-[0_4px_14px_-2px_rgba(53,37,205,0.55)] ring-1 ring-white/15"
                : "",
            )}
          />
        </Link>

        {/* Center links — desktop only */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {BASE_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-body-base font-medium transition-colors",
                transparent
                  ? "text-white/85 hover:text-white"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions — desktop */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {showBecomeCoach && (
            <Link
              href={BECOME_COACH_HREF}
              className={cn(
                "rounded-[6px] border px-3.5 py-2 text-body-sm font-semibold transition-colors",
                transparent
                  ? "border-white/40 text-white hover:bg-white/10"
                  : "border-primary/30 bg-primary/[0.06] text-primary hover:bg-primary/10",
              )}
            >
              Trở Thành HLV
            </Link>
          )}

          {isAuthenticated ? (
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
                href={LOGIN_HREF}
                className={cn(
                  "rounded-[6px] border px-3.5 py-2 text-body-sm font-semibold transition-colors",
                  transparent
                    ? "border-white/40 text-white hover:bg-white/10"
                    : "border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
                )}
              >
                Đăng nhập
              </Link>
              <Link
                href={REGISTER_HREF}
                className="rounded-[6px] bg-primary px-3.5 py-2 text-body-sm font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
              >
                Bắt đầu
              </Link>
            </>
          )}
        </div>

        {/* Hamburger / StaggeredMenu — mobile only */}
        <StaggeredMenuButton transparent={transparent} className="md:hidden" />
      </div>
    </header>
  );
}

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
          className="h-8 w-8 rounded-full object-cover"
        />
        <span
          className={cn(
            "max-w-[140px] truncate text-body-sm font-semibold",
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
