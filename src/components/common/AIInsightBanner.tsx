import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/types";

interface AIInsightBannerProps {
  insight: AIInsight;
  className?: string;
  layout?: "row" | "stack";
}

export function AIInsightBanner({
  insight,
  className,
  layout = "row",
}: AIInsightBannerProps) {
  const accent =
    insight.severity === "warning"
      ? "border-[#f4d68a]/60 bg-[#fff5d6]/40"
      : insight.severity === "success"
        ? "border-[#bce8c8] bg-[#eaf8ef]/60"
        : "border-primary/15 bg-primary/[0.04]";

  return (
    <div
      className={cn(
        "rounded-[10px] border p-4 flex gap-3 items-start",
        layout === "stack" ? "flex-col" : "flex-row sm:flex-row",
        accent,
        className,
      )}
    >
      <div className="w-9 h-9 rounded-[8px] bg-primary text-on-primary flex items-center justify-center shrink-0">
        <MaterialIcon name="auto_awesome" filled size={20} weight={500} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] tracking-[0.06em] uppercase text-primary font-medium">
          {insight.title}
        </p>
        <p className="text-body-base text-on-surface mt-0.5">{insight.body}</p>
      </div>
      {insight.cta && (
        <Link
          href={insight.cta.href}
          className="text-primary font-medium text-body-base hover:underline shrink-0 self-center"
        >
          {insight.cta.label} →
        </Link>
      )}
    </div>
  );
}
