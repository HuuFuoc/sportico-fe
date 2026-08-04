"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, EyeClosed, Eye, ReplyToMessage, Trash } from "iconoir-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/social/Modal";
import { Pagination } from "@/components/social/Pagination";
import { RowSkeleton } from "@/components/social/Skeleton";
import { MediaGallery } from "@/components/social/community/MediaGallery";
import { PostStatusBadge } from "@/components/social/community/PostStatusBadge";
import {
  useAdminCommunityPost,
  useAdminPostComments,
  useDeleteAdminComment,
  useDeleteAdminPost,
  useHideAdminComment,
  useHideAdminPost,
  useRestoreAdminComment,
  useRestoreAdminPost,
} from "@/lib/social/hooks/useAdminCommunity";
import { POST_TYPE_LABELS } from "@/lib/social/labels";
import { formatDateTimeVn, formatRelativeVn } from "@/lib/social/datetime";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CommunityCommentResponse } from "@/lib/social/types";

const HIDE_REASON_MAX = 1000;

export function AdminCommunityPostDetailClient({ postId }: { postId: string }) {
  const { data: post, isLoading, isError, refetch } = useAdminCommunityPost(postId);
  const hidePost = useHideAdminPost(postId);
  const restorePost = useRestoreAdminPost(postId);
  const deletePost = useDeleteAdminPost();

  const [hideModal, setHideModal] = useState<"post" | string | null>(null); // "post" or a commentId
  const [reason, setReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [commentPage, setCommentPage] = useState(1);

  const comments = useAdminPostComments(postId, commentPage);
  const hideComment = useHideAdminComment(postId);
  const restoreComment = useRestoreAdminComment(postId);
  const deleteComment = useDeleteAdminComment(postId);

  async function submitHide() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      if (hideModal === "post") {
        await hidePost.mutateAsync({ reason: trimmed });
        showSuccess("Đã ẩn bài đăng.");
      } else if (hideModal) {
        await hideComment.mutateAsync({ commentId: hideModal, payload: { reason: trimmed } });
        showSuccess("Đã ẩn bình luận.");
      }
      setHideModal(null);
      setReason("");
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleRestorePost() {
    try {
      await restorePost.mutateAsync();
      showSuccess("Đã khôi phục bài đăng.");
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleDeletePost() {
    try {
      await deletePost.mutateAsync(postId);
      showSuccess("Đã xoá bài đăng.");
      setDeleteConfirm(false);
    } catch (err) {
      showApiError(err);
    }
  }

  if (isLoading) {
    return (
      <AppShell role="admin" title="Chi tiết bài đăng">
        <LoadingState label="Đang tải…" />
      </AppShell>
    );
  }

  if (isError || !post) {
    return (
      <AppShell role="admin" title="Chi tiết bài đăng">
        <ErrorState title="Không tải được bài đăng" onRetry={() => refetch()} />
      </AppShell>
    );
  }

  const status = (post.status ?? "").toLowerCase();
  const isDeleted = status === "deleted";
  const isHidden = status === "hidden";

  return (
    <AppShell role="admin" title="Chi tiết bài đăng">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/community" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-on-surface-variant hover:text-primary">
          <ArrowLeft width={14} height={14} />
          Danh sách kiểm duyệt
        </Link>

        <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-[6px] bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {POST_TYPE_LABELS[post.postType ?? ""] ?? post.postType}
                </span>
                <PostStatusBadge status={post.status} />
              </div>
              <h1 className="mt-2 text-[17px] font-bold text-on-surface">{post.title}</h1>
              <p className="mt-0.5 text-[12.5px] text-on-surface-variant">
                {post.author?.fullName || "Người dùng"} · {formatRelativeVn(post.createdAt)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-1.5">
              {!isDeleted && !isHidden && (
                <button
                  type="button"
                  onClick={() => setHideModal("post")}
                  className="flex items-center gap-1.5 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <EyeClosed width={13} height={13} /> Ẩn bài
                </button>
              )}
              {isHidden && (
                <button
                  type="button"
                  onClick={() => void handleRestorePost()}
                  disabled={restorePost.isPending}
                  className="flex items-center gap-1.5 rounded-[8px] border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <Eye width={13} height={13} /> Khôi phục
                </button>
              )}
              {!isDeleted && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-[8px] border border-rose-300 bg-rose-50 px-3 py-1.5 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash width={13} height={13} /> Xoá
                </button>
              )}
            </div>
          </div>

          {post.media.length > 0 && <MediaGallery media={post.media} className="mt-4" />}
          <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-on-surface">{post.content}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border-soft)] pt-4 text-[12px] text-on-surface-variant sm:grid-cols-4">
            <span>Lượt xem: {post.viewCount}</span>
            <span>Thích: {post.reactionCount}</span>
            <span>Bình luận: {post.commentCount}</span>
            <span>Đăng ký: {post.applicationCount}</span>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-[14px] font-semibold text-on-surface">Bình luận ({comments.data?.totalCount ?? 0})</h2>

          <div className="overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
            {comments.isLoading && (
              <div className="divide-y divide-[var(--color-border-soft)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            )}
            {comments.isError && !comments.isLoading && (
              <div className="p-6">
                <ErrorState title="Không tải được bình luận" onRetry={() => comments.refetch()} />
              </div>
            )}
            {!comments.isLoading && !comments.isError && comments.data?.items.length === 0 && (
              <EmptyState icon="chat_bubble" title="Chưa có bình luận" className="border-0" />
            )}
            {!comments.isLoading && !comments.isError && comments.data && comments.data.items.length > 0 && (
              <div className="divide-y divide-[var(--color-border-soft)]">
                {comments.data.items.map((c) => (
                  <AdminCommentRow
                    key={c.id}
                    comment={c}
                    onHide={() => setHideModal(c.id)}
                    onRestore={() => void restoreComment.mutateAsync(c.id).then(() => showSuccess("Đã khôi phục bình luận.")).catch(showApiError)}
                    onDelete={() => void deleteComment.mutateAsync(c.id).then(() => showSuccess("Đã xoá bình luận.")).catch(showApiError)}
                  />
                ))}
              </div>
            )}
          </div>

          {comments.data && comments.data.totalPages > 1 && (
            <Pagination pageNumber={comments.data.pageNumber} totalPages={comments.data.totalPages} onChange={setCommentPage} className="mt-3" />
          )}
        </div>
      </div>

      <Modal
        open={hideModal !== null}
        onClose={() => {
          setHideModal(null);
          setReason("");
        }}
        title={hideModal === "post" ? "Ẩn bài đăng" : "Ẩn bình luận"}
        description="Lý do là bắt buộc và có thể hiển thị cho tác giả."
        footer={
          <>
            <button type="button" onClick={() => setHideModal(null)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void submitHide()}
              disabled={!reason.trim() || hidePost.isPending || hideComment.isPending}
              className="rounded-[8px] bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Ẩn
            </button>
          </>
        }
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, HIDE_REASON_MAX))}
          rows={3}
          placeholder="Lý do ẩn nội dung…"
          className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-right text-[11px] text-on-surface-variant">{reason.length}/{HIDE_REASON_MAX}</p>
      </Modal>

      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Xoá bài đăng?"
        description="Hành động này không thể hoàn tác."
        footer={
          <>
            <button type="button" onClick={() => setDeleteConfirm(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
              Huỷ
            </button>
            <button type="button" onClick={() => void handleDeletePost()} disabled={deletePost.isPending} className="rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60">
              Xoá vĩnh viễn
            </button>
          </>
        }
      >
        <p className="text-[13px] text-on-surface-variant">Bài đăng và các liên kết liên quan sẽ bị xoá.</p>
      </Modal>
    </AppShell>
  );
}

function AdminCommentRow({
  comment,
  onHide,
  onRestore,
  onDelete,
}: {
  comment: CommunityCommentResponse;
  onHide: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const status = comment.status ?? "";
  const isReply = comment.parentCommentId != null;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[12px] font-semibold text-on-surface-variant">
        {(comment.author?.fullName ?? "?").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px]">
          {isReply && <ReplyToMessage width={11} height={11} className="text-on-surface-variant" />}
          <span className="font-semibold text-on-surface">{comment.author?.fullName || "Người dùng"}</span>
          <span className={cn("rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold", status === "hidden" ? "bg-amber-100 text-amber-700" : status === "deleted" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
            {status === "hidden" ? "Đã ẩn" : status === "deleted" ? "Đã xoá" : "Hiển thị"}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-on-surface">{comment.content}</p>
        <p className="mt-0.5 text-[11px] text-on-surface-variant">{formatDateTimeVn(comment.createdAt)}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {status === "active" && (
          <button type="button" onClick={onHide} className="rounded-[6px] px-2 py-1 text-[11.5px] font-medium text-amber-700 hover:bg-amber-50">
            Ẩn
          </button>
        )}
        {status === "hidden" && (
          <button type="button" onClick={onRestore} className="rounded-[6px] px-2 py-1 text-[11.5px] font-medium text-emerald-700 hover:bg-emerald-50">
            Khôi phục
          </button>
        )}
        {status !== "deleted" && (
          <button type="button" onClick={onDelete} className="rounded-[6px] px-2 py-1 text-[11.5px] font-medium text-rose-700 hover:bg-rose-50">
            Xoá
          </button>
        )}
      </div>
    </div>
  );
}
