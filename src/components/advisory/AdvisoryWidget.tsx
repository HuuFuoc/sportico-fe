"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageCircle, RotateCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdvisoryChat } from "@/lib/hooks/useAdvisoryChat";
import { useScrolledPast } from "@/lib/hooks/useScrolledPast";
import { useAdvisoryUi } from "@/lib/store/useAdvisoryUi";
import { AdvisoryChat } from "@/components/advisory/AdvisoryChat";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Floating AI advisory assistant. Mounted once in the learner layout so the
 * conversation survives both closing the panel and navigating between learner
 * pages: the `useAdvisoryChat` hook lives HERE (the always-mounted widget),
 * while `AdvisoryChat` (the panel body) mounts/unmounts with `open`.
 */
export function AdvisoryWidget() {
  const reduce = useReducedMotion();
  const { messages, isSending, error, sendMessage, retryLast, resetConversation } =
    useAdvisoryChat();
  const open = useAdvisoryUi((s) => s.open);
  const setOpen = useAdvisoryUi((s) => s.setOpen);
  const toggle = useAdvisoryUi((s) => s.toggle);
  // When the page is scrolled, the scroll-to-top button appears in the corner;
  // lift the (closed) FAB above it so the chat button sits on top.
  const scrolled = useScrolledPast(400);

  // Esc closes the panel. We deliberately do NOT close on outside-click so the
  // user never loses an in-progress conversation by tapping the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Trợ lý tư vấn ghép HLV"
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ transformOrigin: "bottom right" }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest",
              "shadow-[0_12px_40px_-8px_rgba(15,15,30,0.25)]",
              // Mobile: near-full, anchored to the bottom; height in dvh so the
              // body shrinks (and the input stays visible) when the keyboard opens.
              "bottom-3 left-3 right-3 h-[70dvh] max-h-[80dvh]",
              // Desktop: fixed-width card floating above the FAB at bottom-right.
              "sm:left-auto sm:right-6 sm:bottom-24 sm:h-[min(70vh,600px)] sm:w-[380px] sm:max-h-none",
            )}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border-soft)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <Sparkles size={16} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-h3 leading-tight text-on-surface">
                    Trợ lý tư vấn
                  </h2>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    Gợi ý HLV phù hợp với bạn
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  disabled={isSending}
                  aria-label="Cuộc trò chuyện mới"
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border-soft)] px-2 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCw size={13} />
                  <span className="hidden sm:inline">Mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng trợ lý tư vấn"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Body + composer (presentational) */}
            <AdvisoryChat
              messages={messages}
              isSending={isSending}
              error={error}
              onSend={sendMessage}
              onRetry={retryLast}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB ───────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Đóng trợ lý tư vấn" : "Mở trợ lý tư vấn"}
        aria-expanded={open}
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary",
          "shadow-[0_8px_24px_-6px_rgba(53,37,205,0.6)] transition-all duration-300 hover:scale-105",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
          // Closed + scrolled → raised above the scroll-to-top button (which sits
          // in the corner). Otherwise anchor in the corner so the open panel can
          // float above it cleanly.
          !open && scrolled
            ? "bottom-20 right-4 sm:bottom-24 sm:right-6"
            : "bottom-4 right-4 sm:bottom-6 sm:right-6",
          // On mobile the open panel covers the FAB's corner — hide it there and
          // rely on the header's X to close. Desktop keeps the FAB (panel floats above).
          open && "hidden sm:flex",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={reduce ? false : { opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 30 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </>
  );
}
