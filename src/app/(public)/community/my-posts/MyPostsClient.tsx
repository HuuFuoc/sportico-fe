"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "iconoir-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PostCard } from "@/components/social/community/PostCard";
import { PostCardSkeleton } from "@/components/social/Skeleton";
import { Pagination } from "@/components/social/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/AsyncStates";
import { useMyCommunityPosts } from "@/lib/social/hooks/useCommunity";
import type { CommunityPostFilters } from "@/lib/social/types";

export function MyPostsClient() {
  return (
    <AuthGuard>
      <MyPosts />
    </AuthGuard>
  );
}

function MyPosts() {
  const [filters, setFilters] = useState<CommunityPostFilters>({ pageNumber: 1, pageSize: 12 });
  const { data, isLoading, isError, refetch } = useMyCommunityPosts(filters);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-bold text-on-surface">Bài đăng của tôi</h1>
        <Link
          href="/community/create"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-on-primary hover:bg-[#2d20b8]"
        >
          <Plus width={16} height={16} />
          Đăng bài mới
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && !isLoading && <ErrorState title="Không tải được danh sách" onRetry={() => refetch()} />}

      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          icon="edit_note"
          title="Bạn chưa có bài đăng nào"
          description="Đăng bài tìm bạn tập hoặc chia sẻ trải nghiệm để bắt đầu."
          action={
            <Link href="/community/create" className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8]">
              Đăng bài đầu tiên
            </Link>
          }
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((post) => (
            <PostCard key={post.id} post={post} href={`/community/posts/${post.id}`} />
          ))}
        </div>
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
  );
}
