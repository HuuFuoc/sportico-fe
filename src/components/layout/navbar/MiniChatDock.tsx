"use client";

import { AnimatePresence } from "motion/react";
import { useChatDock } from "@/lib/store/useChatDock";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { getCurrentUserId } from "@/lib/auth-session";
import { MiniChatWindow } from "./MiniChatWindow";

/**
 * Global dock that renders the floating mini-chat windows opened from the
 * navbar message dropdown. Mounted once in the public layout; reads the shared
 * `useChatDock` store so it stays in sync with the dropdown in the navbar.
 *
 * `position: fixed` bottom-right — it overlays the page without shifting layout.
 */
export function MiniChatDock() {
  const chats = useChatDock((s) => s.chats);
  const minimizeChat = useChatDock((s) => s.minimizeChat);
  const closeChat = useChatDock((s) => s.closeChat);

  // Reactive to login; falls back to the JWT-derived id.
  const authUser = useAuthStore((s) => s.user);
  const userId = getCurrentUserId() ?? authUser?.id ?? "";

  if (chats.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[70] flex items-end gap-3">
      <AnimatePresence initial={false}>
        {chats.map((chat, i) => (
          <div
            key={chat.id}
            // On mobile only the most recent window shows (windows are near
            // full-width there); desktop shows the whole row.
            className={i !== chats.length - 1 ? "hidden sm:block" : "block"}
          >
            <MiniChatWindow
              chat={chat}
              userId={userId}
              onMinimize={() =>
                chat.minimized ? useChatDock.getState().restoreChat(chat.id) : minimizeChat(chat.id)
              }
              onClose={() => closeChat(chat.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
