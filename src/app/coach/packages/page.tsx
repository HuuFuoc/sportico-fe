"use client";

import { useMemo, useState } from "react";
import { FileText, Globe, Layers, MapPin, Package } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn, formatCurrency } from "@/lib/utils";
import type { CoachPost, TrainingPackage } from "@/types";

type Tab = "packages" | "posts";

function statusPill(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved" || s === "active")
    return "bg-success-container text-[#1f7a4d] border-[#bce8c8]";
  if (s === "rejected")
    return "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]";
  if (s === "draft")
    return "bg-surface-container-high text-on-surface-variant border-[var(--color-border-soft)]";
  return "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60"; // pending
}

export default function CoachPackagesPage() {
  const { data, loading, error, refetch } = useApiResource(
    () => Promise.all([api.fetchMyPackages(), api.fetchMyPosts()]),
    [],
  );
  const packages = useMemo(() => data?.[0] ?? [], [data]);
  const posts = useMemo(() => data?.[1] ?? [], [data]);
  const [tab, setTab] = useState<Tab>("packages");

  return (
    <AppShell role="coach" title="Gói & bài đăng">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight">
            Gói &amp; bài đăng của tôi
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Quản lý gói huấn luyện và bài đăng — kèm trạng thái duyệt.
          </p>
        </header>

        {/* Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px]">
          {(
            [
              { id: "packages", label: "Gói huấn luyện", count: packages.length },
              { id: "posts", label: "Bài đăng", count: posts.length },
            ] as { id: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3.5 h-8 rounded-[7px] text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5",
                tab === t.id
                  ? "bg-surface-container-lowest text-on-surface shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t.label}
              <span className="text-[10px] tabular-nums px-1.5 rounded-full bg-surface-container-high text-on-surface-variant">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState label="Đang tải danh sách…" />
        ) : error ? (
          <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
        ) : tab === "packages" ? (
          packages.length === 0 ? (
            <Empty
              icon={Package}
              text="Bạn chưa có gói huấn luyện nào."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <Empty icon={FileText} text="Bạn chưa có bài đăng nào." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PackageCard({ pkg }: { pkg: TrainingPackage }) {
  return (
    <article className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[15px] font-semibold leading-snug">{pkg.title}</h3>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize",
            statusPill(pkg.status),
          )}
        >
          {pkg.status}
        </span>
      </div>
      {pkg.description && (
        <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-3">
          {pkg.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <Layers size={13} />
          {pkg.sessionCount} buổi · {pkg.durationDays} ngày
        </span>
        <span className="inline-flex items-center gap-1">
          {pkg.isOnline ? <Globe size={13} /> : <MapPin size={13} />}
          {pkg.sport}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--color-border-soft)] flex items-baseline justify-between">
        <span className="text-[18px] font-bold tabular-nums text-primary">
          {formatCurrency(pkg.price, "VND")}
        </span>
        {(pkg.level || pkg.goalType) && (
          <span className="text-[11px] text-on-surface-variant">
            {[pkg.goalType, pkg.level].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </article>
  );
}

function PostCard({ post }: { post: CoachPost }) {
  return (
    <article className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[15px] font-semibold leading-snug">{post.title}</h3>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border capitalize",
            statusPill(post.status),
          )}
        >
          {post.status}
        </span>
      </div>
      {post.description && (
        <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-3">
          {post.description}
        </p>
      )}
      <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          {post.isOnline ? <Globe size={13} /> : <MapPin size={13} />}
          {post.sport}
        </span>
        <span className="text-[16px] font-bold tabular-nums text-primary">
          {formatCurrency(post.price, "VND")}
        </span>
      </div>
    </article>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: typeof Package;
  text: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-14 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
        <Icon size={20} className="text-on-surface-variant" />
      </div>
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  );
}
