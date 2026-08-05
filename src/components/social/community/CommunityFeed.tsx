"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MediaImagePlus } from "iconoir-react";
import { PostCard } from "@/components/social/community/PostCard";
import { PostFilterBar } from "@/components/social/community/PostFilterBar";
import { SportStoriesBar } from "@/components/social/community/SportStoriesBar";
import { UserAvatar } from "@/components/common/UserAvatar";
import { PostCardSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/AsyncStates";
import { useCommunityPosts } from "@/lib/social/hooks/useCommunity";
import { useAuthStore } from "@/lib/store/useAuthStore";
import type { CommunityPostFilters } from "@/lib/social/types";

/** Facebook-shaped single-column feed with an Instagram-style story bar for
 *  the sport filter — see PostCard for the per-post layout rationale. */
export function CommunityFeed() {
  const reduceMotion = useReducedMotion();
  const currentUser = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<CommunityPostFilters>({ pageNumber: 1, pageSize: 12 });

  const { data, isLoading, isError, isPlaceholderData, refetch } = useCommunityPosts(filters);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[20px] font-bold text-on-surface">Cộng đồng Sportico</h1>
      <p className="mt-0.5 text-[13px] text-on-surface-variant">
        Tìm bạn tập, chia sẻ kinh nghiệm và kết nối với cộng đồng thể thao.
      </p>

      <div className="mt-4">
        <SportStoriesBar
          activeSportId={filters.sportId ?? null}
          onChange={(sportId) => setFilters((f) => ({ ...f, sportId, pageNumber: 1 }))}
        />
      </div>

      {/* Facebook-style "what's on your mind" composer prompt */}
      <Link
        href="/community/create"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 transition-colors hover:border-primary/30"
      >
        <UserAvatar
          avatarUrl={currentUser?.avatarUrl}
          name={currentUser?.fullName}
          email={currentUser?.email}
          size="sm"
          className="h-9 w-9 text-[13px]"
        />
        <span className="flex-1 truncate rounded-full bg-surface-container-high px-4 py-2 text-[13.5px] text-on-surface-variant">
          Bạn đang tập luyện gì hôm nay?
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary">
          <MediaImagePlus width={19} height={19} />
        </span>
      </Link>

      <div className="mt-4">
        <PostFilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="mt-5 space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <ErrorState
            title="Không tải được bảng tin"
            message="Đã xảy ra lỗi khi kết nối máy chủ."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && data && data.items.length === 0 && (
          <EmptyState
            icon="groups"
            title="Chưa có bài đăng nào"
            description="Hãy là người đầu tiên đăng bài tìm bạn tập hoặc chia sẻ trải nghiệm của bạn."
            action={
              <Link
                href="/community/create"
                className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]"
              >
                Đăng bài đầu tiên
              </Link>
            }
          />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0.6 }}
            animate={{ opacity: isPlaceholderData ? 0.6 : 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {data.items.map((post, i) => (
              <motion.div
                key={post.id}
                initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
              >
                <PostCard post={post} href={`/community/posts/${post.id}`} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {data && data.totalPages > 1 && (
          <Pagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onChange={(page) => setFilters((f) => ({ ...f, pageNumber: page }))}
            className="pt-2"
          />
        )}
      </div>
    </div>
  );
}
