"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Bot, RotateCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommendedCoaches } from "@/components/advisory/RecommendedCoaches";
import type { ChatMessage } from "@/types/advisory";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Presentational chat surface (messages + composer). It owns NO conversation
 * state — `messages`/`isSending`/`error` and the `onSend`/`onRetry` callbacks
 * are supplied by the parent (`AdvisoryWidget`), which holds the
 * `useAdvisoryChat` hook. Keeping the hook in the parent means closing the
 * panel can unmount this component without losing the conversation.
 *
 * Only local, throwaway UI state lives here: the composer draft, the scroll
 * position, and focus-on-mount.
 */
interface AdvisoryChatProps {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onRetry: () => void;
}

export function AdvisoryChat({
  messages,
  isSending,
  error,
  onSend,
  onRetry,
}: AdvisoryChatProps) {
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the composer when this mounts (i.e. when the panel opens).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to the newest bubble.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending, error]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    onSend(text);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} reduce={reduce ?? false} />
        ))}

        {isSending && <TypingIndicator reduce={reduce ?? false} />}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[10px] border border-error/30 bg-error/5 px-3.5 py-3"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-on-surface">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                disabled={isSending}
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-2.5 py-1 text-body-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
              >
                <RotateCw size={12} />
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-[var(--color-border-soft)] px-3 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nhập tin nhắn…"
          aria-label="Tin nhắn"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2.5 text-body-base text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          aria-label="Gửi"
          className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[6px] bg-primary text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function Bubble({ message, reduce }: { message: ChatMessage; reduce: boolean }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot size={15} />
        </span>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-[12px] px-3.5 py-2.5 text-body-base",
            isUser
              ? "rounded-br-[4px] bg-primary text-on-primary"
              : "rounded-bl-[4px] bg-surface-container-low text-on-surface",
          )}
        >
          {message.content}
        </div>

        {/* Coach recommendations under the assistant reply that produced them. */}
        {!isUser &&
          message.recommendedCoachIds &&
          message.recommendedCoachIds.length > 0 && (
            <RecommendedCoaches coachIds={message.recommendedCoachIds} />
          )}
      </div>
    </motion.div>
  );
}

function TypingIndicator({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot size={15} />
      </span>
      <div className="flex items-center gap-1 rounded-[12px] rounded-bl-[4px] bg-surface-container-low px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-on-surface-variant",
              !reduce && "animate-bounce",
            )}
            style={reduce ? undefined : { animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
