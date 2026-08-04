"use client";

import { useState } from "react";
import { Prohibition } from "iconoir-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { EmptyState } from "@/components/common/EmptyState";
import { useBlockedUsers, useUnblockUser } from "@/lib/social/hooks/useBlock";
import { formatDateVn } from "@/lib/social/datetime";
import { showApiError, showSuccess } from "@/lib/toast";

export function BlockedUsersClient() {
  return (
    <AuthGuard>
      <BlockedUsersList />
    </AuthGuard>
  );
}

function BlockedUsersList() {
  const { data, isLoading, isError, refetch } = useBlockedUsers();
  const unblockMutation = useUnblockUser();
  const [unblocking, setUnblocking] = useState<string | null>(null);

  async function handleUnblock(userId: string) {
    setUnblocking(userId);
    try {
      await unblockMutation.mutateAsync(userId);
      showSuccess("Đã bỏ chặn người dùng.");
    } catch (err) {
      showApiError(err);
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[20px] font-bold text-on-surface">Người dùng đã chặn</h1>
      <p className="mt-1 text-[13px] text-on-surface-variant">
        Chặn chỉ ảnh hưởng đến việc nhắn tin — không ảnh hưởng đến bình luận hay đăng ký bài viết cộng đồng.
      </p>

      <div className="mt-5">
        {isLoading && <LoadingState label="Đang tải danh sách…" />}
        {isError && !isLoading && <ErrorState title="Không tải được danh sách" onRetry={() => refetch()} />}

        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState icon="block" title="Chưa chặn ai" description="Danh sách người dùng bạn chặn sẽ hiện ở đây." />
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <div className="divide-y divide-[var(--color-border-soft)] overflow-hidden rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
            {data.map((u) => (
              <div key={u.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[13px] font-semibold text-rose-700">
                  {(u.fullName ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-on-surface">{u.fullName || "Người dùng"}</p>
                  <p className="text-[11.5px] text-on-surface-variant">
                    Đã chặn {formatDateVn(u.createdAt)}
                    {u.reason ? ` · ${u.reason}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleUnblock(u.userId)}
                  disabled={unblocking === u.userId}
                  className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12.5px] font-medium text-on-surface hover:border-primary/40 hover:text-primary disabled:opacity-60"
                >
                  <Prohibition width={13} height={13} />
                  {unblocking === u.userId ? "Đang xử lý…" : "Bỏ chặn"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
