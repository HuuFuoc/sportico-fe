"use client";

import { ChatBubbleEmpty } from "iconoir-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { ChatRoomList } from "@/components/social/chat/ChatRoomList";
import { ChatWindow } from "@/components/social/chat/ChatWindow";
import { useChatRooms } from "@/lib/social/hooks/useChat";
import { cn } from "@/lib/utils";

interface MessagesShellProps {
  /** Present on `/messages/[roomId]`, absent on the bare `/messages` list. */
  activeRoomId?: string;
}

/**
 * Responsive two-pane layout shared by `/messages` and `/messages/[roomId]`.
 * Mobile shows one pane at a time (list, or the open conversation with a back
 * button); desktop (lg+) shows both side by side.
 */
export function MessagesShell({ activeRoomId }: MessagesShellProps) {
  return (
    <AuthGuard>
      <MessagesLayout activeRoomId={activeRoomId} />
    </AuthGuard>
  );
}

function MessagesLayout({ activeRoomId }: MessagesShellProps) {
  const { data: rooms, isLoading, isError, refetch } = useChatRooms();
  const activeRoom = activeRoomId ? rooms?.find((r) => r.id === activeRoomId) : undefined;

  return (
    <div className="mx-auto h-[calc(100vh-64px)] max-w-6xl overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest lg:my-4 lg:h-[calc(100vh-96px)]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[320px_1fr]">
        <ChatRoomList
          activeRoomId={activeRoomId}
          className={cn("border-r border-[var(--color-border-soft)]", activeRoomId && "hidden lg:flex")}
        />

        <div className={cn(!activeRoomId && "hidden lg:flex", "flex flex-col")}>
          {!activeRoomId && (
            <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-center lg:flex">
              <ChatBubbleEmpty width={32} height={32} className="text-on-surface-variant" />
              <p className="text-[13.5px] text-on-surface-variant">Chọn một cuộc trò chuyện để bắt đầu.</p>
            </div>
          )}

          {activeRoomId && isLoading && <LoadingState label="Đang tải cuộc trò chuyện…" className="flex-1" />}

          {activeRoomId && isError && !isLoading && (
            <div className="flex-1 p-6">
              <ErrorState title="Không tải được cuộc trò chuyện" onRetry={() => refetch()} />
            </div>
          )}

          {activeRoomId && !isLoading && !isError && rooms && !activeRoom && (
            <div className="flex-1 p-6">
              <ErrorState title="Không tìm thấy cuộc trò chuyện" message="Cuộc trò chuyện này không tồn tại hoặc bạn không có quyền truy cập." />
            </div>
          )}

          {activeRoom && <ChatWindow room={activeRoom} backHref="/messages" />}
        </div>
      </div>
    </div>
  );
}
