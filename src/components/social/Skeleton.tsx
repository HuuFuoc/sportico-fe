import { cn } from "@/lib/utils";

/** A single pulsing placeholder block. Compose into card/list skeletons. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[8px] bg-surface-container-high", className)}
    />
  );
}

/** Skeleton for a community post card in a feed. */
export function PostCardSkeleton() {
  return (
    <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
      </div>
      <SkeletonBlock className="mt-4 h-4 w-3/4" />
      <SkeletonBlock className="mt-2 h-3.5 w-full" />
      <SkeletonBlock className="mt-1.5 h-3.5 w-5/6" />
      <SkeletonBlock className="mt-4 h-40 w-full" />
    </div>
  );
}

/** Skeleton for a table/list row (admin tables, redemptions, notifications). */
export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3.5 w-1/3" />
        <SkeletonBlock className="h-3 w-1/4" />
      </div>
      <SkeletonBlock className="h-6 w-16 shrink-0" />
    </div>
  );
}
