"use client";

import Link from "next/link";
import { Clock, Prohibition } from "iconoir-react";
import { usePublicUser } from "@/lib/social/hooks/usePublicUser";
import { useIsBlocked } from "@/lib/social/hooks/useBlock";
import { formatChatTimestamp } from "@/lib/social/datetime";
import { CHAT_ROOM_STATUS_LABELS } from "@/lib/social/labels";
import { cn } from "@/lib/utils";
import type { ChatRoomResponse } from "@/lib/social/types";

interface ChatRoomListItemProps {
  room: ChatRoomResponse;
  currentUserId: string | null;
  active: boolean;
}

export function ChatRoomListItem({ room, currentUserId, active }: ChatRoomListItemProps) {
  const otherUserId = room.otherUserId ?? (room.user1Id === currentUserId ? room.user2Id : room.user1Id);
  const { data: otherUser } = usePublicUser(otherUserId);
  const blocked = useIsBlocked(otherUserId);

  const status = (room.status ?? "").toLowerCase();
  const isPendingReceiver = status === "pending" && room.requestedByUserId !== currentUserId;

  return (
    <Link
      href={`/messages/${room.id}`}
      className={cn(
        "flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors",
        active ? "bg-primary/10" : "hover:bg-surface-container-high",
      )}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[14px] font-semibold text-primary">
        {(otherUser?.name ?? "?").slice(0, 1).toUpperCase()}
        {blocked && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
            <Prohibition width={10} height={10} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13.5px] font-semibold text-on-surface">
            {otherUser?.name ?? "Đang tải…"}
          </p>
          {room.lastMessageAt && (
            <span className="shrink-0 text-[11px] text-on-surface-variant">
              {formatChatTimestamp(room.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {status === "pending" && (
            <span className="flex items-center gap-1 text-[11.5px] text-amber-600">
              <Clock width={11} height={11} />
              {isPendingReceiver ? "Chờ bạn phản hồi" : "Đang chờ chấp nhận"}
            </span>
          )}
          {status === "rejected" && (
            <span className="text-[11.5px] text-on-surface-variant">{CHAT_ROOM_STATUS_LABELS.rejected}</span>
          )}
          {status === "active" && !room.lastMessageAt && (
            <span className="text-[11.5px] text-on-surface-variant">Bắt đầu trò chuyện</span>
          )}
        </div>
      </div>
    </Link>
  );
}
