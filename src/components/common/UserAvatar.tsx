"use client";

// ============================================================================
// UserAvatar — the ONLY place avatars should be rendered across the app.
//
// Rules:
//   - Valid avatarUrl (loads successfully) → show the photo.
//   - No avatarUrl, empty string, or the image fails to load → initials.
//   - Never a random third-party avatar service, never a broken-image icon.
// ============================================================================

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getUserInitials, getAvatarPalette } from "@/lib/avatar";

export type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-[13px]",
  lg: "w-14 h-14 text-[16px]",
  xl: "w-24 h-24 text-[28px]",
};

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: UserAvatarSize;
  /** Shows a neutral pulsing skeleton instead of initials while user data loads. */
  isLoading?: boolean;
  className?: string;
}

export function UserAvatar({
  avatarUrl,
  name,
  email,
  size = "md",
  isLoading = false,
  className,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const trimmedUrl = avatarUrl?.trim() || "";

  // A new URL (new upload, different user) deserves a fresh attempt.
  useEffect(() => {
    setImgFailed(false);
  }, [trimmedUrl]);

  if (isLoading) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block shrink-0 animate-pulse rounded-full bg-surface-container-high",
          SIZE_CLASSES[size],
          className,
        )}
      />
    );
  }

  const showImage = Boolean(trimmedUrl) && !imgFailed;
  const label = name?.trim() || email?.trim() || "User avatar";

  if (showImage) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-full",
          SIZE_CLASSES[size],
          className,
        )}
      >
        <img
          src={trimmedUrl}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  const palette = getAvatarPalette(name?.trim() || email?.trim() || "user");

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        SIZE_CLASSES[size],
        palette.bg,
        palette.text,
        className,
      )}
    >
      {getUserInitials(name, email)}
    </span>
  );
}
