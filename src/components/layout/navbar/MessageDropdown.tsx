"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MessageSquareDashed, Sparkles } from "lucide-react";
import { cn, formatRelativeTimeVi } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import type { ConversationPreview } from "@/lib/hooks/useRecentConversations";

interface MessageDropdownProps {
  conversations: ConversationPreview[];
  loading: boolean;
  error: Error | null;
  /** Full inbox route — footer "Xem tất cả tin nhắn" link. */
  messagesHref: string;
  /** Open a conversation as a floating mini chat (instead of navigating away). */
  onOpenChat: (conversation: ConversationPreview) => void;
  onRetry: () => void;
  onClose: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Messenger-style conversation preview popover. Presentational — the recent
 * threads come from `useRecentConversations` via the nav button.
 */
export function MessageDropdown({
  conversations,
  loading,
  error,
  messagesHref,
  onOpenChat,
  onRetry,
  onClose,
}: MessageDropdownProps) {
  // Cap the preview list; the full inbox lives behind "Xem tất cả tin nhắn".
  const preview = conversations.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE }}
      role="menu"
      aria-label="Tin nhắn"
      className={cn(
        "fixed left-3 right-3 top-[76px] z-[60] overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest",
        "shadow-[0_16px_48px_-16px_rgba(15,15,30,0.28),0_4px_12px_rgba(15,15,30,0.08)]",
        "md:absolute md:inset-auto md:left-auto md:right-0 md:top-[calc(100%+12px)] md:w-[380px]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
        <p className="text-[16px] font-semibold tracking-tight text-on-surface">
          Tin nhắn
        </p>
      </div>

      {/* List */}
      <div className="max-h-[min(70vh,440px)] overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-container-low" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-low" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container-low" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-[13px] text-on-surface-variant">
              Không tải được tin nhắn.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-4 py-1.5 text-[12.5px] font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Thử lại
            </button>
          </div>
        ) : preview.length === 0 ? (
          <EmptyState />
        ) : (
          preview.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              onSelect={() => {
                onOpenChat(c);
                onClose();
              }}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border-soft)] p-1.5">
        <Link
          href={messagesHref}
          onClick={onClose}
          className="block rounded-[10px] px-4 py-2.5 text-center text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.06]"
        >
          Xem tất cả tin nhắn
        </Link>
      </div>
    </motion.div>
  );
}

function ConversationRow({
  conversation: c,
  onSelect,
}: {
  conversation: ConversationPreview;
  onSelect: () => void;
}) {
  const unread = c.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-low",
        unread && "bg-primary/[0.035]",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {c.isAI ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]">
            <Sparkles size={18} />
          </div>
        ) : (
          <UserAvatar
            avatarUrl={c.participantAvatarUrl}
            name={c.participantName}
            size="md"
            className="h-11 w-11 text-[13px]"
          />
        )}
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[13.5px]",
              unread ? "font-semibold text-on-surface" : "font-medium text-on-surface",
            )}
          >
            {c.participantName}
          </p>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              unread ? "font-medium text-primary" : "text-on-surface-variant",
            )}
          >
            {formatRelativeTimeVi(c.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[12.5px] leading-relaxed",
              c.lastMessage
                ? unread
                  ? "text-on-surface"
                  : "text-on-surface-variant"
                : "italic text-on-surface-variant/70",
            )}
          >
            {c.lastMessage || "Nhấn để mở cuộc trò chuyện"}
          </p>
          {unread && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10.5px] font-semibold tabular-nums text-on-primary">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
        <MessageSquareDashed size={20} className="text-on-surface-variant" />
      </div>
      <p className="text-[13.5px] font-medium text-on-surface">
        Chưa có tin nhắn mới
      </p>
      <p className="mt-1 text-[12.5px] text-on-surface-variant">
        Bắt đầu trò chuyện với huấn luyện viên của bạn.
      </p>
    </div>
  );
}
