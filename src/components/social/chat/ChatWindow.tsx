"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  Prohibition,
  ShieldAlert,
  TriangleFlag,
  Xmark,
} from "iconoir-react";
import ClassicLoader from "@/components/ui/loader";
import { ErrorState } from "@/components/common/AsyncStates";
import { ReportModal } from "@/components/social/ReportModal";
import { Modal } from "@/components/social/Modal";
import { ChatComposer } from "@/components/social/chat/ChatComposer";
import { MessageBubble, bubbleFromMessage, bubbleFromPending } from "@/components/social/chat/MessageBubble";
import { usePublicUser } from "@/lib/social/hooks/usePublicUser";
import {
  useAcceptChatRoom,
  useLatestChatMessages,
  useRejectChatRoom,
  useSendChatMessage,
} from "@/lib/social/hooks/useChat";
import { useBlockUser, useIsBlocked, useUnblockUser } from "@/lib/social/hooks/useBlock";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { composerPermission, canRespondToRequest } from "@/lib/social/chat-permissions";
import { isChatBlockedError } from "@/lib/social/errors";
import { showApiError, showSuccess } from "@/lib/toast";
import { BLOCK_REASON_MAX_LENGTH } from "@/lib/social/api/block";
import type { ChatRoomResponse, PendingMessage, SendMessageAttachmentRequest } from "@/lib/social/types";

interface ChatWindowProps {
  room: ChatRoomResponse;
  backHref?: string;
}

export function ChatWindow({ room, backHref }: ChatWindowProps) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const otherUserId = room.otherUserId ?? (room.user1Id === currentUserId ? room.user2Id : room.user1Id);
  const { data: otherUser } = usePublicUser(otherUserId);
  const isBlocked = useIsBlocked(otherUserId);

  const { data: messagesPage, isLoading, isError, refetch } = useLatestChatMessages(room.id);
  const sendMutation = useSendChatMessage(room.id);
  const acceptMutation = useAcceptChatRoom();
  const rejectMutation = useRejectChatRoom();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [locked, setLocked] = useState(false); // 403 CHAT_USER_BLOCKED after a send attempt
  const scrollRef = useRef<HTMLDivElement>(null);
  // Monotonic counter instead of Date.now()/Math.random(): those are impure
  // calls the React Compiler's purity check rejects anywhere in a component
  // body, including inside an event-handler closure it can't prove is only
  // ever invoked from an event. A ref mutation has no such restriction.
  const tempIdSeq = useRef(0);
  const nextTempId = () => `pending-${++tempIdSeq.current}`;

  const serverMessages = [...(messagesPage?.items ?? [])].reverse(); // sentAt DESC → chronological

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [serverMessages.length, pending.length]);

  const permission = composerPermission(room, currentUserId, isBlocked);
  const canRespond = canRespondToRequest(room, currentUserId);

  async function handleSubmit({ content, attachments }: { content: string; attachments: SendMessageAttachmentRequest[] }) {
    const tempId = nextTempId();
    const entry: PendingMessage = {
      tempId,
      content,
      sentAt: new Date().toISOString(),
      status: "sending",
      attachments,
    };
    setPending((prev) => [...prev, entry]);

    try {
      await sendMutation.mutateAsync({ content: content || undefined, attachments: attachments.length ? attachments : undefined });
      setPending((prev) => prev.filter((p) => p.tempId !== tempId));
    } catch (err) {
      if (isChatBlockedError(err)) {
        setLocked(true);
      }
      setPending((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, status: "failed" } : p)));
      showApiError(err);
    }
  }

  function retryPending(tempId: string) {
    const entry = pending.find((p) => p.tempId === tempId);
    if (!entry) return;
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));
    void handleSubmit({ content: entry.content, attachments: entry.attachments });
  }

  function discardPending(tempId: string) {
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));
  }

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync(room.id);
      showSuccess("Đã chấp nhận yêu cầu trò chuyện.");
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync(room.id);
      showSuccess("Đã từ chối yêu cầu trò chuyện.");
      setRejectConfirm(false);
    } catch (err) {
      showApiError(err);
    }
  }

  async function handleBlockToggle() {
    if (!otherUserId) return;
    try {
      if (isBlocked) {
        await unblockMutation.mutateAsync(otherUserId);
        showSuccess("Đã bỏ chặn người dùng.");
      } else {
        await blockMutation.mutateAsync({ userId: otherUserId, payload: { reason: blockReason.slice(0, BLOCK_REASON_MAX_LENGTH) || undefined } });
        showSuccess("Đã chặn người dùng.");
        setLocked(false);
      }
      setBlockOpen(false);
      setBlockReason("");
    } catch (err) {
      showApiError(err);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] px-4 py-3">
        {backHref && (
          <Link href={backHref} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-on-surface-variant hover:bg-surface-container-high lg:hidden">
            <ArrowLeft width={18} height={18} />
          </Link>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
          {(otherUser?.name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-on-surface">{otherUser?.name ?? "Đang tải…"}</p>
        <button
          type="button"
          onClick={() => setBlockOpen(true)}
          className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium text-on-surface-variant hover:bg-surface-container-high"
        >
          <Prohibition width={14} height={14} />
          {isBlocked ? "Bỏ chặn" : "Chặn"}
        </button>
      </div>

      {isBlocked && (
        <div className="flex items-center gap-2 bg-rose-50 px-4 py-2.5 text-[12.5px] text-rose-700">
          <Prohibition width={15} height={15} />
          Bạn đã chặn người dùng này. Họ sẽ không thể nhắn tin cho bạn.
        </div>
      )}

      {locked && !isBlocked && (
        <div className="flex items-center gap-2 bg-rose-50 px-4 py-2.5 text-[12.5px] text-rose-700">
          <ShieldAlert width={15} height={15} />
          Không thể gửi tin nhắn — người dùng này đã chặn bạn.
        </div>
      )}

      {(room.status ?? "").toLowerCase() === "pending" && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800">
          <Clock width={15} height={15} className="shrink-0" />
          {canRespond ? (
            <>
              <span className="flex-1">{otherUser?.name ?? "Người này"} muốn bắt đầu trò chuyện với bạn.</span>
              <button type="button" onClick={() => void handleAccept()} disabled={acceptMutation.isPending} className="flex items-center gap-1 rounded-[6px] bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <Check width={13} height={13} /> Chấp nhận
              </button>
              <button type="button" onClick={() => setRejectConfirm(true)} className="flex items-center gap-1 rounded-[6px] border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100">
                <Xmark width={13} height={13} /> Từ chối
              </button>
            </>
          ) : (
            <span>Đang chờ {otherUser?.name ?? "người nhận"} chấp nhận yêu cầu trò chuyện.</span>
          )}
        </div>
      )}

      {(room.status ?? "").toLowerCase() === "rejected" && (
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2.5 text-[12.5px] text-slate-600">
          <Xmark width={15} height={15} />
          Yêu cầu trò chuyện đã bị từ chối. Cuộc trò chuyện này chỉ có thể xem lại.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <ClassicLoader size="lg" />
          </div>
        )}
        {isError && !isLoading && <ErrorState title="Không tải được tin nhắn" onRetry={() => refetch()} />}
        {!isLoading && !isError && serverMessages.length === 0 && pending.length === 0 && (
          <p className="py-8 text-center text-[13px] text-on-surface-variant">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
        )}
        {serverMessages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className="group relative">
              <MessageBubble mine={mine} {...bubbleFromMessage(m)} />
              {!mine && (
                <button
                  type="button"
                  onClick={() => setReportOpen(m.id)}
                  className="absolute -top-1 left-0 hidden items-center gap-1 rounded-[6px] bg-surface-container-lowest px-1.5 py-0.5 text-[10.5px] text-on-surface-variant shadow-sm group-hover:flex"
                >
                  <TriangleFlag width={10} height={10} /> Báo cáo
                </button>
              )}
            </div>
          );
        })}
        {pending.map((p) => (
          <MessageBubble
            key={p.tempId}
            mine
            {...bubbleFromPending(p)}
            pending={p.status === "sending"}
            failed={p.status === "failed"}
            onRetry={() => retryPending(p.tempId)}
            onDiscard={() => discardPending(p.tempId)}
          />
        ))}
      </div>

      <ChatComposer
        disabled={!permission.canSend}
        disabledHint={
          permission.canSend
            ? undefined
            : permission.reason === "rejected"
              ? "Cuộc trò chuyện đã bị từ chối. Không thể gửi tin nhắn."
              : permission.reason === "pending_receiver"
                ? "Hãy chấp nhận yêu cầu trò chuyện trước khi gửi tin nhắn."
                : permission.reason === "blocked"
                  ? "Bạn đã chặn người dùng này."
                  : "Không thể gửi tin nhắn lúc này."
        }
        onSubmit={(payload) => void handleSubmit(payload)}
      />

      {reportOpen && (
        <ReportModal open onClose={() => setReportOpen(null)} targetType="chat_message" targetId={reportOpen} />
      )}

      <Modal
        open={rejectConfirm}
        onClose={() => setRejectConfirm(false)}
        title="Từ chối yêu cầu trò chuyện?"
        description="Người này sẽ không thể mở lại cuộc trò chuyện này."
        footer={
          <>
            <button type="button" onClick={() => setRejectConfirm(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
              Huỷ
            </button>
            <button type="button" onClick={() => void handleReject()} disabled={rejectMutation.isPending} className="rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60">
              {rejectMutation.isPending ? "Đang xử lý…" : "Từ chối"}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-on-surface-variant">
          Không có cách nào để tạo lại cuộc trò chuyện với người này sau khi từ chối.
        </p>
      </Modal>

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={isBlocked ? "Bỏ chặn người dùng?" : "Chặn người dùng?"}
        description={isBlocked ? "Bạn sẽ có thể trò chuyện với người này trở lại." : "Người này sẽ không thể nhắn tin cho bạn nữa."}
        footer={
          <>
            <button type="button" onClick={() => setBlockOpen(false)} className="rounded-[8px] border border-[var(--color-border-soft)] px-3.5 py-2 text-[13px] font-medium hover:bg-surface-container-low">
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void handleBlockToggle()}
              disabled={blockMutation.isPending || unblockMutation.isPending}
              className="rounded-[8px] bg-error px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-error/90 disabled:opacity-60"
            >
              {isBlocked ? "Bỏ chặn" : "Chặn"}
            </button>
          </>
        }
      >
        {!isBlocked && (
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value.slice(0, BLOCK_REASON_MAX_LENGTH))}
            rows={2}
            placeholder="Lý do (không bắt buộc)…"
            className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
          />
        )}
      </Modal>
    </div>
  );
}
