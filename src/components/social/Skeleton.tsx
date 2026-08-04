import { cn } from "@/lib/utils";

/** A single pulsing placeholder block. Compose into card/list skeletons. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[8px] bg-surface-container-high", className)}
    />
  );
}

/** Skeleton for a Facebook-shaped community feed card. */
export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="flex items-center gap-3 p-4">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>
      <div className="px-4 pb-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="mt-2 h-3.5 w-full" />
        <SkeletonBlock className="mt-1.5 h-3.5 w-5/6" />
      </div>
      <SkeletonBlock className="aspect-[4/5] w-full rounded-none" />
      <div className="flex items-center gap-3 p-3">
        <SkeletonBlock className="h-6 w-14" />
        <SkeletonBlock className="h-6 w-14" />
      </div>
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
