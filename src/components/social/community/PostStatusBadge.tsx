import { POST_STATUS_BADGE_CLASS, POST_STATUS_LABELS } from "@/lib/social/labels";
import { cn } from "@/lib/utils";

export function PostStatusBadge({ status, className }: { status: string | null; className?: string }) {
  const key = (status ?? "").toLowerCase();
  return (
    <span
      className={cn(
        "shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold",
        POST_STATUS_BADGE_CLASS[key] ?? "bg-slate-100 text-slate-600",
        className,
      )}
    >
      {POST_STATUS_LABELS[key] ?? status ?? "—"}
    </span>
  );
}
