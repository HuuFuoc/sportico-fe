"use client";

// ============================================================================
// Floating mini-chat dock state (Messenger-style quick chat on public pages).
//
// The message dropdown (inside PublicNavbar) and the MiniChatDock (mounted in
// the public layout) live in different subtrees, so this module-global zustand
// store bridges them: the dropdown calls `openChat`, the dock renders windows.
// ============================================================================

import { create } from "zustand";

/** Max concurrent open windows on desktop. Oldest is dropped when exceeded. */
const MAX_OPEN = 3;

export interface DockChat {
  /** Chat room / thread id — the key used for api.fetchMessages/sendMessage. */
  id: string;
  participantName: string;
  participantAvatarUrl: string | null;
  isAI: boolean;
  minimized: boolean;
}

/** Identity passed when opening a chat (everything except the `minimized` flag). */
export type OpenChatInput = Omit<DockChat, "minimized">;

interface ChatDockState {
  chats: DockChat[];
  /** Open a chat (or focus + un-minimize it if already open). */
  openChat: (chat: OpenChatInput) => void;
  /** Close a window. */
  closeChat: (id: string) => void;
  /** Collapse a window to just its header bar. */
  minimizeChat: (id: string) => void;
  /** Restore a minimized window. */
  restoreChat: (id: string) => void;
}

export const useChatDock = create<ChatDockState>((set) => ({
  chats: [],

  openChat: (chat) =>
    set((state) => {
      const existing = state.chats.find((c) => c.id === chat.id);
      if (existing) {
        // Already open — just make sure it's expanded, keep its position.
        return {
          chats: state.chats.map((c) =>
            c.id === chat.id ? { ...c, ...chat, minimized: false } : c,
          ),
        };
      }
      const next = [...state.chats, { ...chat, minimized: false }];
      // Cap concurrent windows: drop the oldest (leftmost) when over the limit.
      return { chats: next.slice(-MAX_OPEN) };
    }),

  closeChat: (id) =>
    set((state) => ({ chats: state.chats.filter((c) => c.id !== id) })),

  minimizeChat: (id) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === id ? { ...c, minimized: true } : c,
      ),
    })),

  restoreChat: (id) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === id ? { ...c, minimized: false } : c,
      ),
    })),
}));
