"use client";

// AnimatedNavigationTabs — based on 21st.dev/ln-dev7/animated-navigation-tabs.
// Adapted for this app: the demo's full-screen <main> wrapper + internal active
// state are removed so it works as a real router-driven navbar. Active state is
// controlled from the outside via `activeHref` (derived from usePathname), each
// tab is a next/link, and the colors are configurable so the same component
// reads correctly over both the white bar and the dark hero. The animated
// underline + hover pill (motion layoutId) are preserved verbatim.

import { motion } from "motion/react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Keep the registry's field name (`tile`) and add a real route.
export type AnimatedNavItem = {
  id: number;
  tile: string;
  href: string;
};

interface AnimatedNavigationTabsProps {
  items: AnimatedNavItem[];
  /** Href of the active tab (compare against usePathname upstream). */
  activeHref?: string;
  className?: string;
  /** Text color class for the active tab. */
  activeClassName?: string;
  /** Text color class (+ hover) for inactive tabs. */
  inactiveClassName?: string;
  /** Background class for the underline indicator. */
  indicatorClassName?: string;
  /** Background class for the hover pill. */
  hoverClassName?: string;
  /** Close handler fired on tab click (e.g. to dismiss a mobile menu). */
  onNavigate?: () => void;
}

export function AnimatedNavigationTabs({
  items,
  activeHref,
  className,
  activeClassName = "text-primary",
  inactiveClassName = "text-on-surface-variant hover:text-primary",
  indicatorClassName = "bg-primary",
  hoverClassName = "bg-primary/10",
  onNavigate,
}: AnimatedNavigationTabsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ul className={cn("flex items-center justify-center", className)}>
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={onNavigate}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "relative block py-2 text-body-base font-medium transition-colors duration-300",
                active ? activeClassName : inactiveClassName,
              )}
            >
              <div className="relative px-5 py-2">
                {item.tile}
                {hovered === item.id && (
                  <motion.div
                    layoutId="nav-hover-bg"
                    className={cn("absolute inset-0 h-full w-full", hoverClassName)}
                    style={{ borderRadius: 6 }}
                  />
                )}
              </div>
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5 w-full", indicatorClassName)}
                />
              )}
              {hovered === item.id && (
                <motion.div
                  layoutId="nav-hover-underline"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5 w-full", indicatorClassName)}
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
