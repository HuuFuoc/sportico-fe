"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface LazyImageProps {
  alt: string;
  src: string;
  className?: string;
  aspectRatioClassName?: string;
  fallback?: string;
  ratio: number;
  /** Delay loading until the element enters the viewport. */
  inView?: boolean;
}

export function LazyImage({
  alt,
  src,
  ratio,
  fallback,
  inView = false,
  className,
  aspectRatioClassName,
}: LazyImageProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [isVisible, setIsVisible] = React.useState(!inView);
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(
    inView ? undefined : src,
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // Trigger load once the container scrolls into view.
  React.useEffect(() => {
    if (!inView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  React.useEffect(() => {
    if (isVisible && !imgSrc) {
      setImgSrc(src);
    }
  }, [isVisible, src, imgSrc]);

  // If the browser cached the image and fires `complete` before `onLoad`.
  React.useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoading(false);
    }
  }, [imgSrc]);

  const handleLoad = () => setIsLoading(false);

  const handleError = () => {
    if (fallback) setImgSrc(fallback);
    setIsLoading(false);
  };

  return (
    <AspectRatio
      ref={containerRef}
      ratio={ratio}
      className={cn(
        "relative overflow-hidden rounded-lg border border-[var(--color-border-soft)]",
        aspectRatioClassName,
      )}
    >
      {/* Skeleton pulse shown while the image is loading */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 animate-pulse rounded-lg bg-surface-container-low transition-opacity duration-300",
          isLoading ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {imgSrc && (
        <img
          ref={imgRef}
          alt={alt}
          src={imgSrc}
          className={cn(
            "absolute inset-0 h-full w-full rounded-lg object-cover transition-opacity duration-700",
            isLoading ? "opacity-0" : "opacity-100",
            className,
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
    </AspectRatio>
  );
}
