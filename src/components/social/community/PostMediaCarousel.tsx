"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CommunityPostMediaResponse } from "@/lib/social/types";

interface PostMediaCarouselProps {
  media: CommunityPostMediaResponse[];
  /** Tapping a slide opens the post detail — feed cards don't own a lightbox. */
  onOpen: () => void;
}

/**
 * Instagram-style swipeable media strip for a feed card: one slide fills the
 * frame, CSS scroll-snap drives the swipe (no drag library needed), dot
 * indicators track scroll position. Tapping a slide navigates to the post;
 * dragging/scrolling never fires the tap handler because a scroll gesture
 * doesn't dispatch a `click` on touch devices.
 */
export function PostMediaCarousel({ media, onOpen }: PostMediaCarouselProps) {
  const sorted = [...media].sort((a, b) => a.orderIndex - b.orderIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function scrollTo(index: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActive(index);
  }

  if (sorted.length === 0) return null;

  return (
    <div className="relative bg-black">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={onOpen}
            className="aspect-[4/5] w-full shrink-0 snap-center"
          >
            {item.mediaType === "video" ? (
              <video
                src={item.url ?? undefined}
                poster={item.thumbnailUrl ?? undefined}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={item.url ?? undefined}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {sorted.length > 1 && (
        <>
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
            {active + 1}/{sorted.length}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {sorted.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-4 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
