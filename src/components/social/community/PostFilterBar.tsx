"use client";

import { Search, Filter } from "iconoir-react";
import { LEVEL_LABELS, POST_TYPE_LABELS } from "@/lib/social/labels";
import { COMMUNITY_POST_TYPES } from "@/lib/social/validation/community";
import type { CommunityPostFilters } from "@/lib/social/types";

interface PostFilterBarProps {
  filters: CommunityPostFilters;
  onChange: (next: CommunityPostFilters) => void;
  showFollowingOnly?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "startAt", label: "Sắp diễn ra" },
  { value: "popular", label: "Phổ biến" },
];

/** `filters.sportId` is intentionally NOT controlled here — the story bar
 *  above the feed owns that filter now; both write to the same `filters`
 *  object in the parent, so there is still exactly one source of truth. */
export function PostFilterBar({ filters, onChange, showFollowingOnly }: PostFilterBarProps) {
  function set(patch: Partial<CommunityPostFilters>) {
    onChange({ ...filters, ...patch, pageNumber: 1 });
  }

  return (
    <div className="space-y-3">
      <div className="relative flex-1">
        <Search width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={filters.keyword ?? ""}
          onChange={(e) => set({ keyword: e.target.value || null })}
          placeholder="Tìm bài đăng theo từ khoá…"
          className="w-full rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest py-2.5 pl-9 pr-3 text-[13.5px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.postType ?? ""}
          onChange={(e) => set({ postType: (e.target.value || null) as CommunityPostFilters["postType"] })}
          className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">Mọi loại bài đăng</option>
          {COMMUNITY_POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <select
          value={filters.level ?? ""}
          onChange={(e) => set({ level: (e.target.value || null) as CommunityPostFilters["level"] })}
          className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">Mọi trình độ</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          value={filters.city ?? ""}
          onChange={(e) => set({ city: e.target.value || null })}
          placeholder="Tên địa điểm"
          className="w-36 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
        />

        <label className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface-variant">
          <input
            type="checkbox"
            checked={Boolean(filters.hasAvailableSlots)}
            onChange={(e) => set({ hasAvailableSlots: e.target.checked || null })}
            className="h-3.5 w-3.5 accent-primary"
          />
          Còn chỗ
        </label>

        {showFollowingOnly && (
          <label className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface-variant">
            <input
              type="checkbox"
              checked={Boolean(filters.followingOnly)}
              onChange={(e) => set({ followingOnly: e.target.checked || null })}
              className="h-3.5 w-3.5 accent-primary"
            />
            Đang theo dõi
          </label>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Filter width={14} height={14} className="text-on-surface-variant" />
          <select
            value={filters.sortBy ?? "newest"}
            onChange={(e) => set({ sortBy: e.target.value })}
            className="rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1.5 text-[12.5px] text-on-surface focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
