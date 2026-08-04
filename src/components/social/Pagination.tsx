"use client";

import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * Compact pager for the social lists (community, admin tables, redemptions…).
 * Keeps the previous page's data on screen while a new page loads — callers
 * pair this with `placeholderData: keepPreviousData` on the query.
 */
export function Pagination({ pageNumber, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(pageNumber, totalPages);

  return (
    <nav
      aria-label="Phân trang"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onChange(pageNumber - 1)}
        disabled={pageNumber <= 1}
        aria-label="Trang trước"
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-soft)] text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <NavArrowLeft width={16} height={16} />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-[13px] text-on-surface-variant">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === pageNumber ? "page" : undefined}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[13px] font-medium tabular-nums transition-colors",
              p === pageNumber
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(pageNumber + 1)}
        disabled={pageNumber >= totalPages}
        aria-label="Trang sau"
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-soft)] text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <NavArrowRight width={16} height={16} />
      </button>
    </nav>
  );
}

function pageWindow(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const add = (n: number) => out.push(n);
  const window = 1;

  add(1);
  if (current - window > 2) out.push("…");
  for (let p = Math.max(2, current - window); p <= Math.min(total - 1, current + window); p++) {
    add(p);
  }
  if (current + window < total - 1) out.push("…");
  if (total > 1) add(total);

  return out;
}
