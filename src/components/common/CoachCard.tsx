import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { UserAvatar } from "@/components/common/UserAvatar";
import { cn, formatCurrency } from "@/lib/utils";
import type { Coach } from "@/types";

interface CoachCardProps {
  coach: Coach;
  className?: string;
  showMatch?: boolean;
  /** Make the entire card clickable. Defaults to `/coaches/[id]`. */
  href?: string;
}

export function CoachCard({
  coach,
  className,
  showMatch = true,
  href,
}: CoachCardProps) {
  const link = href ?? `/coaches/${coach.id}`;
  return (
    <Link
      href={link}
      className={cn(
        "group block bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden transition-colors hover:border-primary",
        className,
      )}
    >
      <div className="relative h-32 bg-surface-container-high overflow-hidden">
        <UserAvatar
          avatarUrl={coach.avatarUrl}
          name={coach.name}
          className="h-full w-full rounded-none text-[28px]"
        />
        {showMatch && typeof coach.matchPercent === "number" && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur text-[10px] font-medium text-primary border border-primary/20">
            {coach.matchPercent}% phù hợp
          </span>
        )}
        {coach.verified && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur text-[10px] font-medium text-on-surface border border-[var(--color-border-soft)]">
            <MaterialIcon
              name="verified"
              filled
              size={12}
              className="text-primary"
            />
            Đã xác minh
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-h3 text-on-surface group-hover:text-primary transition-colors">
            {coach.name}
          </h4>
          <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
            <MaterialIcon
              name="star"
              filled
              size={14}
              className="text-amber-500"
            />
            {coach.rating.toFixed(1)}
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant mb-3 line-clamp-2 min-h-[36px]">
          {coach.headline}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-body-base font-medium text-primary">
            {formatCurrency(coach.hourlyRate, coach.currency)}
            <span className="text-on-surface-variant font-normal">/hr</span>
          </span>
          <span className="text-body-sm text-on-surface-variant">
            {coach.sport ?? "HLV"}
          </span>
        </div>
      </div>
    </Link>
  );
}
