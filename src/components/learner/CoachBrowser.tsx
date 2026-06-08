"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, initials } from "@/lib/utils";
import { api, getSportId } from "@/lib/api";
import { AVAILABLE_SPORTS, sportLabel } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState } from "@/components/common/AsyncStates";
import type { Coach, Sport } from "@/types";

const SORTS = [
  { key: "match", label: "Phù hợp nhất" },
  { key: "rating", label: "Đánh giá cao nhất" },
  { key: "newest", label: "Mới nhất" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

export function CoachBrowser() {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<Sport | "All">("All");
  const [topRated, setTopRated] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("match");

  // Re-fetch from backend whenever the selected sport changes.
  // In live mode this passes SportId so the backend does server-side filtering;
  // in mock mode it filters the local fixture by sport name.
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

  const coaches = useMemo(() => {
    return allCoaches
      .filter((c) => {
        if (!c.id || !c.name?.trim()) return false;
        const nameLower = c.name.toLowerCase();
        if (nameLower === "system" || nameLower.startsWith("system ")) return false;
        if (query) {
          const q = query.toLowerCase();
          if (
            !c.name.toLowerCase().includes(q) &&
            !c.headline.toLowerCase().includes(q) &&
            !c.specialties.join(" ").toLowerCase().includes(q)
          )
            return false;
        }
        // Global constraint: only Cầu lông and Pickleball coaches are shown.
        // Coaches with sport=null (no sport data from backend) are kept to avoid
        // silently hiding valid coaches who haven't configured their sport yet.
        if (c.sport !== null && c.sport !== "Badminton" && c.sport !== "Pickleball")
          return false;
        // Sport chip filter:
        // • If sportId is in cache → backend already filtered, skip client check.
        // • Fallback (no cached sportId): exclude coaches whose sport is KNOWN and
        //   different. Coaches with sport=null are kept in the filtered view.
        if (sport !== "All" && !getSportId(sport)) {
          if (c.sport !== null && c.sport !== sport) return false;
        }
        if (topRated && c.rating < 4.8) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "rating") return b.rating - a.rating;
        return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
      });
  }, [allCoaches, query, sport, topRated, sortKey]);

  const filtersActive = query !== "" || sport !== "All" || topRated;

  const resetFilters = () => {
    setQuery("");
    setSport("All");
    setTopRated(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-6">
        <PageHeader />
        <AIMatchBanner />
        <SkeletonGrid />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 pb-6">
        <PageHeader />
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-6">
      {/* Header */}
      <PageHeader />

      {/* AI Match compact banner */}
      <AIMatchBanner />

      {/* Filter panel */}
      <section className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5 shadow-[0_1px_2px_rgba(16,16,16,0.03)]">
        {/* Search bar */}
        <div className="flex h-11 items-center rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 transition-colors focus-within:border-primary">
          <MaterialIcon
            name="search"
            size={19}
            className="shrink-0 text-on-surface-variant"
          />
          <input
            type="text"
            name="coach-search"
            aria-label="Tìm kiếm huấn luyện viên"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, môn thể thao hoặc chuyên môn…"
            className="ml-2.5 flex-1 bg-transparent text-[14px] outline-none placeholder:text-on-surface-variant/70"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
              className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <MaterialIcon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Sport chips — horizontal scroll with fade edge */}
        <div className="relative mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SportChip
              active={sport === "All"}
              onClick={() => setSport("All")}
              label="Tất cả"
            />
            {AVAILABLE_SPORTS.map((s) => (
              <SportChip
                key={s}
                active={sport === s}
                onClick={() => setSport(s)}
                label={sportLabel(s)}
              />
            ))}
          </div>
          {/* Right fade hint */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface-container-lowest to-transparent" />
        </div>
      </section>

      {/* Results bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="text-[14px] text-on-surface-variant">
          <span className="font-semibold text-on-surface">{coaches.length}</span>{" "}
          huấn luyện viên
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="ml-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              <MaterialIcon name="close" size={13} />
              Xóa bộ lọc
            </button>
          )}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setTopRated((v) => !v)}
            aria-pressed={topRated}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium transition-colors",
              topRated
                ? "border-primary/30 bg-primary/[0.08] text-primary"
                : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary/40",
            )}
          >
            <MaterialIcon name="star" filled size={14} />
            Đánh giá cao
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[13px] text-on-surface-variant">Sắp xếp</span>
            <SortSelect
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </SortSelect>
          </div>
        </div>
      </div>

      {/* Results grid */}
      {coaches.length > 0 ? (
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

/* ── Static sub-components ───────────────────────────────────────────────── */

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

function AIMatchBanner() {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-primary/20 bg-primary/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.1]">
          <MaterialIcon name="auto_awesome" filled size={20} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-on-surface">
            Chưa biết chọn huấn luyện viên nào?
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-on-surface-variant">
            Trả lời vài câu hỏi ngắn để hệ thống gợi ý HLV phù hợp với mục tiêu của bạn.
          </p>
        </div>
      </div>
      <Link
        href="/learner/ai-match"
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] sm:self-auto"
      >
        <MaterialIcon name="auto_awesome" filled size={14} />
        Tìm HLV phù hợp
      </Link>
    </section>
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
          ? "Thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả."
          : "Hiện chưa có huấn luyện viên nào trong hệ thống."}
      </p>
      {filtersActive && (
        <button
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
        >
          Xóa tất cả bộ lọc
        </button>
      )}
    </div>
  );
}

/* ── SportChip ───────────────────────────────────────────────────────────── */

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

/* ── SortSelect ──────────────────────────────────────────────────────────── */

function SortSelect({
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

/* ── CoachCard ───────────────────────────────────────────────────────────── */

function CoachCard({ coach, index }: { coach: Coach; index: number }) {
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const profileHref = `/coaches/${coach.id}`;
  const hasRating = coach.rating > 0 && coach.reviewCount > 0;
  const hasLocation = Boolean(coach.location?.trim());
  const isBookingFast = coach.activeLearners >= 24;
  const isTopMatch = (coach.matchPercent ?? 0) >= 98;
  const sportName = sportLabel(coach.sport, "");

  return (
    <article
      className="group animate-rise-in relative flex flex-col rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-26px_rgba(53,37,205,0.35)]"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      {/* Header: avatar + identity */}
      <div className="flex items-start gap-3.5">
        {/* Avatar with verified badge */}
        <div className="relative shrink-0">
          {!imgError && coach.avatarUrl ? (
            <img
              src={coach.avatarUrl}
              alt={coach.name}
              onError={() => setImgError(true)}
              className="h-[60px] w-[60px] rounded-[14px] object-cover"
            />
          ) : (
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] bg-gradient-to-br from-primary/20 to-primary/10 text-[18px] font-bold text-primary">
              {initials(coach.name)}
            </div>
          )}
          {coach.verified && (
            <span
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-surface-container-lowest"
              title="Đã xác minh"
            >
              <MaterialIcon name="verified" filled size={11} />
            </span>
          )}
        </div>

        {/* Name + sport + match badge */}
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
          {isTopMatch && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
              <MaterialIcon name="bolt" filled size={12} />
              Phù hợp nhất
            </span>
          )}
        </div>
      </div>

      {/* Short bio / headline */}
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
            <span>
              ({coach.reviewCount}{" "}
              {coach.reviewCount === 1 ? "đánh giá" : "đánh giá"})
            </span>
          </span>
        ) : (
          <span className="text-on-surface-variant/60">Chưa có đánh giá</span>
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

      {/* Tags: sport + specialties */}
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

      {/* Availability */}
      <div className="mt-3.5 flex items-center gap-1.5 text-[12px] font-medium">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            isBookingFast ? "bg-amber-500" : "bg-emerald-500",
          )}
        />
        <span className={isBookingFast ? "text-amber-700" : "text-emerald-700"}>
          {isBookingFast ? "Đặt lịch nhanh — còn ít chỗ" : "Còn lịch tuần này"}
        </span>
      </div>

      {/* Footer CTA */}
      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4">
        <div className="min-w-0">
          {coach.yearsExperience > 0 && (
            <span className="text-[12px] text-on-surface-variant">
              {coach.yearsExperience} năm kinh nghiệm
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
