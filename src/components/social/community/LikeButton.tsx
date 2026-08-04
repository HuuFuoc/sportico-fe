"use client";

import { useRef } from "react";
import { Heart } from "iconoir-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useToggleLike } from "@/lib/social/hooks/useCommunity";
import { showApiError } from "@/lib/toast";

interface LikeButtonProps {
  postId: string;
  liked: boolean;
  count: number;
  size?: "sm" | "md";
}

/**
 * Optimistic like toggle. A rapid double-click on a slow connection must not
 * fire two mutations at once (which would double-count on the server before
 * the first response lands) — `isPending` gates the click instead of relying
 * on debounce timing.
 */
export function LikeButton({ postId, liked, count, size = "md" }: LikeButtonProps) {
  const toggle = useToggleLike(postId);
  const lastRequestedRef = useRef<boolean | null>(null);

  const busy = toggle.isPending;
  const iconSize = size === "sm" ? 14 : 16;

  function handleClick() {
    if (busy) return;
    const next = !liked;
    lastRequestedRef.current = next;
    toggle.mutate(next, {
      onError: (err) => showApiError(err),
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[13px] font-medium transition-colors disabled:cursor-wait",
        liked ? "text-rose-600" : "text-on-surface-variant hover:text-rose-600",
      )}
    >
      <motion.span
        key={liked ? "liked" : "unliked"}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Heart width={iconSize} height={iconSize} fill={liked ? "currentColor" : "none"} />
      </motion.span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
