"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";

interface PublicNavbarProps {
  /**
   * `solid` (default) — white background, bottom border. Use on clean pages.
   * `transparent` — overlays a dark hero (white text), then switches to
   * `solid` automatically once the user scrolls past 40px.
   */
  variant?: "transparent" | "solid";
}

const NAV_LINKS = [
  { label: "Find Coaches", href: "/learner/coaches" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "For Coaches", href: "/#for-coaches" },
  { label: "Pricing", href: "#" },
];

// Demo routing — wire these to real auth once a backend exists.
const LOGIN_HREF = "/login";
const SIGNUP_HREF = "/register";

export function PublicNavbar({ variant = "solid" }: PublicNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const transparent = variant === "transparent" && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 transition-colors duration-200",
        transparent
          ? "bg-transparent"
          : "border-b border-[var(--color-border-soft)] bg-surface-container-lowest",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label="Sportico — home"
          className="flex items-center"
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
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-body-base underline-offset-[6px] transition-colors hover:underline hover:decoration-2 hover:decoration-primary",
                transparent
                  ? "text-white/80 hover:text-white"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href={LOGIN_HREF}
            className={cn(
              "rounded-[6px] border px-3.5 py-2 text-body-base font-medium transition-colors",
              transparent
                ? "border-white/40 text-white hover:bg-white/10"
                : "border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
            )}
          >
            Log In
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="rounded-[6px] bg-primary px-3.5 py-2 text-body-base font-medium text-on-primary transition-colors hover:bg-[#2d20b8]"
          >
            Get Started
          </Link>
        </div>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
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
          open ? "" : "pointer-events-none",
        )}
      >
        {/* Overlay */}
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col bg-surface-container-lowest transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border-soft)] px-5">
            <span className="text-h3 text-primary">ProCoach AI</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="-mr-2 rounded-[6px] p-2 text-on-surface hover:bg-surface-container-low"
            >
              <MaterialIcon name="close" size={22} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[6px] px-3 py-2.5 text-body-base text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border-soft)] p-4">
            <Link
              href={LOGIN_HREF}
              onClick={() => setOpen(false)}
              className="rounded-[6px] border border-[var(--color-border-soft)] px-3.5 py-2.5 text-center text-body-base font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Log In
            </Link>
            <Link
              href={SIGNUP_HREF}
              onClick={() => setOpen(false)}
              className="rounded-[6px] bg-primary px-3.5 py-2.5 text-center text-body-base font-medium text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
