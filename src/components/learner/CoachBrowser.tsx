"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { AVAILABLE_SPORTS } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Coach, Sport } from "@/types";

const PRICE_FILTERS = [
  { label: "Any price", min: 0, max: 999 },
  { label: "Under $50", min: 0, max: 49 },
  { label: "$50 – $80", min: 50, max: 80 },
  { label: "$80 and up", min: 81, max: 999 },
];

const SORTS = [
  { key: "match", label: "Best match" },
  { key: "rating", label: "Top rated" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

/** Public coach directory UI. Wrap with an `AppShell` for the in-app version
 *  (`/learner/coaches`) or render directly under `PublicNavbar` for the
 *  marketing-facing version (`/coaches`). Detail navigation still goes to the
 *  in-app coach profile route. */
export function CoachBrowser() {
  const {
    data: coachesData,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoaches(), []);
  const allCoaches = useMemo(() => coachesData ?? [], [coachesData]);

  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<Sport | "All">("All");
  const [priceIdx, setPriceIdx] = useState(0);
  const [topRated, setTopRated] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("match");

  const topMatch = useMemo(
    () =>
      [...allCoaches].sort(
        (a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0),
      )[0],
    [allCoaches],
  );

  const coaches = useMemo(() => {
    const price = PRICE_FILTERS[priceIdx];
    return allCoaches
      .filter((c) => {
        if (query) {
          const q = query.toLowerCase();
          if (
            !c.name.toLowerCase().includes(q) &&
            !c.headline.toLowerCase().includes(q) &&
            !c.specialties.join(" ").toLowerCase().includes(q)
          )
            return false;
        }
        if (sport !== "All" && c.sport !== sport) return false;
        if (c.hourlyRate < price.min || c.hourlyRate > price.max) return false;
        if (topRated && c.rating < 4.8) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "rating":
            return b.rating - a.rating;
          case "price-asc":
            return a.hourlyRate - b.hourlyRate;
          case "price-desc":
            return b.hourlyRate - a.hourlyRate;
          default:
            return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
        }
      });
  }, [allCoaches, query, sport, priceIdx, topRated, sortKey]);

  const filtersActive =
    query !== "" || sport !== "All" || priceIdx !== 0 || topRated;

  const resetFilters = () => {
    setQuery("");
    setSport("All");
    setPriceIdx(0);
    setTopRated(false);
  };

  if (loading) {
    return <LoadingState label="Đang tải danh sách huấn luyện viên…" />;
  }

  if (error) {
    return (
      <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-7 pb-6">
      {/* ---------- Header ---------- */}
      <header>
        <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-on-surface sm:text-[30px]">
          Find your coach
        </h1>
        <p className="mt-1.5 text-[15px] text-on-surface-variant">
          {allCoaches.length} verified coaches across{" "}
          {AVAILABLE_SPORTS.length} disciplines — curated and ranked for you.
        </p>
      </header>

      {/* ---------- AI Match hero ---------- */}
      <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#3525cd_0%,#4f46e5_52%,#7c3aed_100%)] p-6 shadow-[0_24px_50px_-26px_rgba(53,37,205,0.6)] sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_80%_80%_at_15%_0%,#000,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
              <MaterialIcon name="auto_awesome" filled size={13} />
              AI Coach Matching
            </span>
            <h2 className="mt-3.5 text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[30px]">
              Let AI find the coach who fits you best
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
              Answer five quick questions. We&apos;ll score every coach
              against your goals, schedule and training style — then tell you
              exactly why each one fits.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/learner/ai-match"
                className="group inline-flex items-center gap-2 rounded-[8px] bg-white px-5 py-3 text-[14px] font-semibold text-primary shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
              >
                <MaterialIcon name="auto_awesome" filled size={17} />
                Start AI Match
                <MaterialIcon
                  name="arrow_forward"
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-white/70">
                <MaterialIcon name="schedule" size={15} />
                Takes about 60 seconds
              </span>
            </div>
          </div>

          {/* Top match preview */}
          {topMatch && (
            <div className="w-full shrink-0 rounded-[16px] border border-white/15 bg-white/10 p-4 backdrop-blur-xl lg:w-[290px]">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/65">
                <MaterialIcon name="emoji_events" filled size={13} />
                Your top match today
              </p>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={topMatch.avatarUrl}
                  alt={topMatch.name}
                  className="h-12 w-12 rounded-[12px] object-cover ring-2 ring-white/20"
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">
                    {topMatch.name}
                  </p>
                  <p className="truncate text-[12px] text-white/65">
                    {topMatch.headline}
                  </p>
                </div>
              </div>
              <div className="mt-3.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-white/65">Compatibility</span>
                  <span className="font-semibold text-white">
                    {topMatch.matchPercent}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${topMatch.matchPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Filter panel ---------- */}
      <section className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5 shadow-[0_1px_2px_rgba(16,16,16,0.03)] sm:p-4">
        <div className="flex h-11 items-center rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 transition-colors focus-within:border-primary">
          <MaterialIcon
            name="search"
            size={19}
            className="text-on-surface-variant"
          />
          <input
            type="text"
            name="coach-search"
            aria-label="Search coaches"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, sport or specialty…"
            className="ml-2.5 flex-1 bg-transparent text-[14px] outline-none placeholder:text-on-surface-variant"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
            >
              <MaterialIcon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Sport chips — single scrollable row */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SportChip
            active={sport === "All"}
            onClick={() => setSport("All")}
            label="All sports"
          />
          {AVAILABLE_SPORTS.map((s) => (
            <SportChip
              key={s}
              active={sport === s}
              onClick={() => setSport(s)}
              label={s}
            />
          ))}
        </div>
      </section>

      {/* ---------- Refine row ---------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="text-[14px] text-on-surface-variant">
          <span className="font-semibold text-on-surface">
            {coaches.length}
          </span>{" "}
          {coaches.length === 1 ? "coach" : "coaches"}
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="ml-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              <MaterialIcon name="close" size={13} />
              Clear filters
            </button>
          )}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Select
            value={String(priceIdx)}
            onChange={(e) => setPriceIdx(Number(e.target.value))}
            aria-label="Filter by price"
          >
            {PRICE_FILTERS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </Select>

          <button
            onClick={() => setTopRated((v) => !v)}
            aria-pressed={topRated}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition-colors",
              topRated
                ? "border-primary/30 bg-primary/8 text-primary"
                : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary/40",
            )}
          >
            <MaterialIcon name="star" filled size={14} />
            Top rated
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[13px] text-on-surface-variant">Sort</span>
            <Select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort coaches"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ---------- Results ---------- */}
      {coaches.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach, i) => (
            <CoachCard key={coach.id} coach={coach} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
            <MaterialIcon
              name="search_off"
              size={24}
              className="text-on-surface-variant"
            />
          </div>
          <p className="mt-4 text-[16px] font-semibold text-on-surface">
            No coaches match these filters
          </p>
          <p className="mt-1 text-[14px] text-on-surface-variant">
            Try broadening your search or clearing a filter.
          </p>
          <button
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ sub-components ----------------------------- */

function SportChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      )}
    >
      {label}
    </button>
  );
}

function Select({
  value,
  onChange,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="h-9 cursor-pointer appearance-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest pl-3 pr-8 text-[13px] font-medium text-on-surface outline-none transition-colors hover:border-primary/40 focus:border-primary"
        {...rest}
      >
        {children}
      </select>
      <MaterialIcon
        name="expand_more"
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
    </div>
  );
}

function CoachCard({ coach, index }: { coach: Coach; index: number }) {
  const [saved, setSaved] = useState(false);
  const profileHref = `/learner/coaches/${coach.id}`;
  const fastBooking = coach.activeLearners >= 24;
  const topMatch = (coach.matchPercent ?? 0) >= 98;

  return (
    <article
      className="group animate-rise-in relative flex flex-col rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-26px_rgba(53,37,205,0.4)]"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      {/* profile */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <img
            src={coach.avatarUrl}
            alt={coach.name}
            className="h-[60px] w-[60px] rounded-[14px] object-cover"
          />
          {coach.verified && (
            <span
              className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface-container-lowest"
              title="Verified coach"
            >
              <MaterialIcon name="verified" filled size={13} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={profileHref}
              className="truncate text-[16px] font-semibold text-on-surface transition-colors hover:text-primary"
            >
              {coach.name}
            </Link>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/[0.07] px-2 py-1 text-[12px] font-semibold text-primary">
              <MaterialIcon name="auto_awesome" filled size={12} />
              {coach.matchPercent}%
            </span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
            {coach.headline}
          </p>
          {topMatch && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
              <MaterialIcon name="bolt" filled size={12} />
              Top match
            </span>
          )}
        </div>
      </div>

      {/* rating + location */}
      <div className="mt-3.5 flex items-center gap-2.5 text-[13px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <MaterialIcon
            name="star"
            filled
            size={15}
            className="text-amber-500"
          />
          <span className="font-semibold text-on-surface">
            {coach.rating.toFixed(1)}
          </span>
          ({coach.reviewCount})
        </span>
        <span className="h-3 w-px bg-[var(--color-border-soft)]" />
        <span className="inline-flex min-w-0 items-center gap-1">
          <MaterialIcon name="location_on" size={14} />
          <span className="truncate">{coach.location}</span>
        </span>
      </div>

      {/* intro preview */}
      <p className="mt-3 line-clamp-2 min-h-[42px] text-[13px] leading-relaxed text-on-surface-variant">
        {coach.bio}
      </p>

      {/* tags */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <span className="rounded-[6px] bg-primary/[0.06] px-2 py-1 text-[11px] font-medium text-primary">
          {coach.sport}
        </span>
        {coach.specialties.slice(0, 2).map((s) => (
          <span
            key={s}
            className="rounded-[6px] bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant"
          >
            {s}
          </span>
        ))}
      </div>

      {/* availability */}
      <div className="mt-3.5 flex items-center gap-1.5 text-[12px] font-medium">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            fastBooking ? "bg-amber-500" : "bg-[#1f9d57]",
          )}
        />
        <span className={fastBooking ? "text-amber-700" : "text-[#1f7a4d]"}>
          {fastBooking ? "Booking fast — few slots left" : "Available this week"}
        </span>
      </div>

      {/* footer */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
        <p className="text-[15px] font-semibold text-on-surface">
          {formatCurrency(coach.hourlyRate, coach.currency)}
          <span className="text-[13px] font-normal text-on-surface-variant">
            {" "}
            /hr
          </span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaved((v) => !v)}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save coach"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[8px] border transition-colors",
              saved
                ? "border-primary/30 bg-primary/8 text-primary"
                : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary/40 hover:text-primary",
            )}
          >
            <MaterialIcon name="favorite" filled={saved} size={17} />
          </button>
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1 rounded-[8px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
          >
            View profile
            <MaterialIcon
              name="arrow_forward"
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
