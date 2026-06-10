"use client";

// PillNav — ported from React Bits (TS + Tailwind), adapted for Next.js App
// Router (internal hrefs use next/link) + an optional `rightContent` slot so a
// host navbar can render auth actions (login / avatar dropdown) on the right.
//
// Hover (GSAP, already a project dep): a full-cover fill layer rises from the
// bottom to fully paint the pill while the label swaps to
// `hoveredPillTextColor`; the logo spins; an optional initial-load reveal.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  /** Extra content rendered on the right of the bar (e.g. auth actions). */
  rightContent?: React.ReactNode;
  /** Logo click target. Defaults to "/". */
  logoHref?: string;
}

const isExternal = (href: string) =>
  /^(https?:)?\/\//.test(href) ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("#");

export function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className,
  ease = "power3.easeOut",
  baseColor = "#ffffff",
  pillColor = "#3525cd",
  hoveredPillTextColor = "#3525cd",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  rightContent,
  logoHref = "/",
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? "#ffffff";

  const fillRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Build per-pill hover timelines; recompute on resize / font load.
  useEffect(() => {
    const layout = () => {
      fillRefs.current.forEach((fill, index) => {
        const pill = fill?.parentElement as HTMLElement | undefined;
        if (!fill || !pill) return;
        const h = pill.getBoundingClientRect().height;
        if (!h) return;

        // Full-cover fill rises from the bottom edge → always paints the whole
        // pill (no uncovered rounded ends like a single growing circle).
        gsap.set(fill, { scaleY: 0, transformOrigin: "50% 100%" });

        const label = pill.querySelector<HTMLElement>(".pill-label");
        const hover = pill.querySelector<HTMLElement>(".pill-label-hover");
        if (label) gsap.set(label, { y: 0 });
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });
        tl.to(fill, { scaleY: 1, duration: 2, ease, overwrite: "auto" }, 0);
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        if (hover) tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        tlRefs.current[index] = tl;
      });
    };

    layout();
    window.addEventListener("resize", layout);
    if (document.fonts?.ready) document.fonts.ready.then(layout).catch(() => {});

    if (initialLoadAnimation) {
      if (logoRef.current) {
        gsap.fromTo(logoRef.current, { scale: 0 }, { scale: 1, duration: 0.6, ease });
      }
      if (navItemsRef.current) {
        gsap.fromTo(
          navItemsRef.current,
          { width: 0, overflow: "hidden" },
          { width: "auto", duration: 0.6, ease },
        );
      }
    }

    return () => window.removeEventListener("resize", layout);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: "auto" });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: "auto" });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, { rotate: 360, duration: 0.5, ease, overwrite: "auto" });
  };

  const toggleMobileMenu = () => {
    const open = !isMobileMenuOpen;
    setIsMobileMenuOpen(open);

    const lines = hamburgerRef.current?.querySelectorAll(".hamburger-line");
    if (lines) {
      gsap.to(lines[0], { rotation: open ? 45 : 0, y: open ? 3 : 0, duration: 0.3, ease });
      gsap.to(lines[1], { rotation: open ? -45 : 0, y: open ? -3 : 0, duration: 0.3, ease });
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      if (open) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.3, ease, transformOrigin: "top center" },
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: -8,
          duration: 0.2,
          ease,
          onComplete: () => gsap.set(menu, { visibility: "hidden" }),
        });
      }
    }

    onMobileMenuClick?.();
  };

  const closeMobileMenu = () => {
    if (!isMobileMenuOpen) return;
    toggleMobileMenu();
  };

  const cssVars = useMemo(
    () =>
      ({
        "--base": baseColor,
        "--pill-bg": pillColor,
        "--hover-text": hoveredPillTextColor,
        "--pill-text": resolvedPillTextColor,
      }) as React.CSSProperties,
    [baseColor, pillColor, hoveredPillTextColor, resolvedPillTextColor],
  );

  const renderPill = (item: PillNavItem, i: number) => {
    const active = activeHref === item.href;
    const content = (
      <>
        <span
          className="hover-fill pointer-events-none absolute inset-0 z-0 rounded-full"
          style={{ background: "var(--base)" }}
          ref={(el) => {
            fillRefs.current[i] = el;
          }}
        />
        <span className="label-stack relative z-10 inline-block leading-none">
          <span
            className="pill-label inline-block"
            style={{ color: active ? "var(--hover-text)" : "var(--pill-text)" }}
          >
            {item.label}
          </span>
          <span
            className="pill-label-hover absolute left-0 top-0 inline-block"
            style={{ color: "var(--hover-text)" }}
            aria-hidden="true"
          >
            {item.label}
          </span>
        </span>
      </>
    );

    const pillClass = cn(
      "pill relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-full border px-6 py-3.5 text-body-base font-semibold transition-colors",
      active && "is-active",
    );
    const pillStyle: React.CSSProperties = {
      background: active ? "var(--base)" : "var(--pill-bg)",
      borderColor: active
        ? "transparent"
        : "color-mix(in srgb, var(--pill-text) 30%, transparent)",
    };

    const inner = isExternal(item.href) ? (
      <a
        href={item.href}
        aria-label={item.ariaLabel || item.label}
        className={pillClass}
        style={pillStyle}
        onMouseEnter={() => handleEnter(i)}
        onMouseLeave={() => handleLeave(i)}
      >
        {content}
      </a>
    ) : (
      <Link
        href={item.href}
        aria-label={item.ariaLabel || item.label}
        className={pillClass}
        style={pillStyle}
        onMouseEnter={() => handleEnter(i)}
        onMouseLeave={() => handleLeave(i)}
      >
        {content}
      </Link>
    );

    return (
      <li key={item.href} role="none">
        {inner}
      </li>
    );
  };

  return (
    <div className={cn("relative flex w-full items-center", className)} style={cssVars}>
      {/* Logo (left) */}
      <Link
        ref={logoRef}
        href={logoHref}
        aria-label="Trang chủ"
        onMouseEnter={handleLogoEnter}
        className="flex shrink-0 items-center"
      >
        <img
          ref={logoImgRef}
          src={logo}
          alt={logoAlt}
          className="h-12 w-auto rounded-[8px] ring-1 ring-black/5"
        />
      </Link>

      {/* Desktop pills — absolutely centered in the bar, independent of the
          logo / right-cluster widths so they sit dead-center. */}
      <nav
        ref={navItemsRef}
        aria-label="Chính"
        className="absolute left-1/2 hidden w-max -translate-x-1/2 md:block"
      >
        <ul className="flex items-center gap-3" role="menubar">
          {items.map(renderPill)}
        </ul>
      </nav>

      {/* Right cluster (auth actions + mobile hamburger) */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {rightContent}
        <button
          ref={hamburgerRef}
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Mở menu"
          aria-expanded={isMobileMenuOpen}
          className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-[8px] md:hidden"
        >
          <span className="hamburger-line h-0.5 w-5 rounded-full" style={{ background: "var(--pill-text)" }} />
          <span className="hamburger-line h-0.5 w-5 rounded-full" style={{ background: "var(--pill-text)" }} />
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        ref={mobileMenuRef}
        className="invisible absolute left-0 right-0 top-[calc(100%+8px)] z-50 origin-top overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-2 opacity-0 shadow-[0_12px_32px_-12px_rgba(15,15,30,0.18),0_2px_6px_rgba(15,15,30,0.06)] md:hidden"
        role="menu"
      >
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = activeHref === item.href;
            const cls = cn(
              "block rounded-[10px] px-4 py-3 text-body-base font-semibold transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-on-surface hover:bg-surface-container-low",
            );
            return (
              <li key={item.href} role="none">
                {isExternal(item.href) ? (
                  <a href={item.href} role="menuitem" className={cls} onClick={closeMobileMenu}>
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} role="menuitem" className={cls} onClick={closeMobileMenu}>
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
