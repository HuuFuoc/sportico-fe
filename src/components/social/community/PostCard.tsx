"use client";

import Link from "next/link";
import {
  ChatBubble,
  Clock,
  Group,
  Heart,
  MapPin,
  Eye,
} from "iconoir-react";
import { PostStatusBadge } from "@/components/social/community/PostStatusBadge";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateTimeVn, formatRelativeVn } from "@/lib/social/datetime";
import { LEVEL_LABELS, POST_TYPE_LABELS } from "@/lib/social/labels";
import { sportById } from "@/lib/sports-api";
import type { CommunityPostResponse } from "@/lib/social/types";

interface PostCardProps {
  post: CommunityPostResponse;
  href: string;
}

export function PostCard({ post, href }: PostCardProps) {
  const status = (post.status ?? "").toLowerCase();
  const isRecruitment = post.postType === "recruitment";
  const disabled = status === "closed" || status === "expired";
  const sport = sportById(post.sportId ?? undefined);
  const cover = post.media[0];

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-12px_rgba(15,15,30,0.12)]"
    >
      {cover && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-surface-container-high">
          {cover.mediaType === "video" ? (
            <video
              src={cover.url ?? undefined}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <img
              src={cover.url ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-[6px] bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {POST_TYPE_LABELS[post.postType ?? ""] ?? post.postType}
          </span>
          {sport && (
            <span className="rounded-[6px] bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
              {sport.name}
            </span>
          )}
          {(disabled || status === "hidden") && <PostStatusBadge status={post.status} />}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-on-surface">
          {post.title}
        </h3>
        {post.content && (
          <p className="mt-1 line-clamp-2 text-[13px] text-on-surface-variant">{post.content}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-on-surface-variant">
          {post.locationName && (
            <span className="flex items-center gap-1">
              <MapPin width={13} height={13} />
              {post.locationName}
            </span>
          )}
          {isRecruitment && post.startAt && (
            <span className="flex items-center gap-1">
              <Clock width={13} height={13} />
              {formatDateTimeVn(post.startAt)}
            </span>
          )}
          {isRecruitment && post.maxParticipants != null && (
            <span className="flex items-center gap-1">
              <Group width={13} height={13} />
              {post.acceptedParticipants}/{post.maxParticipants}
              {post.slotsRemaining != null && post.slotsRemaining <= 0 && " · Đủ người"}
            </span>
          )}
          {post.level && (
            <span>{LEVEL_LABELS[post.level] ?? post.level}</span>
          )}
        </div>

        {isRecruitment && post.feePerPerson != null && post.feePerPerson > 0 && (
          <p className="mt-2 text-[13px] font-semibold text-on-surface">
            {formatCurrencyVnd(post.feePerPerson)}
            <span className="font-normal text-on-surface-variant"> / người</span>
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3">
          <div className="flex items-center gap-3 text-[12px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Heart width={13} height={13} fill={post.currentUserReacted ? "currentColor" : "none"} className={post.currentUserReacted ? "text-rose-600" : undefined} />
              {post.reactionCount}
            </span>
            <span className="flex items-center gap-1">
              <ChatBubble width={13} height={13} />
              {post.commentCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye width={13} height={13} />
              {post.viewCount}
            </span>
          </div>
          <span className="text-[11.5px] text-on-surface-variant">
            {formatRelativeVn(post.publishedAt ?? post.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
