import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  iconFilled?: boolean;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  hint?: string;
  className?: string;
  variant?: "default" | "compact";
}

export function StatCard({
  label,
  value,
  icon,
  iconFilled = false,
  trend,
  hint,
  className,
  variant = "default",
}: StatCardProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex flex-col gap-2",
          className,
        )}
      >
        <p className="text-[11px] tracking-[0.05em] uppercase text-on-surface-variant font-medium">
          {label}
        </p>
        <div className="flex items-end justify-between gap-3">
          <span
            className="text-[24px] leading-[28px] font-medium text-on-surface"
            style={{ letterSpacing: "-0.02em" }}
          >
            {value}
          </span>
          {trend && (
            <TrendPill value={trend.value} direction={trend.direction} />
          )}
        </div>
        {hint && (
          <p className="text-body-sm text-on-surface-variant">{hint}</p>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex items-center gap-4",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-[10px] bg-surface-container-high flex items-center justify-center shrink-0">
          <MaterialIcon
            name={icon}
            filled={iconFilled}
            size={22}
            weight={500}
            className="text-primary"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] tracking-[0.05em] uppercase text-on-surface-variant font-medium">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[24px] leading-[28px] font-medium text-on-surface"
            style={{ letterSpacing: "-0.02em" }}
          >
            {value}
          </span>
          {trend && (
            <TrendPill value={trend.value} direction={trend.direction} />
          )}
        </div>
        {hint && (
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function TrendPill({
  value,
  direction,
}: {
  value: string;
  direction: "up" | "down" | "neutral";
}) {
  const colors =
    direction === "up"
      ? "text-[#1f7a4d] bg-[#d1f4dd]"
      : direction === "down"
        ? "text-[#ba1a1a] bg-[#ffdad6]"
        : "text-on-surface-variant bg-surface-container";
  const icon =
    direction === "up"
      ? "trending_up"
      : direction === "down"
        ? "trending_down"
        : "trending_flat";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium",
        colors,
      )}
    >
      <MaterialIcon name={icon} size={12} weight={500} />
      {value}
    </span>
  );
}
