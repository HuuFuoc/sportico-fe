"use client";

import { useMemo, useState } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, initials } from "@/lib/utils";
import {
  getMessagesForThread,
  getThreadsForUser,
} from "@/lib/mock/messages";
import { getUserById } from "@/lib/mock/users";

interface MessagesViewProps {
  userId: string;
  /** Header subtitle next to other user name (e.g. "Marathon Prep"). */
}

export function MessagesView({ userId }: MessagesViewProps) {
  const threads = getThreadsForUser(userId);
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [composer, setComposer] = useState("");

  const messages = useMemo(
    () => (activeId ? getMessagesForThread(activeId) : []),
    [activeId],
  );
  const active = threads.find((t) => t.id === activeId);
  const otherId = active?.participantIds.find((id) => id !== userId) ?? "";
  const other = active?.isAI ? null : getUserById(otherId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-7rem)]">
      <aside className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-soft)]">
          <h2 className="text-h2 mb-3">Messages</h2>
          <div className="flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-9">
            <MaterialIcon
              name="search"
              size={16}
              className="text-on-surface-variant"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              className="flex-1 ml-2 bg-transparent outline-none text-body-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-6 text-body-sm text-on-surface-variant text-center">
              No conversations yet.
            </p>
          )}
          {threads.map((t) => {
            const oid = t.participantIds.find((id) => id !== userId) ?? "";
            const usr = t.isAI ? null : getUserById(oid);
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors",
                  isActive ? "bg-primary/5" : "hover:bg-surface-container-low",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                    t.isAI
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-primary font-medium",
                  )}
                >
                  {t.isAI ? (
                    <MaterialIcon name="psychology" filled size={20} />
                  ) : usr?.avatarUrl ? (
                    <img
                      src={usr.avatarUrl}
                      alt={usr.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(usr?.name ?? "?")
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body-base font-medium truncate">
                      {t.isAI ? "Ask AI" : (usr?.name ?? "Unknown")}
                    </p>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                      {new Date(t.lastMessageAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant truncate mt-0.5">
                    {t.lastMessagePreview}
                  </p>
                </div>
                {t.unreadCount > 0 && (
                  <span className="ml-auto self-center w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-medium shrink-0">
                    {t.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  active.isAI
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-primary",
                )}
              >
                {active.isAI ? (
                  <MaterialIcon name="psychology" filled size={18} />
                ) : other?.avatarUrl ? (
                  <img
                    src={other.avatarUrl}
                    alt={other.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(other?.name ?? "?")
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-h3 truncate">
                  {active.isAI ? "Ask AI" : (other?.name ?? "Unknown")}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {active.isAI ? "Coach Assistant" : "Online"}
                </p>
              </div>
              <button className="p-2 rounded hover:bg-surface-container-low">
                <MaterialIcon
                  name="more_horiz"
                  size={18}
                  className="text-on-surface-variant"
                />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-low/40">
              {messages.map((m) => {
                const fromMe = m.senderId === userId;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-1 max-w-[75%]",
                      fromMe ? "ml-auto items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "px-3 py-2 rounded-[10px] text-body-base",
                        fromMe
                          ? "bg-primary text-on-primary rounded-tr-[2px]"
                          : "bg-surface-container-lowest border border-[var(--color-border-soft)] text-on-surface rounded-tl-[2px]",
                      )}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {new Date(m.sentAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-[var(--color-border-soft)]">
              <div className="flex items-center gap-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 py-2 focus-within:border-primary transition-colors">
                <button className="text-on-surface-variant hover:text-primary">
                  <MaterialIcon name="attach_file" size={18} />
                </button>
                <input
                  type="text"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent outline-none text-body-base"
                />
                <button
                  disabled={!composer.trim()}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded text-body-sm font-medium disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
