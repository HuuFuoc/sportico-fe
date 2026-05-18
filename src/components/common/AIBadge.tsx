import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";

interface AIBadgeProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function AIBadge({ label = "AI", className, size = "sm" }: AIBadgeProps) {
  const padding = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const iconSize = size === "md" ? 14 : 12;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 text-primary font-medium",
        padding,
        className,
      )}
      style={{ fontSize: 11, letterSpacing: "0.04em" }}
    >
      <MaterialIcon
        name="auto_awesome"
        filled
        size={iconSize}
        weight={500}
      />
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  );
}
