"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  Copy,
  Dumbbell,
  Heart,
  Image as ImageIcon,
  Info,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { LoadingState } from "@/components/common/AsyncStates";
import type { Message, MessageThread } from "@/types";

interface MessagesViewProps {
  userId: string;
  /** Optional thread id to pre-select when present (e.g. from a `?thread=`
   *  query param after navigating from a coach profile). */
  initialThreadId?: string;
  /** Which filter tabs to render. Defaults to all three. Pass a subset (e.g.
   *  ["all"]) to hide the others; the tab bar is hidden entirely when only one
   *  tab remains, since a lone "Tất cả" pill offers no real choice. */
  filterTabs?: FilterTab[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

export type FilterTab = "all" | "unread" | "ai";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "Tất cả",
  unread: "Chưa đọc",
  ai: "Hỏi AI",
};

const AI_SUGGESTIONS = [
  { icon: Dumbbell, label: "Lập kế hoạch tập hôm nay" },
  { icon: Heart, label: "Phục hồi của tôi thế nào?" },
  { icon: Activity, label: "Điều chỉnh cường độ" },
  { icon: Zap, label: "HIIT nhanh 15 phút" },
];

/** Display name for the other participant. Falls back to a neutral placeholder. */
function participantName(thread: MessageThread | undefined, userId: string): string {
  if (!thread) return "";
  if (thread.isAI) return "Sportico AI";
  if (thread.otherName) return thread.otherName;
  // No name from backend — derive a short placeholder from their ID
  const otherId = thread.participantIds.find((id) => id !== userId) ?? "";
  return otherId ? `Người dùng ${otherId.slice(0, 4).toUpperCase()}` : "Người dùng";
}

/** Avatar URL for the other participant, or null to show initials. */
function participantAvatar(thread: MessageThread | undefined): string | null {
  if (!thread || thread.isAI) return null;
  return thread.otherAvatarUrl ?? null;
}

/** Locally-remembered last message for a thread (derived from real loaded
 *  messages). Used to fill the sidebar preview when the rooms endpoint doesn't
 *  return one — never fabricated. */
type PreviewEntry = { text: string; fromMe: boolean };

export function MessagesView({
  userId,
  initialThreadId,
  filterTabs = ["all", "unread", "ai"],
}: MessagesViewProps) {
  const {
    data: threadsData,
    loading: threadsLoading,
    error: threadsError,
    refetch: refetchThreads,
  } = useApiResource(() => api.fetchThreads(userId), [userId]);
  const threads = useMemo(() => threadsData ?? [], [threadsData]);

  const [activeId, setActiveId] = useState(initialThreadId ?? "");
  const [composer, setComposer] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Tracks whether a message send is in flight — prevents double-submit and updates button style.
  const [isSending, setIsSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  // Mobile master-detail: on small screens we show the list OR the chat, never
  // both. Desktop (md+) always shows both panes regardless of this flag.
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialThreadId));

  // Session-local preview cache built from real messages we've loaded.
  const [previews, setPreviews] = useState<Record<string, PreviewEntry>>({});

  // ── Thread pre-selection ──────────────────────────────────────────────────
  // Honour `initialThreadId` even if it arrives in the list after the first
  // auto-selection (e.g. the room was just created and isn't in the list yet).
  useEffect(() => {
    if (threads.length === 0) return;
    setActiveId((cur) => {
      // Always prefer the requested thread once it appears in the list.
      if (initialThreadId && threads.some((t) => t.id === initialThreadId)) {
        return initialThreadId;
      }
      // Keep the current selection if it's still valid.
      if (cur && threads.some((t) => t.id === cur)) {
        return cur;
      }
      // Default to the first thread.
      return threads[0].id;
    });
  }, [threads, initialThreadId]);

  // ── Messages — separate state so polling never flickers the list ──────────
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  // Ref so polling closure always sees the latest activeId without recreating the interval.
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Initial load when the selected thread changes.
  useEffect(() => {
    if (!activeId) { setServerMessages([]); return; }
    setMessagesLoading(true);
    setMessagesError(null);
    api.fetchMessages(activeId).then((msgs) => {
      if (activeIdRef.current === activeId) {
        setServerMessages(msgs);
        setMessagesLoading(false);
      }
    }).catch(() => {
      if (activeIdRef.current === activeId) {
        setMessagesError("Không tải được tin nhắn. Thử lại?");
        setMessagesLoading(false);
      }
    });
  }, [activeId]);

  // Background polling every 6 s — silent, no loading state reset.
  useEffect(() => {
    if (!activeId) return;
    const poll = () => {
      if (document.hidden) return;
      const pollFor = activeIdRef.current;
      api.fetchMessages(pollFor).then((msgs) => {
        // Only apply if the room hasn't changed since this poll started.
        if (activeIdRef.current === pollFor) setServerMessages(msgs);
      }).catch(() => {
        // Silently ignore poll errors (500 from backend doesn't log the user out).
      });
    };
    const intervalId = window.setInterval(poll, 6_000);
    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeId]);

  const retryMessages = useCallback(() => {
    if (!activeId) return;
    setMessagesLoading(true);
    setMessagesError(null);
    api.fetchMessages(activeId).then((msgs) => {
      if (activeIdRef.current === activeId) {
        setServerMessages(msgs);
        setMessagesLoading(false);
      }
    }).catch(() => {
      if (activeIdRef.current === activeId) {
        setMessagesError("Không tải được tin nhắn. Thử lại?");
        setMessagesLoading(false);
      }
    });
  }, [activeId]);

  // Clear pending optimistic messages whenever the thread changes.
  const [pending, setPending] = useState<Message[]>([]);
  useEffect(() => { setPending([]); }, [activeId]);

  // Merge server + optimistic messages, deduplicating by id so a sent message
  // that already came back in the next poll doesn't appear twice.
  const messages = useMemo(() => {
    const base = serverMessages;
    const baseIds = new Set(base.map((m) => m.id));
    const extra = pending.filter(
      (m) => m.threadId === activeId && !baseIds.has(m.id),
    );
    return extra.length ? [...base, ...extra] : base;
  }, [serverMessages, pending, activeId]);

  // Keep the session preview cache in sync with the last real message we've
  // seen for the active thread (used only to fill an otherwise-empty sidebar
  // preview — we never invent content).
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const entry: PreviewEntry = {
      text: last.text,
      fromMe: last.senderId === userId,
    };
    setPreviews((prev) => {
      const cur = prev[activeId];
      if (cur && cur.text === entry.text && cur.fromMe === entry.fromMe) return prev;
      return { ...prev, [activeId]: entry };
    });
  }, [messages, activeId, userId]);

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.unreadCount > 0);
    if (filter === "ai") list = list.filter((t) => t.isAI);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => {
        const name = participantName(t, userId).toLowerCase();
        const preview = previews[t.id]?.text ?? t.lastMessagePreview;
        return name.includes(q) || preview.toLowerCase().includes(q);
      });
    }
    return list;
  }, [threads, filter, query, userId, previews]);

  const active = threads.find((t) => t.id === activeId);
  const otherName = participantName(active, userId);
  const otherAvatarUrl = participantAvatar(active);

  const openThread = useCallback((id: string) => {
    setActiveId(id);
    setMobileShowChat(true);
  }, []);

  // ── Scroll behaviour ──────────────────────────────────────────────────────
  // On thread switch: always jump to bottom.
  // On new messages (polling/send): only scroll if the user is near the bottom
  // so reading older messages isn't interrupted.
  const prevActiveIdRef = useRef(activeId);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threadChanged = prevActiveIdRef.current !== activeId;
    prevActiveIdRef.current = activeId;
    if (threadChanged || isAITyping) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
      return;
    }
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [activeId, isAITyping, messages]);

  // Auto-grow the composer textarea up to a max height.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [composer]);

  const handleSend = async () => {
    const text = composer.trim();
    if (!text || !active || isSending) return;
    setIsSending(true);
    setSendFailed(false);
    setComposer("");

    // AI thread has no backend room — keep the simulated typing reply.
    if (active.isAI) {
      setIsAITyping(true);
      setTimeout(() => { setIsAITyping(false); setIsSending(false); }, 2200);
      return;
    }

    // eslint-disable-next-line react-hooks/purity
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      threadId: active.id,
      senderId: userId,
      text,
      sentAt: new Date().toISOString(),
    };
    setPending((p) => [...p, optimistic]);
    try {
      const saved = await api.sendMessage(active.id, text);
      // Replace temp id with server id — the next poll will deduplicate it.
      setPending((p) => p.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      // Remove the optimistic message and restore the composer so the user can retry.
      setPending((p) => p.filter((m) => m.id !== tempId));
      setComposer(text);
      setSendFailed(true);
    } finally {
      setIsSending(false);
    }
  };

  const unreadTotal = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  if (threadsLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
        <LoadingState label="Đang tải tin nhắn…" />
      </div>
    );
  }

  if (threadsError) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
        <InlineError
          message="Không tải được danh sách trò chuyện."
          onRetry={refetchThreads}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-0 md:gap-5 h-[calc(100vh-7rem)]">
      {/* ============ SIDEBAR ============ */}
      <aside
        className={cn(
          "relative w-full md:w-[360px] md:shrink-0 flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)]",
          mobileShowChat ? "hidden md:flex" : "flex",
        )}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--color-border-soft)]/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight">
                Tin nhắn
              </h2>
              {unreadTotal > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary tabular-nums">
                  {unreadTotal} mới
                </span>
              )}
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-center text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="search"
              name="conversation-search"
              aria-label="Tìm cuộc trò chuyện"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm cuộc trò chuyện..."
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[12px] outline-none text-[13px] placeholder:text-on-surface-variant transition-all"
            />
          </div>

          {/* Filter tabs — hidden when a single tab remains (e.g. learner page
              passes ["all"], so the lone "Tất cả" pill is dropped). */}
          {filterTabs.length > 1 && (
          <div className="flex items-center gap-1 mt-3 p-1 bg-surface-container-low rounded-[10px]">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                aria-pressed={filter === tab}
                className={cn(
                  "relative flex-1 h-7 text-[12px] font-medium rounded-[7px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  filter === tab
                    ? "text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {filter === tab && (
                  <motion.span
                    layoutId="filterPill"
                    className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06),0_2px_6px_rgba(15,15,30,0.04)]"
                    transition={{
                      type: "spring",
                      duration: reduce ? 0 : 0.45,
                      bounce: 0.2,
                    }}
                  />
                )}
                <span className="relative">{TAB_LABELS[tab]}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Threads list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {filteredThreads.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
                <Search size={16} className="text-on-surface-variant" />
              </div>
              <p className="text-[13px] text-on-surface-variant">
                {query.trim() || filter !== "all"
                  ? "Không tìm thấy cuộc trò chuyện"
                  : "Chưa có cuộc trò chuyện nào"}
              </p>
            </div>
          )}

          <div className="space-y-0.5">
            {filteredThreads.map((t) => {
              const isActive = t.id === activeId;
              const name = participantName(t, userId);
              const avatarUrl = participantAvatar(t);
              const preview = previews[t.id];
              // Prefer a real message we've loaded this session, then the
              // backend-provided preview, then a neutral non-claiming fallback.
              const previewText = preview
                ? preview.fromMe ? `Bạn: ${preview.text}` : preview.text
                : t.lastMessagePreview || null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={cn(
                    "group relative w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-[14px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive
                      ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/15"
                      : "hover:bg-surface-container-low/70",
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {t.isAI ? (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]">
                        <Sparkles size={18} className="drop-shadow-sm" />
                      </div>
                    ) : (
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        name={name}
                        size="md"
                        className="w-11 h-11 text-[13px]"
                      />
                    )}
                    {/* AI is always available — this is a real property of the
                        assistant, not a presence claim. Humans get no dot
                        because the backend exposes no online status. */}
                    {t.isAI && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface-container-lowest" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={cn(
                          "text-[14px] truncate",
                          t.unreadCount > 0
                            ? "font-semibold text-on-surface"
                            : "font-medium text-on-surface",
                        )}
                      >
                        {name}
                      </p>
                      <span
                        className={cn(
                          "text-[11px] whitespace-nowrap shrink-0 tabular-nums",
                          t.unreadCount > 0
                            ? "text-primary font-medium"
                            : "text-on-surface-variant",
                        )}
                      >
                        {formatRelativeTime(t.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-[12.5px] truncate leading-relaxed",
                          previewText
                            ? t.unreadCount > 0
                              ? "text-on-surface"
                              : "text-on-surface-variant"
                            : "text-on-surface-variant/70 italic",
                        )}
                      >
                        {previewText ?? "Nhấn để mở cuộc trò chuyện"}
                      </p>
                      {t.unreadCount > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10.5px] font-semibold tabular-nums">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ============ CHAT PANEL ============ */}
      <section
        className={cn(
          "relative flex-1 min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)]",
          mobileShowChat ? "flex" : "hidden md:flex",
        )}
      >
        {!active ? (
          <EmptyConversation />
        ) : (
          <>
            {/* Header */}
            <header className="relative shrink-0 px-4 md:px-6 py-3.5 border-b border-[var(--color-border-soft)] flex items-center gap-3 bg-surface-container-lowest/95 backdrop-blur-sm">
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                aria-label="Quay lại danh sách"
                className="md:hidden -ml-1 w-9 h-9 shrink-0 rounded-full hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="relative shrink-0">
                {active.isAI ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]">
                    <Sparkles size={18} />
                  </div>
                ) : (
                  <UserAvatar
                    avatarUrl={otherAvatarUrl}
                    name={otherName}
                    size="md"
                    className="w-10 h-10 text-[13px]"
                  />
                )}
                {active.isAI && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface-container-lowest" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold truncate">
                    {active.isAI ? "Sportico AI" : otherName}
                  </p>
                  {active.isAI && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-[10.5px] font-medium border border-primary/15">
                      <Sparkles size={9} />
                      Trợ lý AI
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-on-surface-variant mt-0.5 truncate">
                  {active.isAI ? "Luôn sẵn sàng • Thích nghi với mục tiêu của bạn" : "Tin nhắn trực tiếp"}
                </p>
              </div>

              <div className="flex items-center gap-0.5 md:gap-1">
                <HeaderIconButton icon={Phone} label="Gọi thoại" />
                <HeaderIconButton icon={Video} label="Gọi video" />
                <HeaderIconButton icon={Info} label="Thông tin" />
              </div>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5 scroll-smooth bg-surface-container-low/30"
            >
              <div className="mx-auto flex min-h-full max-w-3xl flex-col">
                {messagesLoading && messages.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-12">
                    <LoadingState label="Đang tải…" />
                  </div>
                )}
                {messagesError && !messagesLoading && (
                  <div className="flex flex-1 items-center justify-center">
                    <InlineError message={messagesError} onRetry={retryMessages} />
                  </div>
                )}
                {!messagesLoading && !messagesError && messages.length === 0 && !isAITyping && (
                  <ChatEmptyState name={active.isAI ? "Sportico AI" : otherName} />
                )}

                {(messages.length > 0 || isAITyping) && (
                  <div className="mt-auto pt-1">
                    <MessageList
                      messages={messages}
                      userId={userId}
                      otherName={otherName}
                      otherAvatarUrl={otherAvatarUrl}
                      reduce={reduce ?? false}
                    />
                    <AnimatePresence>
                      {isAITyping && active.isAI && (
                        <TypingIndicator key="typing" />
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Quick suggestions (AI only) */}
            {active.isAI && messages.length > 0 && !composer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                className="shrink-0 px-4 md:px-6 pb-1.5"
              >
                <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
                  {AI_SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.label}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.3,
                        delay: reduce ? 0 : i * 0.05,
                        ease: EASE,
                      }}
                      onClick={() => setComposer(s.label)}
                      className="group flex items-center gap-2 px-3.5 h-9 rounded-full border border-[var(--color-border-soft)] bg-surface-container-lowest hover:border-primary/30 hover:bg-primary/[0.04] transition-all text-[12.5px] font-medium text-on-surface"
                    >
                      <s.icon
                        size={13}
                        className="text-primary transition-transform group-hover:scale-110"
                      />
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Composer */}
            <div className="shrink-0 px-4 md:px-6 pb-4 md:pb-5 pt-2.5">
              <div className="max-w-3xl mx-auto">
                {sendFailed && (
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] text-rose-600">
                    <AlertTriangle size={13} />
                    Không gửi được tin nhắn. Hãy thử lại.
                  </div>
                )}
                <div className="relative group">
                  {/* Glow ring */}
                  <div className="absolute -inset-px rounded-[18px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />

                  <div className="relative flex items-end gap-1 bg-surface-container-lowest border border-[var(--color-border-soft)] group-focus-within:border-primary/40 rounded-[18px] px-2.5 py-2 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.08),0_12px_32px_-12px_rgba(15,15,30,0.06)] transition-colors">
                    <ComposerIconButton icon={Paperclip} label="Đính kèm file" />
                    <ComposerIconButton icon={ImageIcon} label="Thêm ảnh" />

                    <textarea
                      ref={composerRef}
                      name="message"
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
                      placeholder={
                        active.isAI
                          ? "Hỏi AI coach bất cứ điều gì..."
                          : "Nhập tin nhắn..."
                      }
                      rows={1}
                      className="flex-1 min-h-[36px] max-h-32 py-2 px-1.5 bg-transparent outline-none resize-none text-[14px] leading-6 placeholder:text-on-surface-variant"
                    />

                    <ComposerIconButton icon={Smile} label="Emoji" />

                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!composer.trim() || isSending}
                      aria-label="Gửi tin nhắn"
                      className={cn(
                        "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        composer.trim() && !isSending
                          ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_16px_-2px_rgba(53,37,205,0.55)] hover:scale-105 active:scale-95"
                          : "bg-surface-container-low text-on-surface-variant cursor-not-allowed",
                      )}
                    >
                      {isSending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Send
                          size={14}
                          className={cn(
                            "transition-transform",
                            composer.trim() && "translate-x-px -translate-y-px",
                          )}
                        />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant text-center mt-2">
                  {active.isAI ? (
                    <>
                      <Sparkles
                        size={10}
                        className="inline -translate-y-px mr-1"
                      />
                      Sportico AI có thể gợi ý điều chỉnh buổi tập. Hãy hỏi HLV
                      của bạn với các vấn đề y tế.
                    </>
                  ) : (
                    <>Enter để gửi · Shift + Enter để xuống dòng</>
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function MessageList({
  messages,
  userId,
  otherName,
  otherAvatarUrl,
  reduce,
}: {
  messages: Message[];
  userId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  reduce: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {messages.map((m, i) => {
        const fromMe = m.senderId === userId;
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const newDay = !prev || !sameDay(prev.sentAt, m.sentAt);
        const isGroupStart = newDay || !prev || prev.senderId !== m.senderId;
        const isGroupEnd =
          !next || next.senderId !== m.senderId || !sameDay(next.sentAt, m.sentAt);
        const fromAI = m.isAI === true;
        const pendingSend = m.id.startsWith("temp-");

        return (
          <div key={m.id}>
            {newDay && <DateChip iso={m.sentAt} />}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduce ? 0 : 0.32,
                delay: reduce ? 0 : Math.min(i * 0.03, 0.24),
                ease: EASE,
              }}
              className={cn(
                "flex items-end gap-2.5 group",
                fromMe ? "flex-row-reverse" : "flex-row",
                isGroupStart ? "mt-3 first:mt-0" : "mt-0.5",
              )}
            >
              {/* Avatar (left side, only on group end of other side) */}
              {!fromMe && (
                <div className="w-8 shrink-0">
                  {isGroupEnd && (
                    fromAI ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)]">
                        <Sparkles size={13} />
                      </div>
                    ) : (
                      <UserAvatar
                        avatarUrl={otherAvatarUrl}
                        name={otherName}
                        size="xs"
                        className="w-8 h-8 text-[11px]"
                      />
                    )
                  )}
                </div>
              )}

              {/* Bubble + meta */}
              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[78%] sm:max-w-[65%]",
                  fromMe ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "relative px-3.5 py-2.5 text-[14px] leading-[1.55] break-words whitespace-pre-wrap",
                    fromMe
                      ? "bg-gradient-to-br from-primary to-[#4338ca] text-on-primary"
                      : fromAI
                        ? "bg-gradient-to-br from-primary/[0.06] to-primary/[0.03] border border-primary/10 text-on-surface"
                        : "bg-surface-container-lowest border border-[var(--color-border-soft)] text-on-surface",
                    // Soft, asymmetric bubble corners — modern messenger style
                    "rounded-[18px]",
                    fromMe
                      ? isGroupEnd
                        ? "rounded-br-[6px]"
                        : "rounded-br-[18px]"
                      : isGroupEnd
                        ? "rounded-bl-[6px]"
                        : "rounded-bl-[18px]",
                    fromMe
                      ? "shadow-[0_2px_8px_-2px_rgba(53,37,205,0.25)]"
                      : "shadow-[0_1px_2px_rgba(15,15,30,0.03)]",
                    pendingSend && "opacity-70",
                  )}
                >
                  {m.text}
                </div>

                {/* Meta row (timestamp + status) — only on group end */}
                {isGroupEnd && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-1 text-[10.5px] text-on-surface-variant",
                      fromMe ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <span className="tabular-nums">{formatTime(m.sentAt)}</span>
                    {fromMe && (
                      <MessageStatus pendingSend={pendingSend} isRead={m.isRead} />
                    )}
                    {fromAI && (
                      <>
                        <span className="text-on-surface-variant/40">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(m.text);
                          }}
                          className="flex items-center gap-1 hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                          aria-label="Sao chép tin nhắn"
                        >
                          <Copy size={10} />
                          Sao chép
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/** Read receipt for my own messages. Only renders concrete state when the
 *  backend actually told us whether it was read — never fakes "seen". */
function MessageStatus({
  pendingSend,
  isRead,
}: {
  pendingSend: boolean;
  isRead?: boolean;
}) {
  if (pendingSend) {
    return (
      <span className="flex items-center gap-1 text-on-surface-variant/70">
        <RefreshCw size={10} className="animate-spin" />
      </span>
    );
  }
  if (isRead === true) {
    return (
      <span className="flex items-center gap-1 text-primary" title="Đã xem">
        <CheckCheck size={12} />
      </span>
    );
  }
  if (isRead === false) {
    return (
      <span className="flex items-center gap-1 text-on-surface-variant" title="Đã gửi">
        <Check size={12} />
      </span>
    );
  }
  // No read state available (e.g. mock data) — show nothing rather than fake it.
  return null;
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex items-end gap-2.5 mt-3"
    >
      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)] flex items-center justify-center">
        <Sparkles size={13} />
      </div>
      <div className="bg-gradient-to-br from-primary/[0.06] to-primary/[0.03] border border-primary/10 px-4 py-3 rounded-[18px] rounded-bl-[6px] flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary animate-dot-flash"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary animate-dot-flash"
          style={{ animationDelay: "180ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary animate-dot-flash"
          style={{ animationDelay: "360ms" }}
        />
      </div>
    </motion.div>
  );
}

function DateChip({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center my-3">
      <span className="px-3 py-1 rounded-full bg-surface-container-low/80 border border-[var(--color-border-soft)] text-[10.5px] font-medium text-on-surface-variant">
        {formatDayLabel(iso)}
      </span>
    </div>
  );
}

function HeaderIconButton({
  icon: Icon,
  label,
}: {
  icon: typeof Phone;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="w-9 h-9 rounded-full hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon size={16} />
    </button>
  );
}

function ComposerIconButton({
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
      className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon size={16} />
    </button>
  );
}

/** Shown in the chat panel when no conversation is selected (desktop). */
function EmptyConversation() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(53,37,205,0.4)] mb-5">
        <Bot size={28} className="text-on-primary" />
      </div>
      <h3 className="text-[18px] font-semibold mb-1.5">
        Chọn một cuộc trò chuyện
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-xs">
        Chọn một cuộc trò chuyện từ hộp thư hoặc bắt đầu trò chuyện với Trợ lý AI.
      </p>
    </div>
  );
}

/** Shown inside an open thread that has no messages yet. */
function ChatEmptyState({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center px-8 py-10">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-[var(--color-border-soft)] flex items-center justify-center mb-4">
        <MessageCircle size={24} className="text-primary" />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">Chưa có tin nhắn</h3>
      <p className="text-[13px] text-on-surface-variant max-w-xs">
        Bắt đầu cuộc trò chuyện với {name} bằng cách gửi lời chào.
      </p>
    </div>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
        <AlertTriangle size={16} className="text-rose-500" />
      </div>
      <p className="text-[13px] text-on-surface-variant">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 h-8 rounded-full bg-surface-container-low border border-[var(--color-border-soft)] text-[12.5px] font-medium text-on-surface hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RefreshCw size={12} />
          Thử lại
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Utils
// ============================================================================

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (sameDay(iso, now.toISOString())) return "Hôm nay";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(iso, yesterday.toISOString())) return "Hôm qua";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - date.getTime()) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày`;
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
}
