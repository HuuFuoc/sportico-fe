"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ChevronDown } from "lucide-react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api, getSportId } from "@/lib/api";
import { AVAILABLE_SPORTS, sportLabel } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState } from "@/components/common/AsyncStates";
import { UserAvatar } from "@/components/common/UserAvatar";
import type { Coach, Sport } from "@/types";

// ── Types & constants ─────────────────────────────────────────────────────────

const SORTS = [
  { key: "match", label: "Phù hợp nhất" },
  { key: "rating", label: "Đánh giá cao nhất" },
  { key: "experienced", label: "Kinh nghiệm nhiều nhất" },
  { key: "newest", label: "Mới nhất" },
  { key: "name_az", label: "Tên A-Z" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

type ExperienceKey = "all" | "0-2" | "3-5" | "6-10" | "10+";

const EXPERIENCE_OPTIONS: { key: ExperienceKey; label: string }[] = [
  { key: "all", label: "Kinh nghiệm" },
  { key: "0-2", label: "0–2 năm" },
  { key: "3-5", label: "3–5 năm" },
  { key: "6-10", label: "6–10 năm" },
  { key: "10+", label: "10+ năm" },
];

type RatingKey = "all" | "4.5+" | "4.0+" | "has_reviews";

const RATING_OPTIONS: { key: RatingKey; label: string }[] = [
  { key: "all", label: "Đánh giá" },
  { key: "4.5+", label: "★ 4.5 trở lên" },
  { key: "4.0+", label: "★ 4.0 trở lên" },
  { key: "has_reviews", label: "Đã có đánh giá" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function getCoachExperienceYears(coach: Coach): number {
  return coach.yearsExperience ?? 0;
}

function matchesExperienceRange(years: number, range: ExperienceKey): boolean {
  if (range === "all") return true;
  if (range === "0-2") return years >= 0 && years <= 2;
  if (range === "3-5") return years >= 3 && years <= 5;
  if (range === "6-10") return years >= 6 && years <= 10;
  if (range === "10+") return years >= 10;
  return true;
}

function matchesRatingFilter(coach: Coach, key: RatingKey): boolean {
  if (key === "all") return true;
  const rating = coach.rating ?? 0;
  const hasReviews = (coach.reviewCount ?? 0) > 0;
  if (key === "4.5+") return hasReviews && rating >= 4.5;
  if (key === "4.0+") return hasReviews && rating >= 4.0;
  if (key === "has_reviews") return hasReviews;
  return true;
}

function sortCoaches(coaches: Coach[], key: SortKey): Coach[] {
  return [...coaches].sort((a, b) => {
    switch (key) {
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "experienced":
        return getCoachExperienceYears(b) - getCoachExperienceYears(a);
      case "newest":
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      case "name_az":
        return a.name.localeCompare(b.name, "vi");
      default:
        return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
    }
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CoachBrowser() {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<Sport | "All">("All");
  const [expRange, setExpRange] = useState<ExperienceKey>("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [ratingKey, setRatingKey] = useState<RatingKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("match");

  // Re-fetch from backend whenever the selected sport changes.
  const {
    data: coachesData,
    loading,
    error,
    refetch,
  } = useApiResource(
    () => api.fetchCoaches(sport !== "All" ? { sport } : undefined),
    [sport],
  );

  const allCoaches = useMemo(() => coachesData ?? [], [coachesData]);

  // Derive unique location options from the loaded coach list.
  const locationOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const c of allCoaches) {
      const loc = c.location?.trim();
      if (loc) seen.add(loc);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "vi"));
  }, [allCoaches]);

  const coaches = useMemo(() => {
    const filtered = allCoaches.filter((c) => {
      if (!c.id || !c.name?.trim()) return false;
      const nameLower = c.name.toLowerCase();
      if (nameLower === "system" || nameLower.startsWith("system ")) return false;

      // Platform constraint: only Badminton and Pickleball coaches.
      // sport=null coaches (no sport configured yet) are kept to avoid silently
      // hiding valid coaches.
      if (c.sport !== null && c.sport !== "Badminton" && c.sport !== "Pickleball")
        return false;

      // Sport chip filter. When sportId is cached, backend already filtered;
      // fall back to client-side check when sportId is unavailable.
      if (sport !== "All" && !getSportId(sport)) {
        if (c.sport !== null && c.sport !== sport) return false;
      }

      // Full-text search across name, headline, bio, location, sport, specialties.
      if (query.trim()) {
        const q = normalizeText(query.trim());
        const haystack = normalizeText(
          [c.name, c.headline, c.bio, c.location ?? "", c.sport ?? "", ...c.specialties].join(
            " ",
          ),
        );
        if (!haystack.includes(q)) return false;
      }

      if (!matchesExperienceRange(getCoachExperienceYears(c), expRange)) return false;

      // Location: exact match against dropdown values derived from the dataset.
      if (locationFilter !== "all" && c.location?.trim() !== locationFilter) return false;

      if (!matchesRatingFilter(c, ratingKey)) return false;

      return true;
    });

    return sortCoaches(filtered, sortKey);
  }, [allCoaches, query, sport, expRange, locationFilter, ratingKey, sortKey]);

  const filtersActive =
    query !== "" ||
    sport !== "All" ||
    expRange !== "all" ||
    locationFilter !== "all" ||
    ratingKey !== "all";

  const resetFilters = () => {
    setQuery("");
    setSport("All");
    setExpRange("all");
    setLocationFilter("all");
    setRatingKey("all");
  };

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-5 pb-6">
        <PageHeader />
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-6">
      <PageHeader />

      {/* Unified filter panel — search + filters + result footer all in one box */}
      <section className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(16,16,16,0.03)]">
        {/* Search */}
        <div className="px-4 pt-4">
          <div className="flex h-11 items-center rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 transition-colors focus-within:border-primary">
            <Search
              className="h-[18px] w-[18px] shrink-0 text-on-surface-variant"
              strokeWidth={2}
            />
            <input
              type="text"
              name="coach-search"
              aria-label="Tìm kiếm huấn luyện viên"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, chuyên môn hoặc khu vực…"
              className="ml-2.5 flex-1 bg-transparent text-[14px] outline-none placeholder:text-on-surface-variant/70"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Xóa tìm kiếm"
                className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter row: sport chips left, dropdowns right */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-4">
          {/* Sport chips */}
          <div className="flex flex-shrink-0 gap-1.5">
            <SportChip active={sport === "All"} onClick={() => setSport("All")} label="Tất cả" />
            {AVAILABLE_SPORTS.map((s) => (
              <SportChip key={s} active={sport === s} onClick={() => setSport(s)} label={sportLabel(s)} />
            ))}
          </div>

          <div className="h-5 w-px bg-[var(--color-border-soft)]" />

          {/* Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={expRange}
              onChange={(v) => setExpRange(v as ExperienceKey)}
              active={expRange !== "all"}
            >
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </FilterSelect>

            {locationOptions.length > 0 && (
              <FilterSelect
                value={locationFilter}
                onChange={(v) => setLocationFilter(v)}
                active={locationFilter !== "all"}
              >
                <option value="all">Khu vực</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </FilterSelect>
            )}

            <FilterSelect
              value={ratingKey}
              onChange={(v) => setRatingKey(v as RatingKey)}
              active={ratingKey !== "all"}
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </FilterSelect>
          </div>
        </div>

        {/* Footer row — result count + clear + sort, inside the panel */}
        <div className="mt-3 flex items-center gap-x-3 border-t border-[var(--color-border-soft)] px-4 py-2.5">
          <span className="text-[13px] text-on-surface-variant">
            {loading ? (
              <span className="animate-pulse opacity-60">Đang tải…</span>
            ) : (
              <>
                <span className="font-semibold text-on-surface">{coaches.length}</span>
                {" huấn luyện viên"}
              </>
            )}
          </span>

          {filtersActive && !loading && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-[6px] bg-surface-container-low px-2.5 py-1 text-[12px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <X className="h-3 w-3" />
              Xóa bộ lọc
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-on-surface-variant">Sắp xếp</span>
            <FilterSelect
              value={sortKey}
              onChange={(v) => setSortKey(v as SortKey)}
              active={sortKey !== "match"}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </section>

      {/* Results */}
      {loading ? (
        <SkeletonGrid />
      ) : coaches.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach, i) => (
            <CoachCard key={coach.id} coach={coach} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState onReset={resetFilters} filtersActive={filtersActive} />
      )}
    </div>
  );
}

// ── Static sub-components ─────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header>
      <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-on-surface sm:text-[30px]">
        Tìm huấn luyện viên phù hợp
      </h1>
      <p className="mt-1.5 text-[15px] text-on-surface-variant">
        Khám phá các huấn luyện viên đã xác thực theo môn thể thao, khu vực và
        phong cách huấn luyện.
      </p>
    </header>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5"
        >
          <div className="flex gap-3.5">
            <div className="h-[60px] w-[60px] shrink-0 rounded-[14px] bg-surface-container-high" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 rounded bg-surface-container-high" />
              <div className="h-3 w-1/2 rounded bg-surface-container-high" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 rounded bg-surface-container-high" />
            <div className="h-3 w-5/6 rounded bg-surface-container-high" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-surface-container-high" />
            <div className="h-6 w-20 rounded-full bg-surface-container-high" />
          </div>
          <div className="mt-4 h-px bg-surface-container-high" />
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-surface-container-high" />
            <div className="h-9 w-28 rounded-[8px] bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onReset,
  filtersActive,
}: {
  onReset: () => void;
  filtersActive: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
        <MaterialIcon name="search_off" size={24} className="text-on-surface-variant" />
      </div>
      <p className="mt-4 text-[16px] font-semibold text-on-surface">
        Không tìm thấy huấn luyện viên phù hợp
      </p>
      <p className="mt-1 text-[14px] text-on-surface-variant">
        {filtersActive
          ? "Thử đổi môn thể thao, khu vực hoặc số năm kinh nghiệm."
          : "Hiện chưa có huấn luyện viên nào trong hệ thống."}
      </p>
      {filtersActive && (
        <button
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}

// ── SportChip ─────────────────────────────────────────────────────────────────

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

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  active,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium outline-none transition-colors",
          active
            ? "border-primary/30 bg-primary/[0.06] text-primary focus:border-primary"
            : "border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface hover:border-primary/40 focus:border-primary",
        )}
      >
        {children}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
          active ? "text-primary" : "text-on-surface-variant",
        )}
      />
    </div>
  );
}

// ── CoachCard ─────────────────────────────────────────────────────────────────

function CoachCard({ coach, index }: { coach: Coach; index: number }) {
  const [saved, setSaved] = useState(false);

  const profileHref = `/coaches/${coach.id}`;
  const hasRating = (coach.rating ?? 0) > 0 && (coach.reviewCount ?? 0) > 0;
  const hasLocation = Boolean(coach.location?.trim());
  const hasExperience = (coach.yearsExperience ?? 0) > 0;
  const sportName = sportLabel(coach.sport, "");

  return (
    <article
      className="group animate-rise-in relative flex flex-col rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-26px_rgba(53,37,205,0.35)]"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      {/* Header: avatar + identity */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <UserAvatar
            avatarUrl={coach.avatarUrl}
            name={coach.name}
            className="h-[60px] w-[60px] rounded-[14px] text-[18px]"
          />
          {coach.verified && (
            <span
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface-container-lowest"
              title="Đã xác minh"
            >
              <MaterialIcon name="verified" filled size={11} />
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
            {typeof coach.matchPercent === "number" && coach.matchPercent > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/[0.07] px-2 py-0.5 text-[11.5px] font-semibold text-primary">
                <MaterialIcon name="auto_awesome" filled size={11} />
                {coach.matchPercent}%
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
            {sportName || coach.headline || "Huấn luyện viên Sportico"}
          </p>
        </div>
      </div>

      {/* Short bio */}
      <p className="mt-3 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-on-surface-variant">
        {coach.bio || coach.headline || "Chưa có mô tả."}
      </p>

      {/* Rating + location */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] text-on-surface-variant">
        {hasRating ? (
          <span className="inline-flex items-center gap-1">
            <MaterialIcon name="star" filled size={13} className="text-amber-500" />
            <span className="font-semibold text-on-surface">
              {coach.rating.toFixed(1)}
            </span>
            <span>({coach.reviewCount} đánh giá)</span>
          </span>
        ) : (
          <span className="text-[12px] text-on-surface-variant/60">Chưa có đánh giá</span>
        )}
        {hasLocation && (
          <>
            <span className="h-3 w-px bg-[var(--color-border-soft)]" />
            <span className="inline-flex min-w-0 items-center gap-1">
              <MaterialIcon name="location_on" size={13} />
              <span className="truncate">{coach.location}</span>
            </span>
          </>
        )}
      </div>

      {/* Sport + specialty tags */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {sportName && (
          <span className="rounded-[6px] bg-primary/[0.06] px-2 py-1 text-[11px] font-medium text-primary">
            {sportName}
          </span>
        )}
        {coach.specialties.slice(0, sportName ? 2 : 3).map((s) => (
          <span
            key={s}
            className="rounded-[6px] bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant"
          >
            {s}
          </span>
        ))}
        {coach.specialties.length > (sportName ? 2 : 3) && (
          <span className="rounded-[6px] bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant">
            +{coach.specialties.length - (sportName ? 2 : 3)}
          </span>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
        <div className="min-w-0">
          {hasExperience ? (
            <span className="text-[12px] text-on-surface-variant">
              {coach.yearsExperience} năm kinh nghiệm
            </span>
          ) : (
            <span className="text-[12px] text-on-surface-variant/50">
              Chưa cập nhật kinh nghiệm
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setSaved((v) => !v)}
            aria-pressed={saved}
            aria-label={saved ? "Bỏ lưu" : "Lưu HLV"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[8px] border transition-colors",
              saved
                ? "border-primary/30 bg-primary/[0.08] text-primary"
                : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary/40 hover:text-primary",
            )}
          >
            <MaterialIcon name="favorite" filled={saved} size={17} />
          </button>
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
          >
            Xem hồ sơ
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
