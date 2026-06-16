"use client";

// ============================================================================
// SporticoVideoBackground — video background with image fallback.
//
// Renders a muted, looping, playsInline video for the hero section when the
// asset is present. Falls back to the static hero.webp image automatically:
//   • On mobile (via CSS media query: prefers-reduced-data / max-width)
//   • When the video fails to load (onError handler)
//   • When the video asset does not exist (404 treated as load error)
//
// Usage in HeroSection:
//   <SporticoVideoBackground />
//
// The component renders inside the `absolute inset-0` parallax wrapper that
// already exists in HeroSection — callers do NOT need extra positioning.
//
// VIDEO ASSET: public/videos/sportico-training-bg.mp4
// See public/videos/ATTRIBUTION.md for sourcing instructions.
// ============================================================================

import { useState } from "react";

interface SporticoVideoBackgroundProps {
  /** Poster image shown while video is loading (and as mobile fallback). */
  poster?: string;
  /** Path to the video file (relative to /public). Defaults to the standard asset. */
  src?: string;
}

export function SporticoVideoBackground({
  poster = "/bg-hero.png",
  src = "/videos/sportico-training-bg.mp4",
}: SporticoVideoBackgroundProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (videoFailed) {
    return (
      <img
        src={poster}
        alt=""
        aria-hidden
        className="h-full w-full object-cover object-center"
      />
    );
  }

  return (
    <>
      {/* Fallback image — always rendered, hidden once video plays.
          Also serves as the visible layer on reduced-data / no-JS. */}
      <img
        src={poster}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Video layer — sits on top of the image; hidden on mobile via CSS.
          The `hidden sm:block` keeps mobile on the lighter image asset. */}
      <video
        className="absolute inset-0 hidden h-full w-full object-cover object-center sm:block"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setVideoFailed(true)}
        aria-hidden
      />
    </>
  );
}
