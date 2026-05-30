"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { avatarFor, cn } from "@/lib/utils";
import { logout } from "@/lib/auth-api";
import {
  getCurrentUser as getJwtUser,
  type CurrentUser,
} from "@/lib/auth-session";
import {
  useAuthStore,
  userIsAdmin,
  userIsCoach,
} from "@/lib/store/useAuthStore";
import type { Role } from "@/types";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Two auth sources merged for resilience:
  //  • JWT (sync) — flips the navbar to "authenticated" immediately on mount
  //    so the user does not see a flash of "Đăng nhập".
  //  • useAuthStore — canonical /api/auth/me payload (fullName, avatarUrl, roles).
  const [jwtUser, setJwtUser] = useState<CurrentUser | null>(null);
  const storeUser = useAuthStore((s) => s.user);
  const storeStatus = useAuthStore((s) => s.status);
  const clearStoreAuth = useAuthStore((s) => s.clear);

  useEffect(() => {
    setJwtUser(getJwtUser());
    void useAuthStore.getState().hydrate();
  }, []);

  // Scroll-aware: transparent variant flips to solid after 40px.
  useEffect(() => {
    if (variant !== "transparent") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close the user dropdown on outside click + Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // ---- Derived auth state -------------------------------------------------
  const isAuthenticated =
    Boolean(storeUser) || storeStatus === "authenticated" || Boolean(jwtUser);
  const role: Role = storeUser
    ? userIsAdmin(storeUser)
      ? "admin"
      : userIsCoach(storeUser)
        ? "coach"
        : "learner"
    : (jwtUser?.role ?? "learner");
  const showBecomeCoach = canShowBecomeCoach(role, isAuthenticated);

  const displayName =
    storeUser?.fullName?.trim() || jwtUser?.email || "Tài khoản";
  const avatarSrc =
    storeUser?.avatarUrl ||
    avatarFor(storeUser?.id ?? jwtUser?.userId ?? "guest");

  const handleLogout = () => {
    logout();
    clearStoreAuth();
    setJwtUser(null);
    setMenuOpen(false);
    setDrawerOpen(false);
    router.push("/");
  };

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

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở menu"
          className={cn(
            "-mr-2 rounded-[6px] p-2 transition-colors md:hidden",
            transparent
              ? "text-white hover:bg-white/10"
              : "text-on-surface hover:bg-surface-container-low",
          )}
        >
          <MaterialIcon name="menu" size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[60] md:hidden",
          drawerOpen ? "" : "pointer-events-none",
        )}
      >
        {/* Overlay */}
        <div
          onClick={() => setDrawerOpen(false)}
          aria-hidden
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[320px] max-w-[88vw] flex-col bg-surface-container-lowest transition-transform duration-200",
            drawerOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] px-5">
            <span className="text-h3 font-semibold text-primary">Sportico</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng menu"
              className="-mr-2 rounded-[6px] p-2 text-on-surface hover:bg-surface-container-low"
            >
              <MaterialIcon name="close" size={22} />
            </button>
          </div>

          {/* User identity block (only when authenticated) */}
          {isAuthenticated && (
            <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
              <img
                src={avatarSrc}
                alt={displayName}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-base font-semibold text-on-surface">
                  {displayName}
                </p>
                <p className="text-body-sm capitalize text-on-surface-variant">
                  {role === "learner"
                    ? "Học viên"
                    : role === "coach"
                      ? "Huấn luyện viên"
                      : "Quản trị viên"}
                </p>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-1 p-4">
            {BASE_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="rounded-[6px] px-3 py-2.5 text-body-base text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
            {showBecomeCoach && (
              <Link
                href={BECOME_COACH_HREF}
                onClick={() => setDrawerOpen(false)}
                className="rounded-[6px] border border-primary/30 bg-primary/[0.06] px-3 py-2.5 text-body-base font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Trở Thành Huấn Luyện Viên
              </Link>
            )}
            {isAuthenticated && (
              <>
                <Link
                  href={dashboardHref(role)}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-[6px] px-3 py-2.5 text-body-base text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                >
                  Bảng điều khiển
                </Link>
                <Link
                  href={settingsHref(role)}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-[6px] px-3 py-2.5 text-body-base text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                >
                  Cài đặt
                </Link>
              </>
            )}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border-soft)] p-4">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-[6px] border border-[var(--color-border-soft)] px-3.5 py-2.5 text-body-base font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
              >
                Đăng xuất
              </button>
            ) : (
              <>
                <Link
                  href={LOGIN_HREF}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-[6px] border border-[var(--color-border-soft)] px-3.5 py-2.5 text-center text-body-base font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  Đăng nhập
                </Link>
                <Link
                  href={REGISTER_HREF}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-[6px] bg-primary px-3.5 py-2.5 text-center text-body-base font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
                >
                  Bắt đầu
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// User dropdown (desktop)
// ============================================================================

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
      <MaterialIcon
        name={icon}
        size={18}
        className="text-on-surface-variant"
      />
      {label}
    </Link>
  );
}
