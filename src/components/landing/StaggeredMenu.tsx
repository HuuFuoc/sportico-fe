"use client";

// ============================================================================
// StaggeredMenu — premium full-screen nav overlay for the public landing.
//
// Uses gsap for stagger-in / stagger-out animations on the menu items.
// The trigger is a self-contained hamburger ↔ X button; the full-screen
// overlay is always in the DOM (not conditionally rendered) so gsap can
// animate it out cleanly.
//
// Accessibility:
//   • aria-expanded on the toggle button
//   • role="dialog" + aria-modal on the overlay
//   • Closes on Escape key + outside click
//   • Focus-visible ring on all interactive elements
//   • Body scroll locked while open
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { label: "Trang chủ", href: "/", ariaLabel: "Đi tới trang chủ" },
  {
    label: "Tìm HLV",
    href: "/learner/coaches",
    ariaLabel: "Tìm huấn luyện viên",
  },
  {
    label: "Cách hoạt động",
    href: "/#how-it-works",
    ariaLabel: "Xem cách Sportico hoạt động",
  },
  {
    label: "Dành cho HLV",
    href: "/#for-coaches",
    ariaLabel: "Thông tin dành cho huấn luyện viên",
  },
  { label: "Bảng giá", href: "/#pricing", ariaLabel: "Xem bảng giá" },
] as const;

interface StaggeredMenuButtonProps {
  /** Match the navbar transparent mode so the icon color is correct. */
  transparent?: boolean;
  className?: string;
}

export function StaggeredMenuButton({
  transparent = false,
  className,
}: StaggeredMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // ── Declare all functions before effects so they are in scope ─────────────

  const animateHamburgerOpen = useCallback(() => {
    const [l1, l2, l3] = [
      line1Ref.current,
      line2Ref.current,
      line3Ref.current,
    ];
    if (!l1 || !l2 || !l3) return;
    gsap.to(l1, { rotate: 45, y: 7, duration: 0.22, ease: "power2.inOut" });
    gsap.to(l2, { opacity: 0, scaleX: 0, duration: 0.14 });
    gsap.to(l3, { rotate: -45, y: -7, duration: 0.22, ease: "power2.inOut" });
  }, []);

  const animateHamburgerClose = useCallback(() => {
    const [l1, l2, l3] = [
      line1Ref.current,
      line2Ref.current,
      line3Ref.current,
    ];
    if (!l1 || !l2 || !l3) return;
    gsap.to(l1, { rotate: 0, y: 0, duration: 0.22, ease: "power2.inOut" });
    gsap.to(l2, {
      opacity: 1,
      scaleX: 1,
      duration: 0.22,
      delay: 0.06,
      ease: "power2.out",
    });
    gsap.to(l3, { rotate: 0, y: 0, duration: 0.22, ease: "power2.inOut" });
  }, []);

  const closeMenu = useCallback(() => {
    const overlay = overlayRef.current;
    const items = itemsRef.current.filter(Boolean) as HTMLLIElement[];
    if (!overlay) return;

    if (tlRef.current) tlRef.current.kill();

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false);
        gsap.set(overlay, { display: "none" });
      },
    });
    tl.to(items, {
      y: -28,
      opacity: 0,
      duration: 0.28,
      stagger: 0.04,
      ease: "power2.in",
    }).to(overlay, { opacity: 0, duration: 0.18 }, "-=0.1");
    tlRef.current = tl;
    animateHamburgerClose();
  }, [animateHamburgerClose]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    const overlay = overlayRef.current;
    const items = itemsRef.current.filter(Boolean) as HTMLLIElement[];
    if (!overlay) return;

    if (tlRef.current) tlRef.current.kill();

    gsap.set(overlay, { display: "flex" });
    gsap.set(items, { y: 52, opacity: 0 });

    const tl = gsap.timeline();
    tl.fromTo(
      overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.22, ease: "power2.out" },
    ).to(
      items,
      {
        y: 0,
        opacity: 1,
        duration: 0.52,
        stagger: 0.07,
        ease: "power3.out",
      },
      "-=0.08",
    );
    tlRef.current = tl;
    animateHamburgerOpen();
  }, [animateHamburgerOpen]);

  // ── Effects (all functions declared above) ────────────────────────────────

  // Close on route change
  useEffect(() => {
    if (isOpen) closeMenu();
    // Intentionally omit isOpen — we only want this to run when pathname changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, closeMenu]);

  // Keyboard ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) closeMenu();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeMenu]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggle = () => (isOpen ? closeMenu() : openMenu());

  return (
    <>
      {/* Hamburger toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Đóng menu" : "Mở menu"}
        aria-expanded={isOpen}
        aria-controls="staggered-nav-overlay"
        className={cn(
          "relative flex h-10 w-10 flex-col items-center justify-center gap-[5.5px] rounded-[8px] p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          transparent
            ? "text-white hover:bg-white/10"
            : "text-on-surface hover:bg-surface-container-low",
          className,
        )}
      >
        {(
          [
            { ref: line1Ref, width: "w-[20px]" },
            { ref: line2Ref, width: "w-[14px]" },
            { ref: line3Ref, width: "w-[20px]" },
          ] as const
        ).map(({ ref, width }, i) => (
          <span
            key={i}
            ref={ref}
            className={cn(
              "block h-[2px] origin-center rounded-full",
              width,
              transparent ? "bg-white" : "bg-on-surface",
            )}
          />
        ))}
      </button>

      {/* Full-screen overlay — always in DOM, gsap controls display */}
      <div
        ref={overlayRef}
        id="staggered-nav-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Điều hướng chính"
        style={{ display: "none" }}
        className="fixed inset-0 z-[70] flex-col items-center justify-center bg-[#07070f]/97 backdrop-blur-2xl"
      >
        {/* Close hit area behind items */}
        <div
          className="absolute inset-0"
          onClick={closeMenu}
          aria-hidden="true"
        />

        {/* Nav items */}
        <nav
          aria-label="Menu chính"
          className="relative z-10 flex flex-col items-center"
        >
          <ul className="flex flex-col items-center gap-0" role="list">
            {MENU_ITEMS.map((item, i) => (
              <li
                key={item.href}
                ref={(el) => {
                  itemsRef.current[i] = el;
                }}
              >
                <Link
                  href={item.href}
                  aria-label={item.ariaLabel}
                  onClick={closeMenu}
                  className={cn(
                    "group flex items-baseline gap-4 px-8 py-3.5",
                    "text-[clamp(2rem,6vw,3rem)] font-bold tracking-tight",
                    "text-white/60 transition-colors duration-150 hover:text-white",
                    "focus-visible:outline-none focus-visible:rounded-lg",
                    "focus-visible:ring-2 focus-visible:ring-[#7d6dff]",
                    "focus-visible:ring-offset-4 focus-visible:ring-offset-[#07070f]",
                  )}
                >
                  <span className="text-[clamp(0.75rem,2vw,1rem)] font-mono tabular-nums text-white/20 transition-colors group-hover:text-primary/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom CTAs */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <Link
            href="/login"
            onClick={closeMenu}
            className="rounded-[8px] border border-white/15 px-5 py-2.5 text-[14px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            onClick={closeMenu}
            className="rounded-[8px] bg-primary px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#2d20b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070f]"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </div>
    </>
  );
}
