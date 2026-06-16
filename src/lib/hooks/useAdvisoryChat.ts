"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import type { ChatMessage } from "@/types/advisory";

/** Stable id for a chat bubble. Uses crypto.randomUUID where available. */
function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Turn any thrown error into user-friendly Vietnamese copy. Never leaks the raw
 * transport strings (e.g. "Request to /api/v1/advisory/messages failed: 500")
 * into the UI.
 *
 *  • 5xx → transient (often an Azure cold start) → encourage a retry.
 *  • Network failure (status 0, "Network error…") → connectivity hint.
 *  • Backend Result failure (status 0 w/ a real message) → show that message.
 *  • 4xx → prefer the backend's error body message, else a generic line.
 *  • Our own thrown Errors (e.g. mock-mode reject) already read cleanly.
 */
function friendlyAdvisoryError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return "Trợ lý đang bận, vui lòng thử lại sau giây lát.";
    }
    if (err.status === 0) {
      if (/^Network error requesting/i.test(err.message)) {
        return "Mất kết nối tới trợ lý. Vui lòng kiểm tra mạng và thử lại.";
      }
      // unwrap() failure — err.message is already the backend's clean text.
      return err.message;
    }
    const body = err.body as
      | { error?: { message?: string }; message?: string }
      | null
      | undefined;
    const backendMsg = body?.error?.message ?? body?.message;
    if (typeof backendMsg === "string" && backendMsg.trim()) {
      return backendMsg.trim();
    }
    return "Không gửi được tin nhắn lúc này. Vui lòng thử lại.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.";
}

const WELCOME_TEXT =
  "Chào bạn, mình có thể giúp bạn tìm huấn luyện viên phù hợp. " +
  "Bạn đang muốn luyện môn gì và mục tiêu của bạn là gì?";

/** Fresh welcome bubble — created lazily so the timestamp is set once per mount. */
function makeWelcome(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_TEXT,
    createdAt: new Date().toISOString(),
  };
}

export interface UseAdvisoryChat {
  messages: ChatMessage[];
  conversationId: string | null;
  isSending: boolean;
  error: string | null;
  /** Append the user's text (optimistic) and request the assistant's reply. */
  sendMessage: (text: string) => Promise<void>;
  /** Resend the last user message after an error — does NOT duplicate the bubble. */
  retryLast: () => void;
  /** Start a brand-new conversation (clears history + conversationId). */
  resetConversation: () => void;
}

export function useAdvisoryChat(): UseAdvisoryChat {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeWelcome()]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Remember the last user text so the error banner's "retry" can resend it
  // without appending a second identical user bubble.
  const lastUserText = useRef<string | null>(null);

  // Performs the API round-trip + appends the assistant reply. Does NOT touch
  // the user bubble, so it is reused by both first-send and retry.
  const deliver = useCallback(
    async (content: string) => {
      setError(null);
      setIsSending(true);
      try {
        const data = await api.sendAdvisoryMessage(content, conversationId);
        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.reply,
            recommendedCoachIds: data.recommendedCoachIds,
            createdAt: new Date().toISOString(),
          },
        ]);
        lastUserText.current = null;
      } catch (err) {
        // Never crash the UI — surface friendly copy, never the raw HTTP string.
        setError(friendlyAdvisoryError(err));
      } finally {
        setIsSending(false);
      }
    },
    [conversationId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isSending) return;
      lastUserText.current = content;
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content, createdAt: new Date().toISOString() },
      ]);
      await deliver(content);
    },
    [deliver, isSending],
  );

  const retryLast = useCallback(() => {
    if (lastUserText.current && !isSending) void deliver(lastUserText.current);
  }, [deliver, isSending]);

  const resetConversation = useCallback(() => {
    setMessages([makeWelcome()]);
    setConversationId(null);
    setError(null);
    setIsSending(false);
    lastUserText.current = null;
  }, []);

  return {
    messages,
    conversationId,
    isSending,
    error,
    sendMessage,
    retryLast,
    resetConversation,
  };
}
