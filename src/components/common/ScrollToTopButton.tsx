"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdvisoryVisible } from "@/lib/hooks/useAdvisoryVisible";
import { useAdvisoryUi } from "@/lib/store/useAdvisoryUi";

/**
 * Floating "scroll to top" button — bottom-right.
 *
 * - Hidden by default; fades in once the user scrolls past `threshold` px.
 * - Smooth-scrolls back to top on click (instant if reduced motion).
 * - Sits above any sticky save-bar / bulk-action-bar (z-50) but below modals.
 */
export function ScrollToTopButton({
  threshold = 400,
}: {
  threshold?: number;
}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  // The advisory FAB stacks ABOVE this button (authenticated learner), so when
  // it's present we align this one to the FAB's corner column. While the chat
  // panel is open we hide this button entirely to avoid clutter behind it.
  const advisoryVisible = useAdvisoryVisible();
  const advisoryOpen = useAdvisoryUi((s) => s.open);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const onClick = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduce ? "instant" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible && !advisoryOpen && (
        <motion.button
          key="scroll-top"
          type="button"
          onClick={onClick}
          aria-label="Cuộn lên đầu trang"
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{
            duration: reduce ? 0 : 0.25,
            ease: [0.16, 1, 0.3, 1],
          }}
          whileHover={reduce ? {} : { y: -2 }}
          whileTap={reduce ? {} : { scale: 0.94 }}
          className={cn(
            "group fixed z-50 inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] border border-slate-200 bg-white/95 text-slate-700 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.08)] backdrop-blur transition-colors hover:border-violet-300 hover:text-violet-700",
            advisoryVisible
              ? // Corner, aligned to the FAB column; the FAB raises above this.
                "bottom-4 right-4 sm:bottom-6 sm:right-6"
              : "bottom-6 right-6 sm:bottom-8 sm:right-8",
          )}
        >
          {/* Hover gradient sweep */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/0 via-violet-500/0 to-fuchsia-500/0 opacity-0 transition-opacity duration-300 group-hover:from-violet-500/10 group-hover:via-violet-500/5 group-hover:to-fuchsia-500/10 group-hover:opacity-100"
          />
          <ArrowUp
            size={17}
            strokeWidth={2.25}
            className="relative transition-transform duration-300 group-hover:-translate-y-0.5"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
