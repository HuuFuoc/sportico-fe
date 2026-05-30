"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Bot,
  CheckCheck,
  Copy,
  Dumbbell,
  Heart,
  Image as ImageIcon,
  Info,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { AnyUser, Message } from "@/types";

interface MessagesViewProps {
  userId: string;
  /** Optional thread id to pre-select when present (e.g. from a `?thread=`
   *  query param after navigating from a coach profile). */
  initialThreadId?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

type FilterTab = "all" | "unread" | "ai";

const AI_SUGGESTIONS = [
  { icon: Dumbbell, label: "Lập kế hoạch tập hôm nay" },
  { icon: Heart, label: "Phục hồi của tôi thế nào?" },
  { icon: Activity, label: "Điều chỉnh cường độ" },
  { icon: Zap, label: "HIIT nhanh 15 phút" },
];

export function MessagesView({ userId, initialThreadId }: MessagesViewProps) {
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

  // Resolve participant users. No batch endpoint yet, so fetch each once and
  // cache in a map; keyed on a stable string so it only re-runs when ids change.
  const otherIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of threads) {
      if (t.isAI) continue;
      const oid = t.participantIds.find((id) => id !== userId);
      if (oid) ids.add(oid);
    }
    return Array.from(ids).sort();
  }, [threads, userId]);

  const { data: usersData } = useApiResource(
    () => Promise.all(otherIds.map((id) => api.fetchUser(id))),
    [otherIds.join(",")],
  );
  const userById = useMemo(() => {
    const map = new Map<string, AnyUser>();
    for (const u of usersData ?? []) if (u) map.set(u.id, u);
    return map;
  }, [usersData]);

  // Select the first thread once threads load (or if the active one disappears).
  // Honour `initialThreadId` when it matches a real thread, otherwise fall back
  // to the first one.
  useEffect(() => {
    if (threads.length === 0) return;
    setActiveId((cur) => {
      const candidate = cur || initialThreadId || "";
      return candidate && threads.some((t) => t.id === candidate)
        ? candidate
        : threads[0].id;
    });
  }, [threads, initialThreadId]);

  const { data: messagesData } = useApiResource(
    () =>
      activeId ? api.fetchMessages(activeId) : Promise.resolve<Message[]>([]),
    [activeId],
  );

  // Optimistically-appended messages not yet reflected in the fetched list.
  // Cleared on thread switch — switching back re-fetches the canonical list.
  const [pending, setPending] = useState<Message[]>([]);
  useEffect(() => {
    setPending([]);
  }, [activeId]);

  const messages = useMemo(() => {
    const base = messagesData ?? [];
    const extra = pending.filter((m) => m.threadId === activeId);
    return extra.length ? [...base, ...extra] : base;
  }, [messagesData, pending, activeId]);

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.unreadCount > 0);
    if (filter === "ai") list = list.filter((t) => t.isAI);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => {
        const oid = t.participantIds.find((id) => id !== userId) ?? "";
        const usr = t.isAI ? null : userById.get(oid);
        const name = t.isAI ? "ask ai" : (usr?.name ?? "").toLowerCase();
        return (
          name.includes(q) || t.lastMessagePreview.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [threads, filter, query, userId, userById]);

  const active = threads.find((t) => t.id === activeId);
  const otherId = active?.participantIds.find((id) => id !== userId) ?? "";
  const other = active?.isAI ? null : (userById.get(otherId) ?? null);

  // Auto-scroll to bottom when conversation changes, messages load, or typing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeId, isAITyping, messages]);

  const handleSend = async () => {
    const text = composer.trim();
    if (!text || !active) return;
    setComposer("");

    // AI thread has no backend room — keep the simulated typing reply.
    if (active.isAI) {
      setIsAITyping(true);
      setTimeout(() => setIsAITyping(false), 2200);
      return;
    }

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
      setPending((p) => p.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      setPending((p) => p.filter((m) => m.id !== tempId));
      setComposer(text);
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
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <ErrorState
          title="Không tải được tin nhắn"
          onRetry={refetchThreads}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5 h-[calc(100vh-7rem)]">
      {/* ============ SIDEBAR ============ */}
      <aside className="relative flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight">
                Inbox
              </h2>
              {unreadTotal > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary/10 text-primary">
                  {unreadTotal} new
                </span>
              )}
            </div>
            <button
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-center text-on-surface-variant"
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              name="conversation-search"
              aria-label="Search conversations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[12px] outline-none text-[13px] placeholder:text-on-surface-variant transition-all"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mt-3 p-1 bg-surface-container-low rounded-[10px]">
            {(["all", "unread", "ai"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "relative flex-1 h-7 text-[12px] font-medium capitalize rounded-[7px] transition-colors",
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
                <span className="relative">
                  {tab === "ai" ? "Hỏi AI" : tab}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Threads list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filteredThreads.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
                <Search size={16} className="text-on-surface-variant" />
              </div>
              <p className="text-[13px] text-on-surface-variant">
                No conversations found
              </p>
            </div>
          )}

          <div className="space-y-0.5">
            {filteredThreads.map((t) => {
              const oid = t.participantIds.find((id) => id !== userId) ?? "";
              const usr = t.isAI ? null : userById.get(oid);
              const isActive = t.id === activeId;
              const name = t.isAI ? "Sportico AI" : (usr?.name ?? "Unknown");
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "group relative w-full flex items-start gap-3 px-3 py-3 text-left rounded-[14px] transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-br from-primary/[0.08] to-primary/[0.03]"
                      : "hover:bg-surface-container-low/70",
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.span
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-primary"
                      transition={{
                        type: "spring",
                        duration: reduce ? 0 : 0.4,
                        bounce: 0.2,
                      }}
                    />
                  )}

                  {/* Avatar with status */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center overflow-hidden",
                        t.isAI
                          ? "bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]"
                          : "bg-surface-container-high text-primary font-medium text-[13px]",
                      )}
                    >
                      {t.isAI ? (
                        <Sparkles size={18} className="drop-shadow-sm" />
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
                    {/* Online dot */}
                    {!t.isAI && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface-container-lowest" />
                    )}
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
                          t.unreadCount > 0 || isActive
                            ? "font-semibold text-on-surface"
                            : "font-medium text-on-surface",
                        )}
                      >
                        {name}
                      </p>
                      <span
                        className={cn(
                          "text-[11px] whitespace-nowrap shrink-0",
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
                          t.unreadCount > 0
                            ? "text-on-surface"
                            : "text-on-surface-variant",
                        )}
                      >
                        {t.lastMessagePreview}
                      </p>
                      {t.unreadCount > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10.5px] font-semibold shadow-[0_2px_6px_-1px_rgba(53,37,205,0.4)]">
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
      <section className="relative flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)]">
        {!active ? (
          <EmptyState />
        ) : (
          <>
            {/* Header */}
            <header className="relative px-6 py-4 border-b border-[var(--color-border-soft)] flex items-center gap-3 bg-surface-container-lowest/95 backdrop-blur-sm">
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden",
                    active.isAI
                      ? "bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.35)]"
                      : "bg-surface-container-high text-primary font-medium text-[13px]",
                  )}
                >
                  {active.isAI ? (
                    <Sparkles size={18} />
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
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface-container-lowest" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold truncate">
                    {active.isAI ? "Sportico AI" : (other?.name ?? "Unknown")}
                  </p>
                  {active.isAI && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-[10.5px] font-medium border border-primary/15">
                      <Sparkles size={9} />
                      AI Coach
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {active.isAI
                    ? "Luôn sẵn sàng • Thích nghi với mục tiêu của bạn"
                    : "Đang hoạt động"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <HeaderIconButton icon={Phone} label="Gọi thoại" />
                <HeaderIconButton icon={Video} label="Gọi video" />
                <HeaderIconButton icon={Info} label="Thông tin" />
              </div>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--color-primary) 3%, transparent) 0%, transparent 50%), radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-primary) 2%, transparent) 0%, transparent 40%)",
              }}
            >
              <div className="max-w-3xl mx-auto">
                <DateSeparator />
                <MessageList
                  messages={messages}
                  userId={userId}
                  other={other}
                  reduce={reduce ?? false}
                />
                <AnimatePresence>
                  {isAITyping && active.isAI && (
                    <TypingIndicator key="typing" />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick suggestions (AI only) */}
            {active.isAI && messages.length > 0 && !composer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                className="px-6 pb-2"
              >
                <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
                  {AI_SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.label}
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
            <div className="px-6 pb-6 pt-3">
              <div className="max-w-3xl mx-auto">
                <div className="relative group">
                  {/* Glow ring */}
                  <div className="absolute -inset-px rounded-[18px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />

                  <div className="relative flex items-end gap-2 bg-surface-container-lowest border border-[var(--color-border-soft)] group-focus-within:border-primary/40 rounded-[18px] px-3 py-2 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.08),0_12px_32px_-12px_rgba(15,15,30,0.06)] transition-colors">
                    <ComposerIconButton icon={Paperclip} label="Đính kèm file" />
                    <ComposerIconButton icon={ImageIcon} label="Thêm ảnh" />

                    <textarea
                      name="message"
                      aria-label="Type a message"
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
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
                      className="flex-1 min-h-[36px] max-h-32 py-2 px-1 bg-transparent outline-none resize-none text-[14px] leading-6 placeholder:text-on-surface-variant"
                    />

                    <ComposerIconButton icon={Smile} label="Emoji" />

                    <button
                      onClick={() => void handleSend()}
                      disabled={!composer.trim()}
                      aria-label="Send message"
                      className={cn(
                        "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                        composer.trim()
                          ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_6px_16px_-2px_rgba(53,37,205,0.55)] hover:scale-105 active:scale-95"
                          : "bg-surface-container-low text-on-surface-variant cursor-not-allowed",
                      )}
                    >
                      <Send
                        size={14}
                        className={cn(
                          "transition-transform",
                          composer.trim() && "translate-x-px -translate-y-px",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant text-center mt-2.5">
                  {active.isAI ? (
                    <>
                      <Sparkles
                        size={10}
                        className="inline -translate-y-px mr-1"
                      />
                      Sportico AI may suggest workout adjustments. Always
                      consult your coach for medical concerns.
                    </>
                  ) : (
                    <>Press Enter to send, Shift+Enter for new line</>
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
  other,
  reduce,
}: {
  messages: Message[];
  userId: string;
  other: AnyUser | null;
  reduce: boolean;
}) {
  return (
    <div className="space-y-4">
      {messages.map((m, i) => {
        const fromMe = m.senderId === userId;
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const isGroupStart = !prev || prev.senderId !== m.senderId;
        const isGroupEnd = !next || next.senderId !== m.senderId;
        const fromAI = m.isAI === true;

        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0 : 0.35,
              delay: reduce ? 0 : Math.min(i * 0.04, 0.3),
              ease: EASE,
            }}
            className={cn(
              "flex items-end gap-2.5 group",
              fromMe ? "flex-row-reverse" : "flex-row",
              isGroupStart ? "mt-4 first:mt-0" : "mt-0.5",
            )}
          >
            {/* Avatar (left side, only on group end of other side) */}
            {!fromMe && (
              <div className="w-8 shrink-0">
                {isGroupEnd && (
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center overflow-hidden",
                      fromAI
                        ? "bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] text-on-primary shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)]"
                        : "bg-surface-container-high text-primary font-medium text-[11px]",
                    )}
                  >
                    {fromAI ? (
                      <Sparkles size={13} />
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
                )}
              </div>
            )}

            {/* Bubble + meta */}
            <div
              className={cn(
                "flex flex-col gap-1 max-w-[65%]",
                fromMe ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "relative px-4 py-2.5 text-[14px] leading-[1.55] break-words",
                  fromMe
                    ? "bg-gradient-to-br from-primary to-[#4338ca] text-on-primary"
                    : fromAI
                      ? "bg-gradient-to-br from-primary/[0.06] to-primary/[0.03] border border-primary/10 text-on-surface"
                      : "bg-surface-container-low border border-[var(--color-border-soft)] text-on-surface",
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
                )}
              >
                {m.text}
              </div>

              {/* Meta row (timestamp + actions) — only on group end */}
              {isGroupEnd && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-1 text-[10.5px] text-on-surface-variant",
                    fromMe ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span>{formatTime(m.sentAt)}</span>
                  {fromMe && <CheckCheck size={11} className="text-primary" />}
                  {fromAI && (
                    <>
                      <span className="text-on-surface-variant/40">•</span>
                      <button
                        className="flex items-center gap-1 hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Copy message"
                      >
                        <Copy size={10} />
                        Copy
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex items-end gap-2.5 mt-4"
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

function DateSeparator() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex-1 h-px bg-[var(--color-border-soft)]" />
      <span className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
        Today
      </span>
      <span className="flex-1 h-px bg-[var(--color-border-soft)]" />
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
      aria-label={label}
      className="w-9 h-9 rounded-full hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center text-on-surface-variant hover:text-on-surface"
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
      aria-label={label}
      className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center text-on-surface-variant hover:text-primary"
    >
      <Icon size={16} />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(53,37,205,0.4)] mb-5">
        <Bot size={28} className="text-on-primary" />
      </div>
      <h3 className="text-[18px] font-semibold mb-1.5">
        Select a conversation
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-xs">
        Pick a thread from your inbox or start a new chat with your AI coach.
      </p>
    </div>
  );
}

// ============================================================================
// Utils
// ============================================================================

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - date.getTime()) / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
