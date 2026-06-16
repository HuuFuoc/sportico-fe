"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CoachCard } from "@/components/common/CoachCard";
import type { Coach } from "@/types";

/**
 * Renders the coaches the advisor recommended for a single assistant reply.
 *
 * Fetches each coach detail in parallel via `api.fetchCoach`. Uses
 * `Promise.allSettled` so one bad/missing id never blanks the whole list — any
 * rejected or undefined result is simply dropped.
 */
export function RecommendedCoaches({ coachIds }: { coachIds: string[] }) {
  // null = still loading; [] = resolved but nothing renderable.
  const [coaches, setCoaches] = useState<Coach[] | null>(null);

  useEffect(() => {
    let active = true;

    if (coachIds.length === 0) {
      setCoaches([]);
      return;
    }

    setCoaches(null);
    Promise.allSettled(coachIds.map((id) => api.fetchCoach(id))).then(
      (results) => {
        if (!active) return;
        const ok = results
          .filter(
            (r): r is PromiseFulfilledResult<Coach | undefined> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value)
          .filter((c): c is Coach => Boolean(c));
        setCoaches(ok);
      },
    );

    return () => {
      active = false;
    };
  }, [coachIds]);

  if (coachIds.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
        HLV được gợi ý
      </p>

      {coaches === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coachIds.slice(0, 4).map((id) => (
            <CoachCardSkeleton key={id} />
          ))}
        </div>
      ) : coaches.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-3 text-body-sm text-on-surface-variant">
          Không tải được hồ sơ HLV được gợi ý. Bạn có thể xem tất cả HLV trong
          mục Huấn luyện viên.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              showMatch={false}
              href={`/learner/coaches/${coach.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CoachCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="h-32 animate-pulse bg-surface-container-high" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-container-high" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
      </div>
    </div>
  );
}
