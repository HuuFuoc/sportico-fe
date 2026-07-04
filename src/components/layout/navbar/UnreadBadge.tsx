import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  /** Cap displayed as "N+". Default 99. */
  max?: number;
  /** Ring color that separates the badge from the icon underneath.
   *  Match the surface the badge sits on (dark hero vs. white navbar). */
  ringClassName?: string;
  className?: string;
}

/**
 * Small red pill counter anchored to the top-right of an icon button.
 * Renders nothing when `count <= 0`.
 */
export function UnreadBadge({
  count,
  max = 99,
  ringClassName = "ring-surface-container-lowest",
  className,
}: UnreadBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold leading-none text-white tabular-nums ring-2",
        ringClassName,
        className,
      )}
      aria-hidden="true"
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
