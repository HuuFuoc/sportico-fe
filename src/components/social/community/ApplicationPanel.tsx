"use client";

import { useState } from "react";
import Link from "next/link";
import { Group, Send, Xmark } from "iconoir-react";
import { Modal } from "@/components/social/Modal";
import { APPLICATION_STATUS_BADGE_CLASS, APPLICATION_STATUS_LABELS } from "@/lib/social/labels";
import { APPLICATION_MESSAGE_MAX_LENGTH, useApplyToPost, useCancelMyApplication } from "@/lib/social/hooks/useApplications";
import { showApiError, showSuccess } from "@/lib/toast";
import type { CommunityPostResponse } from "@/lib/social/types";

const TERMINAL_STATUSES = new Set(["rejected", "cancelled"]);

export function ApplicationPanel({ post }: { post: CommunityPostResponse }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const applyMutation = useApplyToPost(post.id);
  const cancelMutation = useCancelMyApplication(post.id);

  const status = post.currentUserApplicationStatus;
  const isClosed = (post.status ?? "").toLowerCase() !== "published";

  async function handleApply() {
    try {
      await applyMutation.mutateAsync({ message: message.trim() || undefined });
      showSuccess("Đã gửi đơn đăng ký tham gia.");
      setModalOpen(false);
      setMessage("");
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync();
      showSuccess("Đã huỷ đơn đăng ký.");
    } catch (err) {
      showApiError(err);
    }
  }

  if (post.canEdit) {
    return (
      <Link
        href={`/community/posts/${post.id}/applications`}
        className="flex items-center justify-center gap-2 rounded-[10px] bg-primary/10 px-4 py-2.5 text-[13.5px] font-semibold text-primary hover:bg-primary/15"
      >
        <Group width={16} height={16} />
        Quản lý đơn đăng ký ({post.applicationCount})
      </Link>
    );
  }

  if (status && TERMINAL_STATUSES.has(status)) {
    return (
      <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-high px-4 py-3 text-center">
        <span className={`inline-block rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${APPLICATION_STATUS_BADGE_CLASS[status]}`}>
          {APPLICATION_STATUS_LABELS[status]}
        </span>
        <p className="mt-1.5 text-[11.5px] text-on-surface-variant">Bạn không thể đăng ký lại bài viết này.</p>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <span className="inline-block rounded-[6px] bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Đã được duyệt tham gia
        </span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={cancelMutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13.5px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
      >
        <Xmark width={16} height={16} />
        {cancelMutation.isPending ? "Đang huỷ…" : "Huỷ đơn đăng ký"}
      </button>
    );
  }

  const disabledReason = isClosed
    ? "Bài đăng đã đóng, không nhận đăng ký mới."
    : post.slotsRemaining != null && post.slotsRemaining <= 0
      ? "Bài đăng đã đủ người tham gia."
      : !post.canApply
        ? "Bạn không thể đăng ký bài viết này."
        : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={Boolean(disabledReason)}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant"
      >
        <Send width={16} height={16} />
        Đăng ký tham gia
      </button>
      {disabledReason && <p className="mt-1.5 text-center text-[11.5px] text-on-surface-variant">{disabledReason}</p>}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Đăng ký tham gia"
        description="Gửi một lời nhắn ngắn cho chủ bài đăng (không bắt buộc)."
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container-low"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={applyMutation.isPending}
              className="rounded-[8px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-on-primary hover:bg-[#2d20b8] disabled:opacity-60"
            >
              {applyMutation.isPending ? "Đang gửi…" : "Gửi đăng ký"}
            </button>
          </>
        }
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, APPLICATION_MESSAGE_MAX_LENGTH))}
          rows={3}
          placeholder="VD: Mình chơi trình độ trung bình, rảnh cuối tuần…"
          className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-right text-[11px] text-on-surface-variant">
          {message.length}/{APPLICATION_MESSAGE_MAX_LENGTH}
        </p>
      </Modal>
    </>
  );
}
