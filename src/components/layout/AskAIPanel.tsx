"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useAppStore } from "@/lib/store/useAppStore";

export function AskAIPanel({ className }: { className?: string }) {
  const userId = useAppStore((s) => s.currentUserId);
  const { data: threadsData } = useApiResource(
    () => api.fetchThreads(userId),
    [userId],
  );
  const aiThread = (threadsData ?? []).find((t) => t.isAI);
  const { data: messagesData } = useApiResource(
    () => (aiThread ? api.fetchMessages(aiThread.id) : Promise.resolve([])),
    [aiThread?.id],
  );
  const messages = messagesData ?? [];
  const [input, setInput] = useState("");

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--color-border-soft)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-[8px] bg-primary text-on-primary flex items-center justify-center">
          <MaterialIcon name="psychology" filled size={20} weight={500} />
        </div>
        <div className="min-w-0">
          <h4 className="text-h3 text-on-surface">Ask AI</h4>
          <p className="text-body-sm text-on-surface-variant">
            Coach Assistant
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-body-sm text-on-surface-variant text-center pt-8">
            Ask me anything about your training plan.
          </p>
        )}
        {messages.map((m) => {
          const isUser = !m.isAI && m.senderId !== "ai";
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-1",
                isUser ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] px-3 py-2 rounded-[10px] text-body-sm",
                  isUser
                    ? "bg-primary text-on-primary rounded-tr-[2px]"
                    : "bg-surface-container-lowest border border-[var(--color-border-soft)] text-on-surface rounded-tl-[2px]",
                )}
              >
                {m.text}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                {new Date(m.sentAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[6px] px-3 py-2 focus-within:border-primary transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 bg-transparent outline-none border-none text-body-sm"
          />
          <button
            disabled={!input.trim()}
            className="p-1.5 bg-primary text-on-primary rounded disabled:opacity-50"
          >
            <MaterialIcon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
