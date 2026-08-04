"use client";

import { Flash } from "iconoir-react";
import { motion } from "motion/react";
import { STABLE_SPORTS } from "@/lib/sports-api";
import { cn } from "@/lib/utils";

interface SportStoriesBarProps {
  activeSportId: number | null;
  onChange: (sportId: number | null) => void;
}

/**
 * Instagram-story-style horizontal picker for the sport filter — a ring
 * bubble per sport plus "Tất cả". Purely a nicer affordance over the same
 * `sportId` filter the dropdown used to own; there is still exactly one
 * source of truth (`filters.sportId` in the parent).
 */
export function SportStoriesBar({ activeSportId, onChange }: SportStoriesBarProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <StoryBubble
        label="Tất cả"
        active={activeSportId == null}
        onClick={() => onChange(null)}
        icon={<Flash width={20} height={20} />}
      />
      {STABLE_SPORTS.map((sport) => (
        <StoryBubble
          key={sport.id}
          label={sport.name}
          active={activeSportId === sport.id}
          onClick={() => onChange(activeSportId === sport.id ? null : sport.id)}
          icon={<span className="text-[15px] font-bold">{sport.name.slice(0, 1)}</span>}
        />
      ))}
    </div>
  );
}

function StoryBubble({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full p-[2.5px] transition-all",
          active
            ? "bg-gradient-to-tr from-primary via-[#7d6dff] to-[#f43f5e]"
            : "bg-[var(--color-border-soft)]",
        )}
      >
        <motion.span
          animate={{ scale: active ? 1 : 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full border-2 border-surface",
            active ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant",
          )}
        >
          {icon}
        </motion.span>
      </span>
      <span
        className={cn(
          "max-w-[60px] truncate text-[11px]",
          active ? "font-semibold text-on-surface" : "text-on-surface-variant",
        )}
      >
        {label}
      </span>
    </button>
  );
}
