"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CoachCard } from "@/components/common/CoachCard";
import { AIBadge } from "@/components/common/AIBadge";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatCurrency } from "@/lib/utils";
import { mockCoaches, AVAILABLE_SPORTS } from "@/lib/mock/users";
import type { Sport } from "@/types";

const PRICE_FILTERS = [
  { label: "All prices", min: 0, max: 999 },
  { label: "< $50/hr", min: 0, max: 49 },
  { label: "$50–80/hr", min: 50, max: 80 },
  { label: "$80+", min: 81, max: 999 },
];

export default function BrowseCoachesPage() {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<Sport | "All">("All");
  const [priceIdx, setPriceIdx] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [aiOnly, setAIOnly] = useState(true);

  const coaches = useMemo(() => {
    return mockCoaches
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
        const p = PRICE_FILTERS[priceIdx];
        if (c.hourlyRate < p.min || c.hourlyRate > p.max) return false;
        if (c.rating < minRating) return false;
        return true;
      })
      .sort((a, b) =>
        aiOnly
          ? (b.matchPercent ?? 0) - (a.matchPercent ?? 0)
          : b.rating - a.rating,
      );
  }, [query, sport, priceIdx, minRating, aiOnly]);

  return (
    <AppShell role="learner" title="Find Coaches">
      <div className="space-y-5 max-w-[1400px]">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1 text-on-surface">Find Your Coach</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Browse {mockCoaches.length} verified coaches across{" "}
              {AVAILABLE_SPORTS.length} sports.
            </p>
          </div>
          <Link
            href="/learner/ai-match"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors whitespace-nowrap"
          >
            <MaterialIcon name="auto_awesome" filled size={18} />
            Use AI Match
          </Link>
        </header>

        {/* Search */}
        <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 space-y-3">
          <div className="flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-10">
            <MaterialIcon
              name="search"
              size={18}
              className="text-on-surface-variant"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, sport, or specialty..."
              className="flex-1 ml-2 bg-transparent outline-none text-body-base"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 hover:bg-surface-container rounded"
              >
                <MaterialIcon name="close" size={16} />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Chip
              active={sport === "All"}
              onClick={() => setSport("All")}
              label="All sports"
            />
            {AVAILABLE_SPORTS.map((s) => (
              <Chip
                key={s}
                active={sport === s}
                onClick={() => setSport(s)}
                label={s}
              />
            ))}

            <div className="flex items-center gap-2 ml-auto pl-3 border-l border-[var(--color-border-soft)]">
              <AIBadge label="AI Match" />
              <button
                onClick={() => setAIOnly((v) => !v)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiOnly ? "bg-primary" : "bg-surface-container-highest",
                )}
                aria-pressed={aiOnly}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                    aiOnly ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {PRICE_FILTERS.map((p, i) => (
              <Chip
                key={p.label}
                active={priceIdx === i}
                onClick={() => setPriceIdx(i)}
                label={p.label}
              />
            ))}
            <Chip
              active={minRating === 4.5}
              onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
              label="4.5+ Rating"
              icon="star"
            />
            <Chip
              active={minRating === 4.8}
              onClick={() => setMinRating(minRating === 4.8 ? 0 : 4.8)}
              label="4.8+ Rating"
              icon="star"
            />
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-body-base text-on-surface-variant">
            <span className="text-on-surface font-medium">
              {coaches.length}
            </span>{" "}
            coaches found
          </p>
          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <MaterialIcon name="sort" size={16} />
            Sorted by{" "}
            <span className="text-on-surface font-medium">
              {aiOnly ? "AI Match" : "Rating"}
            </span>
          </div>
        </div>

        {/* Results grid (horizontal cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {coaches.map((c) => (
            <HorizontalCoachCard key={c.id} coach={c} />
          ))}
        </div>

        {coaches.length === 0 && (
          <div className="bg-surface-container-lowest border border-dashed border-[var(--color-border-soft)] rounded-[10px] p-12 text-center">
            <MaterialIcon
              name="search_off"
              size={32}
              className="text-on-surface-variant"
            />
            <p className="text-h3 mt-3">No coaches match these filters</p>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Try removing a filter or broadening your search.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 h-8 rounded-[6px] text-[12px] font-medium uppercase tracking-wider transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
      )}
    >
      {icon && <MaterialIcon name={icon} size={13} filled />}
      {label}
    </button>
  );
}

function HorizontalCoachCard({
  coach,
}: {
  coach: (typeof mockCoaches)[number];
}) {
  return (
    <Link
      href={`/learner/coaches/${coach.id}`}
      className="group bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex gap-4 hover:border-primary transition-colors"
    >
      <div className="relative w-[120px] h-[120px] rounded-[8px] overflow-hidden shrink-0 bg-surface-container-high">
        <img
          src={coach.avatarUrl}
          alt={coach.name}
          className="w-full h-full object-cover"
        />
        {coach.matchPercent && coach.matchPercent >= 95 && (
          <span className="absolute top-1 left-1 bg-primary text-on-primary text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded">
            Top Match
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-h3 text-on-surface group-hover:text-primary transition-colors truncate">
              {coach.name}
            </h3>
            <div className="flex items-center gap-1 text-body-sm text-on-surface-variant">
              <MaterialIcon
                name="star"
                filled
                size={14}
                className="text-amber-500"
              />
              <span>
                {coach.rating.toFixed(1)} ({coach.reviewCount} reviews)
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-h3 text-primary leading-none">
              {formatCurrency(coach.hourlyRate, coach.currency)}
              <span className="text-body-sm text-on-surface-variant font-normal">
                /hr
              </span>
            </p>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-1 justify-end mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1f7a4d]" />
              Available
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] uppercase tracking-wider text-on-surface-variant">
            {coach.sport}
          </span>
          {coach.specialties.slice(0, 2).map((sp) => (
            <span
              key={sp}
              className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] uppercase tracking-wider text-on-surface-variant"
            >
              {sp}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-3 flex gap-2 items-center">
          <span className="flex-1 text-center py-2 border border-[var(--color-border-soft)] rounded-[6px] text-[11px] uppercase tracking-wider font-medium hover:bg-surface-container-low transition-colors">
            View Profile
          </span>
          <span
            className="w-10 h-10 flex items-center justify-center border border-[var(--color-border-soft)] rounded-[6px] hover:text-primary transition-colors"
            aria-hidden
          >
            <MaterialIcon name="favorite" size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
