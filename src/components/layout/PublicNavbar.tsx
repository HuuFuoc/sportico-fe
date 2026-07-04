"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import {
  AnimatedNavigationTabs,
  type AnimatedNavItem,
} from "@/components/ui/animated-navigation-tabs";
import { useAuthStore, primaryRole } from "@/lib/store/useAuthStore";
import { logout } from "@/lib/auth-api";
import { getCurrentUserId } from "@/lib/auth-session";
import { avatarFor, cn } from "@/lib/utils";
import { NotificationNavButton } from "@/components/layout/navbar/NotificationNavButton";
import { MessageNavButton } from "@/components/layout/navbar/MessageNavButton";
import type { Role } from "@/types";

interface PublicNavbarProps {
  /**
   * `solid` (default) — white background, bottom border. Use on clean pages.
   * `transparent` — overlays a dark hero (white text), then switches to
   * `solid` automatically once the user scrolls past 40px.
   */
  variant?: "transparent" | "solid";
}

// Base nav (always visible). Routes are the project's real pages — there is no
// `/become-coach` route, so "Trở thành HLV" points to the real `/onboarding`.
const NAV_BASE: AnimatedNavItem[] = [
  { id: 1, tile: "Trang chủ", href: "/" },
  { id: 2, tile: "Huấn luyện viên", href: "/coaches" },
  { id: 3, tile: "Về chúng tôi", href: "/about" },
];
const BECOME_COACH: AnimatedNavItem = { id: 4, tile: "Trở thành HLV", href: "/onboarding" };

function buildNavItems(role: Role | null): AnimatedNavItem[] {
  // Hide "Trở thành HLV" for coaches/admins; guests + learners still see it.
  const showBecomeCoach = role !== "coach" && role !== "admin";
  return showBecomeCoach ? [...NAV_BASE, BECOME_COACH] : NAV_BASE;
}

/** The active item's href: exact for "/", prefix-match for sub-routes. */
function resolveActiveHref(items: AnimatedNavItem[], pathname: string): string | undefined {
  return items.find((i) =>
    i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(`${i.href}/`),
  )?.href;
}

function dashboardHref(role: Role): string {
  return `/${role}/dashboard`;
}

function settingsHref(role: Role): string {
  if (role === "admin") return "/admin/console";
  return `/${role}/settings`;
}

/** In-app inbox route for the role, or null when the role has no messages page
 *  (admins have no inbox) — used to decide whether to show the chat icon. */
function messagesHrefFor(role: Role): string | null {
  if (role === "learner") return "/learner/messages";
  if (role === "coach") return "/coach/messages";
  return null;
}

export function PublicNavbar({ variant = "solid" }: PublicNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  // Auth state from the hydrated store
  const authUser = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const isAuthenticated = authStatus === "authenticated" && authUser !== null;

  // Derive the UI role from the real auth user: admin > coach > learner.
  const role = primaryRole(authUser);
  const menuRole: Role = role ?? "learner";

  const displayName = authUser?.fullName ?? "Người dùng";
  const avatarSrc = authUser?.avatarUrl ?? avatarFor(authUser?.id ?? "guest");

  // Resolve the signed-in user's id for thread lookups (real session first,
  // then the auth store user as a fallback).
  const currentUserId = getCurrentUserId() ?? authUser?.id ?? "";
  const inboxHref = messagesHrefFor(menuRole);

  const navItems = buildNavItems(role);
  const activeHref = resolveActiveHref(navItems, pathname);

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

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const transparent = variant === "transparent" && !scrolled;

  // Tab colors flip with the header state so contrast holds on both surfaces.
  const tabColors = transparent
    ? {
        active: "text-white",
        inactive: "text-white/70 hover:text-white",
        indicator: "bg-white",
        hover: "bg-white/10",
      }
    : {
        active: "text-primary",
        inactive: "text-on-surface-variant hover:text-primary",
        indicator: "bg-primary",
        hover: "bg-primary/10",
      };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-20 transition-colors duration-200",
        transparent
          ? "bg-transparent"
          : "border-b border-[var(--color-border-soft)] bg-surface-container-lowest",
      )}
    >
      <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
        {/* Logo (left) */}
        <Link href="/" aria-label="Trang chủ" className="flex shrink-0 items-center">
          <img
            src="/logo.png"
            alt="Sportico"
            className="h-12 w-auto rounded-[8px] ring-1 ring-black/5"
          />
        </Link>

        {/* Desktop tabs — absolutely centered, independent of side widths */}
        <nav
          aria-label="Chính"
          className="absolute left-1/2 hidden w-max -translate-x-1/2 md:block"
        >
          <AnimatedNavigationTabs
            items={navItems}
            activeHref={activeHref}
            activeClassName={tabColors.active}
            inactiveClassName={tabColors.inactive}
            indicatorClassName={tabColors.indicator}
            hoverClassName={tabColors.hover}
          />
        </nav>

        {/* Right cluster (auth actions + mobile hamburger) */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {isAuthenticated && (
            <>
              <NotificationNavButton
                transparent={transparent}
                seeAllHref={dashboardHref(menuRole)}
              />
              {inboxHref && (
                <MessageNavButton
                  userId={currentUserId}
                  transparent={transparent}
                  messagesHref={inboxHref}
                />
              )}
            </>
          )}
          {isAuthenticated ? (
            <UserMenu
              displayName={displayName}
              avatarSrc={avatarSrc}
              role={menuRole}
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
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-[8px] transition-colors md:hidden",
              transparent ? "text-white hover:bg-white/10" : "text-on-surface hover:bg-surface-container-low",
            )}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              ref={mobileRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-4 right-4 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-2 shadow-[0_12px_32px_-12px_rgba(15,15,30,0.18),0_2px_6px_rgba(15,15,30,0.06)] md:hidden"
            >
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = item.href === activeHref;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block rounded-[10px] px-4 py-3 text-body-base font-semibold transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-on-surface hover:bg-surface-container-low",
                        )}
                      >
                        {item.tile}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
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
