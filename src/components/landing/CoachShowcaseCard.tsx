import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { formatCurrency } from "@/lib/utils";
import type { Coach } from "@/types";

/**
 * Data-rich coach card for the landing showcase — leads with verifiable
 * trust signals (rating, reviews, experience, athletes) rather than a bare
 * portrait, so the marketplace reads as real and credible.
 */
export function CoachShowcaseCard({ coach }: { coach: Coach }) {
  return (
    <Link
      href={`/learner/coaches/${coach.id}`}
      className="group flex flex-col rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_26px_55px_-26px_rgba(53,37,205,0.4)]"
    >
      {/* header */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <img
            src={coach.avatarUrl}
            alt={coach.name}
            className="h-14 w-14 rounded-[14px] object-cover"
          />
          {coach.verified && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface-container-lowest">
              <MaterialIcon name="verified" filled size={13} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold text-on-surface transition-colors group-hover:text-primary">
            {coach.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-on-surface-variant">
            {coach.headline}
          </p>
        </div>
      </div>

      {/* rating + match */}
      <div className="mt-3.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[13px]">
          <MaterialIcon
            name="star"
            filled
            size={15}
            className="text-amber-500"
          />
          <span className="font-semibold text-on-surface">
            {coach.rating.toFixed(1)}
          </span>
          <span className="text-on-surface-variant">
            ({coach.reviewCount})
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[12px] font-semibold text-primary">
          <MaterialIcon name="auto_awesome" filled size={12} />
          {coach.matchPercent}% match
        </span>
      </div>

      {/* stat row */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--color-border-soft)] overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/60">
        <Stat value={`${coach.yearsExperience} yrs`} label="Experience" />
        <Stat value={coach.activeLearners} label="Athletes" />
        <Stat value={coach.sport} label="Discipline" />
      </div>

      {/* specialties */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {coach.specialties.slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-[6px] bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant"
          >
            {s}
          </span>
        ))}
      </div>

      {/* footer */}
      <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
        <span className="text-[15px] font-semibold text-on-surface">
          {formatCurrency(coach.hourlyRate, coach.currency)}
          <span className="text-[13px] font-normal text-on-surface-variant">
            {" "}
            /hr
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          View profile
          <MaterialIcon
            name="arrow_forward"
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="px-2 py-2.5 text-center">
      <p className="truncate text-[14px] font-semibold text-on-surface">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-on-surface-variant">
        {label}
      </p>
    </div>
  );
}
