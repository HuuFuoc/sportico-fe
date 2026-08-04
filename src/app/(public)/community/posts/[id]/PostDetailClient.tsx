"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  EditPencil,
  Eye,
  Lock,
  MapPin,
  TriangleFlag,
  Trash,
  Wifi,
} from "iconoir-react";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { Modal } from "@/components/social/Modal";
import { ReportModal } from "@/components/social/ReportModal";
import { PostStatusBadge } from "@/components/social/community/PostStatusBadge";
import { MediaGallery } from "@/components/social/community/MediaGallery";
import { LikeButton } from "@/components/social/community/LikeButton";
import { ApplicationPanel } from "@/components/social/community/ApplicationPanel";
import { CommentThread } from "@/components/social/community/CommentThread";
import { useCommunityPost, useCloseCommunityPost, useDeleteCommunityPost } from "@/lib/social/hooks/useCommunity";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { formatCurrencyVnd } from "@/lib/utils";
import { formatDateTimeVn, formatRelativeVn } from "@/lib/social/datetime";
import { LEVEL_LABELS, POST_TYPE_LABELS, isScheduledPostType } from "@/lib/social/labels";
import { sportById } from "@/lib/sports-api";
import { showApiError, showSuccess } from "@/lib/toast";

export function PostDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: post, isLoading, isError, refetch } = useCommunityPost(postId);
  const closeMutation = useCloseCommunityPost();
  const deleteMutation = useDeleteCommunityPost();
  const [reportOpen, setReportOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <LoadingState label="Đang tải bài đăng…" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <ErrorState
          title="Không tải được bài đăng"
          message="Bài đăng không tồn tại hoặc đã bị gỡ."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const status = (post.status ?? "").toLowerCase();
  const isRecruitment = isScheduledPostType(post.postType);
  const sport = sportById(post.sportId ?? undefined);
  const canClose = post.canEdit && status === "published";
  // `/api/community/posts/me` can return an empty `author.fullName` for the
  // viewer's own posts — fall back to the signed-in session profile, never a
  // blank name.
  const authorName =
    post.author?.fullName?.trim() ||
    (post.canEdit ? currentUser?.fullName?.trim() : "") ||
    "Người dùng";

  async function handleClose() {
    try {
      await closeMutation.mutateAsync(postId);
      showSuccess("Đã đóng bài đăng.");
      setCloseConfirmOpen(false);
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(postId);
      showSuccess("Đã xoá bài đăng.");
      router.push("/community/my-posts");
    } catch (err) {
      showApiError(err);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-[6px] bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {POST_TYPE_LABELS[post.postType ?? ""] ?? post.postType}
          </span>
          {sport && (
            <span className="rounded-[6px] bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
              {sport.name}
            </span>
          )}
          <PostStatusBadge status={post.status} />
        </div>

        <h1 className="text-[20px] font-bold leading-snug text-on-surface">{post.title}</h1>

        <div className="mt-2 flex items-center gap-2 text-[12.5px] text-on-surface-variant">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {authorName.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-medium text-on-surface">{authorName}</span>
          <span>·</span>
          <span>{formatRelativeVn(post.publishedAt ?? post.createdAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Eye width={12} height={12} />
            {post.viewCount}
          </span>
        </div>

        {post.media.length > 0 && <MediaGallery media={post.media} className="mt-4" />}

        <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">{post.content}</p>

        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[var(--color-border-soft)] pt-4 text-[13px] text-on-surface-variant sm:grid-cols-2">
          {post.locationName && (
            <div className="flex items-center gap-2">
              <MapPin width={15} height={15} />
              {post.locationName}
              {post.address ? ` — ${post.address}` : ""}
            </div>
          )}
          {isRecruitment && post.startAt && (
            <div className="flex items-center gap-2">
              <Calendar width={15} height={15} />
              {formatDateTimeVn(post.startAt)}
              {post.endAt ? ` – ${formatDateTimeVn(post.endAt)}` : ""}
            </div>
          )}
          {isRecruitment && post.level && (
            <div className="flex items-center gap-2">
              <Wifi width={15} height={15} />
              {LEVEL_LABELS[post.level] ?? post.level}
            </div>
          )}
          {isRecruitment && post.feePerPerson != null && post.feePerPerson > 0 && (
            <div className="font-semibold text-on-surface">
              {formatCurrencyVnd(post.feePerPerson)} / người
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-border-soft)] pt-4">
          <LikeButton postId={post.id} liked={post.currentUserReacted} count={post.reactionCount} />

          {!post.canEdit && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[13px] font-medium text-on-surface-variant hover:text-error"
            >
              <TriangleFlag width={15} height={15} />
              Báo cáo
            </button>
          )}

          {post.canEdit && (
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/community/posts/${post.id}/edit`}
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12.5px] font-medium text-on-surface hover:border-primary/40 hover:text-primary"
              >
                <EditPencil width={14} height={14} />
                Sửa
              </Link>
              {canClose && (
                <button
                  type="button"
                  onClick={() => setCloseConfirmOpen(true)}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12.5px] font-medium text-on-surface hover:border-amber-400 hover:text-amber-600"
                >
                  <Lock width={14} height={14} />
                  Đóng bài
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12.5px] font-medium text-on-surface hover:border-error hover:text-error"
              >
                <Trash width={14} height={14} />
                Xoá
              </button>
            </div>
          )}
        </div>

        <CommentThread postId={post.id} commentsEnabled={post.allowComments} totalCount={post.commentCount} />
      </div>

      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {isRecruitment && <ApplicationPanel post={post} />}
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="community_post" targetId={post.id} />

      <Modal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Đóng bài đăng?"
        description="Bài đăng sẽ ngừng nhận đăng ký mới. Hành động này không thể hoàn tác."
        footer={
          <>
            <button type="button" onClick={() => setCloseConfirmOpen(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container-low">
              Huỷ
            </button>
            <button type="button" onClick={() => void handleClose()} disabled={closeMutation.isPending} className="rounded-[8px] bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
              {closeMutation.isPending ? "Đang đóng…" : "Đóng bài"}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-on-surface-variant">Không có cách nào mở lại bài đăng sau khi đóng.</p>
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Xoá bài đăng?"
        description="Bài đăng và toàn bộ bình luận sẽ bị xoá vĩnh viễn."
        footer={
          <>
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container-low">
              Huỷ
            </button>
            <button type="button" onClick={() => void handleDelete()} disabled={deleteMutation.isPending} className="rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60">
              {deleteMutation.isPending ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-on-surface-variant">Bạn chắc chắn muốn xoá bài đăng này?</p>
      </Modal>
    </div>
  );
}
