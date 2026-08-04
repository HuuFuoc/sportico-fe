"use client";

import { useState } from "react";
import { Xmark } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { CommunityPostMediaResponse } from "@/lib/social/types";

interface MediaGalleryProps {
  media: CommunityPostMediaResponse[];
  className?: string;
}

/**
 * Read-only gallery for a post's media. `referrerPolicy="no-referrer"` on every
 * asset — the S3 bucket is public-read but we don't advertise which internal
 * page linked to it. No `dangerouslySetInnerHTML`, no `<iframe>`.
 */
export function MediaGallery({ media, className }: MediaGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (media.length === 0) return null;

  const sorted = [...media].sort((a, b) => a.orderIndex - b.orderIndex);
  const gridCols = sorted.length === 1 ? "grid-cols-1" : sorted.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <>
      <div className={cn("grid gap-1.5 overflow-hidden rounded-[12px]", gridCols, className)}>
        {sorted.slice(0, 6).map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden bg-surface-container-high"
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
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            {i === 5 && sorted.length > 6 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[15px] font-semibold text-white">
                +{sorted.length - 6}
              </div>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Xmark width={18} height={18} />
            </button>
            {sorted[lightbox]?.mediaType === "video" ? (
              <video
                src={sorted[lightbox]?.url ?? undefined}
                className="max-h-[85vh] max-w-full rounded-[8px]"
                controls
                autoPlay
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={sorted[lightbox]?.url ?? undefined}
                alt=""
                referrerPolicy="no-referrer"
                className="max-h-[85vh] max-w-full rounded-[8px] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
