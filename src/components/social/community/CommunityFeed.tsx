"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Plus } from "iconoir-react";
import { PostCard } from "@/components/social/community/PostCard";
import { PostFilterBar } from "@/components/social/community/PostFilterBar";
import { PostCardSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/AsyncStates";
import { useCommunityPosts } from "@/lib/social/hooks/useCommunity";
import type { CommunityPostFilters } from "@/lib/social/types";

export function CommunityFeed() {
  const reduceMotion = useReducedMotion();
  const [filters, setFilters] = useState<CommunityPostFilters>({ pageNumber: 1, pageSize: 12 });

  const { data, isLoading, isError, isPlaceholderData, refetch } = useCommunityPosts(filters);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-on-surface">Cộng đồng Sportico</h1>
          <p className="mt-1 text-[13.5px] text-on-surface-variant">
            Tìm bạn tập, chia sẻ kinh nghiệm và kết nối với cộng đồng thể thao.
          </p>
        </div>
        <Link
          href="/community/create"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
        >
          <Plus width={16} height={16} />
          Đăng bài mới
        </Link>
      </div>

      <PostFilterBar filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} href={`/community/posts/${post.id}`} />
            ))}
          </motion.div>
        )}

        {data && data.totalPages > 1 && (
          <Pagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onChange={(page) => setFilters((f) => ({ ...f, pageNumber: page }))}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}
