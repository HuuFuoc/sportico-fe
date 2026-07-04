"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Image as ImageIcon,
  Minus,
  Paperclip,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { DockChat } from "@/lib/store/useChatDock";
import type { Message } from "@/types";

interface MiniChatWindowProps {
  chat: DockChat;
  /** Signed-in user's id — decides which side each bubble sits on. */
  userId: string;
  onMinimize: () => void;
  onClose: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A single floating Messenger-style chat window. Reuses the same api.* data path
 * as the full MessagesView (fetch + 6s poll + optimistic send) so both surfaces
 * stay consistent — this is a compact view, not a parallel implementation.
 */
export function MiniChatWindow({
  chat,
  userId,
  onMinimize,
  onClose,
}: MiniChatWindowProps) {
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const threadId = chat.id;

  const loadMessages = useCallback(
    (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
        setError(false);
      }
      api
        .fetchMessages(threadId)
        .then((msgs) => {
          setServerMessages(msgs);
          setLoading(false);
        })
        .catch(() => {
          if (showSpinner) {
            setError(true);
            setLoading(false);
          }
          // Silent on poll failures — don't disrupt an open window.
        });
    },
    [threadId],
  );

  // Initial load.
  useEffect(() => {
    loadMessages(true);
  }, [loadMessages]);

  // Background poll every 6s — paused while minimized or the tab is hidden.
  useEffect(() => {
    if (chat.minimized) return;
    const poll = () => {
      if (document.hidden) return;
      loadMessages(false);
    };
    const id = window.setInterval(poll, 6_000);
    return () => window.clearInterval(id);
  }, [loadMessages, chat.minimized]);

  // Merge server + optimistic messages, de-duplicating by id.
  const messages = useMemo(() => {
    const baseIds = new Set(serverMessages.map((m) => m.id));
    const extra = pending.filter((m) => !baseIds.has(m.id));
    return extra.length ? [...serverMessages, ...extra] : serverMessages;
  }, [serverMessages, pending]);

  // Auto-scroll to the newest message on load and on new messages.
  useEffect(() => {
    if (chat.minimized) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, chat.minimized, loading]);

  // Auto-grow the composer up to a small max.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [composer]);

  const handleSend = async () => {
    const text = composer.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setSendFailed(false);
    setComposer("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      threadId,
      senderId: userId,
      text,
      sentAt: new Date().toISOString(),
    };
    setPending((p) => [...p, optimistic]);
    try {
      const saved = await api.sendMessage(threadId, text);
      setPending((p) => p.map((m) => (m.id === tempId ? saved : m)));
      // Refresh from server so the next poll dedupes cleanly.
      loadMessages(false);
    } catch {
      setPending((p) => p.filter((m) => m.id !== tempId));
      setComposer(text);
      setSendFailed(true);
    } finally {
      setIsSending(false);
    }
  };

  // ── Minimized: header bar only ─────────────────────────────────────────────
  if (chat.minimized) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="pointer-events-auto w-[260px] overflow-hidden rounded-t-[14px] border border-b-0 border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_12px_32px_-12px_rgba(15,15,30,0.28)]"
      >
        <Header
          chat={chat}
          minimized
          onToggleMinimize={onMinimize}
          onClose={onClose}
        />
      </motion.div>
    );
  }

  // ── Expanded window ────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.24, ease: EASE }}
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest",
        "shadow-[0_20px_56px_-16px_rgba(15,15,30,0.35),0_4px_12px_rgba(15,15,30,0.1)]",
        "h-[520px] max-h-[calc(100dvh-6rem)] w-[calc(100vw-24px)] sm:w-[352px]",
      )}
    >
      <Header
        chat={chat}
        onToggleMinimize={onMinimize}
        onClose={onClose}
      />

      {/* Body */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface-container-low/30 px-3 py-3"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-on-surface-variant" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle size={20} className="text-rose-500" />
            <p className="text-[12.5px] text-on-surface-variant">
              Không tải được tin nhắn.
            </p>
            <button
              type="button"
              onClick={() => loadMessages(true)}
              className="rounded-full border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-1.5 text-[12px] font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Thử lại
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
              <Sparkles size={18} className="text-primary" />
            </div>
            <p className="text-[13px] font-medium text-on-surface">
              Chưa có tin nhắn
            </p>
            <p className="mt-1 text-[12px] text-on-surface-variant">
              Gửi lời chào tới {chat.participantName}.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const fromMe = m.senderId === userId;
            const prev = messages[i - 1];
            const groupStart = !prev || prev.senderId !== m.senderId;
            const pendingSend = m.id.startsWith("temp-");
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col",
                  fromMe ? "items-end" : "items-start",
                  groupStart ? "mt-2 first:mt-0" : "mt-0.5",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap break-words rounded-[16px] px-3 py-2 text-[13px] leading-[1.5]",
                    fromMe
                      ? "bg-gradient-to-br from-primary to-[#4338ca] text-on-primary rounded-br-[6px]"
                      : "border border-[var(--color-border-soft)] bg-surface-container-lowest text-on-surface rounded-bl-[6px]",
                    pendingSend && "opacity-70",
                  )}
                >
                  {m.text}
                </div>
                <span className="mt-0.5 px-1 text-[10px] tabular-nums text-on-surface-variant/80">
                  {pendingSend ? "Đang gửi…" : formatTime(m.sentAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--color-border-soft)] px-2.5 py-2">
        {sendFailed && (
          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11.5px] text-rose-600">
            <AlertTriangle size={12} />
            Không gửi được. Thử lại.
          </div>
        )}
        <div className="flex items-end gap-1 rounded-[14px] bg-surface-container-low px-1.5 py-1">
          <IconButton icon={Paperclip} label="Đính kèm file" />
          <IconButton icon={ImageIcon} label="Thêm ảnh" />
          <textarea
            ref={composerRef}
            name="mini-chat-message"
            aria-label="Nhập tin nhắn"
            value={composer}
            onChange={(e) => {
              setComposer(e.target.value);
              if (sendFailed) setSendFailed(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Nhập tin nhắn..."
            rows={1}
            className="max-h-24 min-h-[32px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] leading-5 outline-none placeholder:text-on-surface-variant"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!composer.trim() || isSending}
            aria-label="Gửi tin nhắn"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
              composer.trim() && !isSending
                ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary hover:scale-105 active:scale-95"
                : "cursor-not-allowed bg-surface-container text-on-surface-variant",
            )}
          >
            {isSending ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Header({
  chat,
  minimized = false,
  onToggleMinimize,
  onClose,
}: {
  chat: DockChat;
  minimized?: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2.5",
        minimized && "cursor-pointer border-b-0 hover:bg-surface-container-low",
      )}
      // On the minimized bar, clicking anywhere (except the buttons) restores it.
      onClick={minimized ? onToggleMinimize : undefined}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[12px] font-medium",
            chat.isAI
              ? "bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary"
              : "bg-surface-container-high text-primary",
          )}
        >
          {chat.isAI ? (
            <Sparkles size={16} />
          ) : chat.participantAvatarUrl ? (
            <img
              src={chat.participantAvatarUrl}
              alt={chat.participantName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(chat.participantName)
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold leading-tight text-on-surface">
          {chat.participantName}
        </p>
        <p className="truncate text-[11px] leading-tight text-on-surface-variant">
          {chat.isAI ? "Luôn sẵn sàng" : "Tin nhắn trực tiếp"}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {!minimized && (
          <>
            {/* Call / video are UI-only for now — disabled, no fake action. */}
            <HeaderIconButton icon={Phone} label="Gọi thoại (sắp có)" disabled />
            <HeaderIconButton icon={Video} label="Gọi video (sắp có)" disabled />
          </>
        )}
        <HeaderIconButton
          icon={Minus}
          label={minimized ? "Mở rộng" : "Thu nhỏ"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
          }}
        />
        <HeaderIconButton
          icon={X}
          label="Đóng"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

function HeaderIconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Phone;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        disabled
          ? "cursor-default text-on-surface-variant/40"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
      )}
    >
      <Icon size={15} />
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
}: {
  icon: typeof Paperclip;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
    >
      <Icon size={15} />
    </button>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
