import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { formatCurrency } from "@/lib/utils";
import type { Coach } from "@/types";

/** Authentic coaching action shot — a coach running a live tennis session. */
const HERO_ACTION_SHOT =
  "https://images.unsplash.com/photo-1634840542403-1a9b1067aaa0?w=1100&q=80&auto=format&fit=crop";

const PREVIEW_MATCH = 98;

/**
 * Glass product-preview for the hero — a single self-contained coach card
 * plus one floating analytics chip. No badges overlap or clip text.
 */
export function HeroPreview({ coach }: { coach: Coach }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* soft brand glow */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-tr from-indigo-300/40 via-violet-300/25 to-transparent blur-2xl"
      />

      {/* main glass card */}
      <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/80 shadow-[0_30px_70px_-25px_rgba(53,37,205,0.45)] backdrop-blur-xl">
        {/* action shot */}
        <div className="relative aspect-[16/11]">
          <img
            src={HERO_ACTION_SHOT}
            alt="A coach running a training session with an athlete on a tennis court"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-on-surface backdrop-blur">
            <MaterialIcon
              name="verified"
              filled
              size={13}
              className="text-primary"
            />
            Verified coach
          </span>
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-white">
                {coach.name}
              </p>
              <p className="truncate text-[12px] text-white/85">
                {coach.headline}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[12px] font-semibold text-on-surface backdrop-blur">
              <MaterialIcon
                name="star"
                filled
                size={13}
                className="text-amber-500"
              />
              {coach.rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* body */}
        <div className="p-4">
          <div className="rounded-[12px] border border-primary/15 bg-primary/[0.05] p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                <MaterialIcon name="auto_awesome" filled size={14} />
                AI Match
              </span>
              <span
                className="text-[18px] font-semibold leading-none text-primary"
                style={{ letterSpacing: "-0.02em" }}
              >
                {PREVIEW_MATCH}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                style={{ width: `${PREVIEW_MATCH}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-on-surface-variant">
              Matched to your goals, schedule &amp; training style
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant">
              <MaterialIcon name="sports_tennis" size={16} />
              {coach.sport}
            </span>
            <span className="text-[13px] text-on-surface-variant">
              from{" "}
              <span className="font-semibold text-on-surface">
                {formatCurrency(coach.hourlyRate, coach.currency)}
              </span>
              /hr
            </span>
          </div>
        </div>
      </div>

      {/* floating analytics chip */}
      <div className="animate-float-y absolute -bottom-7 -left-7 hidden rounded-[16px] border border-white/70 bg-white/85 p-3 pr-4 shadow-[0_18px_44px_-14px_rgba(53,37,205,0.4)] backdrop-blur-xl sm:block">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary to-violet-500 text-white">
            <MaterialIcon name="trending_up" size={20} />
          </div>
          <div>
            <p className="text-[17px] font-semibold leading-none text-on-surface">
              +18%
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              faster progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
