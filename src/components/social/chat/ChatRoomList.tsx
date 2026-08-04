"use client";

import Link from "next/link";
import { ChatBubbleEmpty, Prohibition } from "iconoir-react";
import { ChatRoomListItem } from "@/components/social/chat/ChatRoomListItem";
import { RowSkeleton } from "@/components/social/Skeleton";
import { ErrorState } from "@/components/common/AsyncStates";
import { useChatRooms } from "@/lib/social/hooks/useChat";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { cn } from "@/lib/utils";

/** Newest activity first — falls back to `createdAt` for a room with no messages yet. */
function sortRooms<T extends { lastMessageAt: string | null; createdAt: string }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const at = new Date(a.lastMessageAt ?? a.createdAt).getTime();
    const bt = new Date(b.lastMessageAt ?? b.createdAt).getTime();
    return bt - at;
  });
}

export function ChatRoomList({ activeRoomId, className }: { activeRoomId?: string; className?: string }) {
  const { data, isLoading, isError, refetch } = useChatRooms();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-4">
        <h1 className="text-[16px] font-bold text-on-surface">Tin nhắn</h1>
        <Link
          href="/settings/blocked"
          title="Người dùng đã chặn"
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
        >
          <Prohibition width={15} height={15} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="p-4">
            <ErrorState title="Không tải được cuộc trò chuyện" onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <ChatBubbleEmpty width={28} height={28} className="text-on-surface-variant" />
            <p className="text-[13px] text-on-surface-variant">Chưa có cuộc trò chuyện nào.</p>
          </div>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <div className="space-y-0.5">
            {sortRooms(data).map((room) => (
              <ChatRoomListItem key={room.id} room={room} currentUserId={currentUserId} active={room.id === activeRoomId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
