"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Minimal accessible dialog shared by every confirm/hide/resolve flow in the
 * admin + social surfaces. Closes on Escape and backdrop click; focus starts
 * on the panel so screen readers announce the title immediately.
 */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-lg rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_8px_32px_-8px_rgba(15,15,30,0.25)] focus:outline-none",
              className,
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="modal-title" className="text-[16px] font-semibold text-on-surface">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-[13px] text-on-surface-variant">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                <Xmark width={18} height={18} />
              </button>
            </div>
            <div>{children}</div>
            {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
