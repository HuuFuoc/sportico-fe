"use client";

import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, relativeDay } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { UserAvatar } from "@/components/common/UserAvatar";
import type { Coach, Learner, Session } from "@/types";

interface SessionRowProps {
  session: Session;
  /** Whose perspective is rendering this row. */
  viewer: "learner" | "coach" | "admin";
  className?: string;
  actions?: React.ReactNode;
}

export function SessionRow({
  session,
  viewer,
  className,
  actions,
}: SessionRowProps) {
  // Resolve the counterparty (coach for a learner's view, learner otherwise).
  const { data: other } = useApiResource<Coach | Learner | undefined>(
    () =>
      viewer === "learner"
        ? api.fetchCoach(session.coachId)
        : api.fetchLearner(session.learnerId),
    [viewer, session.coachId, session.learnerId],
  );
  const date = new Date(session.start);
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low transition-colors",
        className,
      )}
    >
      <UserAvatar
        avatarUrl={other?.avatarUrl}
        name={other?.name ?? "?"}
        size="md"
        className="w-10 h-10 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body-base font-medium text-on-surface truncate">
            {other?.name ?? "Không xác định"}
          </p>
          {session.type === "AI-Guided" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider">
              <MaterialIcon name="auto_awesome" filled size={11} />
              AI
            </span>
          )}
        </div>
        <p className="text-body-sm text-on-surface-variant truncate">
          {session.title} • {relativeDay(date)} {time} •{" "}
          {session.durationMinutes}m
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions ?? (
          <button className="px-3 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low transition-colors">
            Đổi lịch
          </button>
        )}
      </div>
    </div>
  );
}
