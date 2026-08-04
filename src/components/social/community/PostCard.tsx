"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChatBubble,
  Coins,
  Eye,
  Group,
  MapPin,
} from "iconoir-react";
import { PostStatusBadge } from "@/components/social/community/PostStatusBadge";
import { PostMediaCarousel } from "@/components/social/community/PostMediaCarousel";
import { LikeButton } from "@/components/social/community/LikeButton";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateTimeVn, formatRelativeVn } from "@/lib/social/datetime";
import { LEVEL_LABELS, POST_TYPE_LABELS, isScheduledPostType } from "@/lib/social/labels";
import { sportById } from "@/lib/sports-api";
import type { CommunityPostResponse } from "@/lib/social/types";

interface PostCardProps {
  post: CommunityPostResponse;
  href: string;
}

/**
 * Facebook-shaped feed card (single full-width column, header → text →
 * media → action bar) with Instagram-style media presentation (full-bleed
 * swipeable carousel, oversized heart). The card is intentionally NOT one big
 * `<Link>` — the carousel and like button are independently interactive, and
 * nesting buttons inside an `<a>` is both invalid HTML and breaks their click
 * handling. Each clickable zone navigates or acts on its own.
 */
export function PostCard({ post, href }: PostCardProps) {
  const router = useRouter();
  const status = (post.status ?? "").toLowerCase();
  const scheduled = isScheduledPostType(post.postType);
  const disabledLike = status === "closed" || status === "expired";
  const sport = sportById(post.sportId ?? undefined);
  const authorName = post.author?.fullName?.trim() || "Người dùng";

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <Link href={href} className="shrink-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#7d6dff] text-[14px] font-semibold text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block truncate text-[13.5px] font-semibold text-on-surface hover:underline">
            {authorName}
          </Link>
          <div className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-on-surface-variant">
            <span>{formatRelativeVn(post.publishedAt ?? post.createdAt)}</span>
            <span>·</span>
            <span className="font-medium text-primary">{POST_TYPE_LABELS[post.postType ?? ""] ?? post.postType}</span>
            {sport && (
              <>
                <span>·</span>
                <span>{sport.name}</span>
              </>
            )}
          </div>
        </div>
        {(disabledLike || status === "hidden") && <PostStatusBadge status={post.status} />}
      </div>

      {/* Title + content */}
      <Link href={href} className="block px-4 pb-3">
        <h3 className="text-[15px] font-semibold leading-snug text-on-surface">{post.title}</h3>
        {post.content && (
          <p className="mt-1 line-clamp-3 text-[13.5px] leading-relaxed text-on-surface-variant">{post.content}</p>
        )}
      </Link>

      {/* Schedule info strip — only for post types that organise an activity */}
      {scheduled && (post.startAt || post.locationName || (post.feePerPerson ?? 0) > 0 || post.maxParticipants != null) && (
        <div className="mx-4 mb-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-surface-container-high px-3.5 py-2.5 text-[12px] text-on-surface-variant">
          {post.startAt && (
            <span className="flex items-center gap-1.5">
              <Calendar width={13} height={13} />
              {formatDateTimeVn(post.startAt)}
            </span>
          )}
          {post.locationName && (
            <span className="flex items-center gap-1.5">
              <MapPin width={13} height={13} />
              {post.locationName}
            </span>
          )}
          {post.maxParticipants != null && (
            <span className="flex items-center gap-1.5">
              <Group width={13} height={13} />
              {post.acceptedParticipants}/{post.maxParticipants}
              {post.slotsRemaining != null && post.slotsRemaining <= 0 && " · Đủ người"}
            </span>
          )}
          {(post.feePerPerson ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-on-surface">
              <Coins width={13} height={13} />
              {formatCurrencyVnd(post.feePerPerson as number)}/người
            </span>
          )}
          {post.level && <span>{LEVEL_LABELS[post.level] ?? post.level}</span>}
        </div>
      )}

      {/* Media */}
      {post.media.length > 0 && (
        <PostMediaCarousel media={post.media} onOpen={() => router.push(href)} />
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <LikeButton postId={post.id} liked={post.currentUserReacted} count={post.reactionCount} />
          <button
            type="button"
            onClick={() => router.push(href)}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            <ChatBubble width={16} height={16} />
            <span className="tabular-nums">{post.commentCount}</span>
          </button>
        </div>
        <span className="flex items-center gap-1 px-2 text-[11.5px] text-on-surface-variant">
          <Eye width={13} height={13} />
          {post.viewCount}
        </span>
      </div>
    </article>
  );
}
