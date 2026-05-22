import { CoachCard } from "@/components/common/CoachCard";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import type { Coach } from "@/types";

/**
 * Product-preview mockup for the hero — reuses the real CoachCard with a
 * decorative "98% Match" badge and an AI note to suggest the live product.
 */
export function HeroPreview({ coach }: { coach: Coach }) {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <CoachCard coach={coach} showMatch={false} className="shadow-sm" />

      {/* Floating match badge */}
      <div className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full border border-primary/20 bg-surface-container-lowest px-3 py-1.5 shadow-sm">
        <MaterialIcon
          name="auto_awesome"
          filled
          size={14}
          className="text-primary"
        />
        <span className="text-body-sm font-medium uppercase tracking-wider text-primary">
          98% Match
        </span>
      </div>

      {/* Floating AI note */}
      <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary text-on-primary">
          <MaterialIcon name="bolt" filled size={16} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
            AI Matched
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Based on your goals
          </p>
        </div>
      </div>
    </div>
  );
}
