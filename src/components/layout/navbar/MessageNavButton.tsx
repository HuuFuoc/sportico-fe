"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentConversations } from "@/lib/hooks/useRecentConversations";
import { useChatDock } from "@/lib/store/useChatDock";
import { UnreadBadge } from "./UnreadBadge";
import { MessageDropdown } from "./MessageDropdown";

interface MessageNavButtonProps {
  /** Signed-in user's id — resolves the "other" participant in each thread. */
  userId: string;
  /** True while the navbar overlays a dark hero (white icon). */
  transparent?: boolean;
  /** Base messages route (e.g. `/learner/messages`). */
  messagesHref: string;
}

/**
 * Navbar chat icon: unread badge + click-to-open Messenger-style preview.
 * Self-contained — owns its open state and pulls recent threads via
 * `useRecentConversations`.
 */
export function MessageNavButton({
  userId,
  transparent = false,
  messagesHref,
}: MessageNavButtonProps) {
  const [open, setOpen] = useState(false);
  const { conversations, totalUnread, loading, error, refetch } =
    useRecentConversations(userId, true);
  const openChat = useChatDock((s) => s.openChat);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Tin nhắn"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          transparent
            ? "text-white hover:bg-white/10"
            : "bg-surface-container-low text-on-surface hover:bg-surface-container",
          open && !transparent && "bg-surface-container",
          open && transparent && "bg-white/10",
        )}
      >
        <MessageCircle size={20} />
        <UnreadBadge
          count={totalUnread}
          ringClassName={transparent ? "ring-transparent" : "ring-surface-container-lowest"}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[55]"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <AnimatePresence>
        {open && (
          <MessageDropdown
            key="message-dropdown"
            conversations={conversations}
            loading={loading}
            error={error}
            messagesHref={messagesHref}
            onOpenChat={(c) =>
              openChat({
                id: c.id,
                participantName: c.participantName,
                participantAvatarUrl: c.participantAvatarUrl,
                isAI: c.isAI,
              })
            }
            onRetry={refetch}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
