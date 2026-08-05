"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { EditPencil, ChatBubble, ReplyToMessage, Trash } from "iconoir-react";
import ClassicLoader from "@/components/ui/loader";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatRelativeVn } from "@/lib/social/datetime";
import {
  COMMENT_MAX_LENGTH,
  useComments,
  useCreateComment,
  useCreateReply,
  useDeleteComment,
  useUpdateComment,
} from "@/lib/social/hooks/useComments";
import { rootCommentId } from "@/lib/social/api/comments";
import { showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CommunityCommentResponse } from "@/lib/social/types";

interface CommentThreadProps {
  postId: string;
  commentsEnabled: boolean;
  totalCount: number;
}

export function CommentThread({ postId, commentsEnabled, totalCount }: CommentThreadProps) {
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<CommunityCommentResponse[]>([]);
  const { data, isLoading, isFetching } = useComments(postId, page);

  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [postId]);

  useEffect(() => {
    if (!data) return;
    setAccumulated((prev) => {
      if (page === 1) return data.items;
      const ids = new Set(prev.map((c) => c.id));
      return [...prev, ...data.items.filter((c) => !ids.has(c.id))];
    });
  }, [data, page]);

  const createComment = useCreateComment(postId);
  const [draft, setDraft] = useState("");

  async function handlePost() {
    const content = draft.trim();
    if (!content) return;
    try {
      await createComment.mutateAsync({ content });
      setDraft("");
      setPage(1);
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <div className="mt-6 border-t border-[var(--color-border-soft)] pt-5">
      <h3 className="mb-4 flex items-center gap-1.5 text-[14px] font-semibold text-on-surface">
        <ChatBubble width={16} height={16} />
        Bình luận ({totalCount})
      </h3>

      {commentsEnabled ? (
        <div className="mb-4 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
            rows={2}
            placeholder="Viết bình luận…"
            className="min-w-0 flex-1 resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!draft.trim() || createComment.isPending}
            className="self-end rounded-[8px] bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-on-primary disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      ) : (
        <p className="mb-4 text-[12.5px] text-on-surface-variant">Bài đăng này đã tắt bình luận.</p>
      )}

      {isLoading && page === 1 ? (
        <div className="flex justify-center py-6">
          <ClassicLoader />
        </div>
      ) : accumulated.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-on-surface-variant">Chưa có bình luận nào.</p>
      ) : (
        <div className="space-y-4">
          {accumulated.map((comment) => (
            <CommentItem key={comment.id} postId={postId} comment={comment} commentsEnabled={commentsEnabled} />
          ))}
        </div>
      )}

      {data && page < data.totalPages && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={isFetching}
          className="mt-3 w-full rounded-[8px] border border-[var(--color-border-soft)] py-2 text-[12.5px] font-medium text-on-surface-variant hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {isFetching ? "Đang tải…" : "Xem thêm bình luận"}
        </button>
      )}
    </div>
  );
}

function CommentItem({
  postId,
  comment,
  commentsEnabled,
}: {
  postId: string;
  comment: CommunityCommentResponse;
  commentsEnabled: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.content ?? "");

  const createReply = useCreateReply(postId);
  const updateComment = useUpdateComment(postId);
  const deleteComment = useDeleteComment(postId);

  const isHidden = comment.status === "hidden";
  const isDeleted = comment.status === "deleted";
  const displayContent = isHidden ? "Bình luận đã bị ẩn bởi quản trị viên" : comment.content ?? "";

  async function submitReply() {
    const content = replyDraft.trim();
    if (!content) return;
    try {
      await createReply.mutateAsync({ rootCommentId: rootCommentId(comment), payload: { content } });
      setReplyDraft("");
      setReplying(false);
    } catch (err) {
      showApiError(err);
    }
  }

  async function submitEdit() {
    const content = editDraft.trim();
    if (!content) return;
    try {
      await updateComment.mutateAsync({ commentId: comment.id, payload: { content } });
      setEditing(false);
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleDelete() {
    try {
      await deleteComment.mutateAsync(comment.id);
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex gap-2.5">
        <UserAvatar
          avatarUrl={comment.author?.avatarUrl}
          name={comment.author?.fullName}
          size="sm"
          className="h-8 w-8 text-[12px]"
        />
        <div className="min-w-0 flex-1">
          <div className="rounded-[12px] bg-surface-container-high px-3 py-2">
            <p className="text-[12.5px] font-semibold text-on-surface">
              {comment.author?.fullName || "Người dùng"}
            </p>
            {editing ? (
              <div className="mt-1 space-y-1.5">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                  rows={2}
                  className="w-full resize-none rounded-[6px] border border-[var(--color-border-soft)] bg-surface px-2 py-1.5 text-[13px] text-on-surface focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void submitEdit()} className="text-[11.5px] font-semibold text-primary">
                    Lưu
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="text-[11.5px] text-on-surface-variant">
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <p className={cn("mt-0.5 whitespace-pre-wrap text-[13px] text-on-surface", (isHidden || isDeleted) && "italic text-on-surface-variant")}>
                {displayContent}
              </p>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 px-1 text-[11.5px] text-on-surface-variant">
            <span>{formatRelativeVn(comment.createdAt)}</span>
            {commentsEnabled && !isDeleted && (
              <button type="button" onClick={() => setReplying((v) => !v)} className="flex items-center gap-1 font-medium hover:text-primary">
                <ReplyToMessage width={12} height={12} />
                Trả lời
              </button>
            )}
            {comment.canEdit && !isDeleted && !editing && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 font-medium hover:text-primary">
                  <EditPencil width={12} height={12} />
                  Sửa
                </button>
                <button type="button" onClick={() => void handleDelete()} className="flex items-center gap-1 font-medium hover:text-error">
                  <Trash width={12} height={12} />
                  Xoá
                </button>
              </>
            )}
          </div>

          {replying && (
            <div className="mt-2 flex gap-2">
              <input
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                placeholder={`Trả lời ${comment.author?.fullName ?? "bình luận"}…`}
                className="min-w-0 flex-1 rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-1.5 text-[12.5px] focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void submitReply()}
                disabled={!replyDraft.trim() || createReply.isPending}
                className="rounded-[8px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-on-primary disabled:opacity-50"
              >
                Gửi
              </button>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-[var(--color-border-soft)] pl-3">
              {comment.replies.map((reply) => (
                <ReplyItem key={reply.id} postId={postId} reply={reply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReplyItem({ postId, reply }: { postId: string; reply: CommunityCommentResponse }) {
  const deleteComment = useDeleteComment(postId);
  const isHidden = reply.status === "hidden";
  const isDeleted = reply.status === "deleted";
  const displayContent = isHidden ? "Bình luận đã bị ẩn bởi quản trị viên" : reply.content ?? "";

  return (
    <div className="flex gap-2">
      <UserAvatar
        avatarUrl={reply.author?.avatarUrl}
        name={reply.author?.fullName}
        size="xs"
        className="h-6 w-6 text-[10.5px]"
      />
      <div className="min-w-0 flex-1">
        <div className="rounded-[10px] bg-surface-container-high px-2.5 py-1.5">
          <p className="text-[12px] font-semibold text-on-surface">{reply.author?.fullName || "Người dùng"}</p>
          <p className={cn("text-[12.5px] text-on-surface", (isHidden || isDeleted) && "italic text-on-surface-variant")}>
            {displayContent}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-3 px-1 text-[11px] text-on-surface-variant">
          <span>{formatRelativeVn(reply.createdAt)}</span>
          {reply.canEdit && !isDeleted && (
            <button
              type="button"
              onClick={() => void deleteComment.mutateAsync(reply.id).catch(showApiError)}
              className="font-medium hover:text-error"
            >
              Xoá
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
