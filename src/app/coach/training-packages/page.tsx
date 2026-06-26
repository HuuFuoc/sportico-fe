"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  CalendarRange,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Info,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getSports } from "@/lib/sports-api";
import {
  getMyTrainingPackages,
  archiveTrainingPackage,
  trainingPackageStatusLabel,
  trainingPackageStatusBadge,
  levelLabel,
  goalTypeLabel,
} from "@/lib/training-package-api";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess, showApiError } from "@/lib/toast";
import { cn, formatCurrencyVnd } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { CoachPackageDetailModal } from "@/components/coach-packages/CoachPackageDetailModal";
import { PackageFormModal } from "@/components/coach-packages/create-form/PackageFormModal";
import type { TrainingPackageResponse } from "@/lib/types/coach";

// ---- Date helpers (display only) -------------------------------------------

/** Format an ISO datetime for compact Vietnamese display (schedule preview). */
function formatVnDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format an ISO date for compact Vietnamese display (window range). */
function formatVnDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type StatusTab = "all" | "pending" | "published" | "rejected" | "archived";

const TABS: { id: StatusTab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "published", label: "Đã xuất bản" },
  { id: "rejected", label: "Bị từ chối" },
  { id: "archived", label: "Đã lưu trữ" },
];

function canEdit(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "pending" || s === "rejected" || s === "archived";
}

export default function CoachTrainingPackagesPage() {
  const { data: page, loading, error, refetch } = useApiResource(
    () => getMyTrainingPackages({ pageSize: 100 }),
    [],
  );
  const { data: sports } = useApiResource(() => getSports(), []);

  const [tab, setTab] = useState<StatusTab>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TrainingPackageResponse | null>(null);
  const [detailTarget, setDetailTarget] =
    useState<TrainingPackageResponse | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<TrainingPackageResponse | null>(null);
  const [archiving, setArchiving] = useState(false);

  const items = useMemo(() => page?.items ?? [], [page]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of items) {
      const s = (p.status ?? "").toLowerCase();
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(
    () =>
      tab === "all"
        ? items
        : items.filter((p) => (p.status ?? "").toLowerCase() === tab),
    [items, tab],
  );

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveTrainingPackage(archiveTarget.id);
      setArchiveTarget(null);
      showSuccess("Đã lưu trữ gói tập.");
      refetch();
    } catch (e) {
      showApiError(e);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AppShell
      role="coach"
      title="Gói tập"
      searchPlaceholder="Tìm gói tập theo tên, mô tả hoặc môn thể thao..."
    >
      <div className="max-w-[1040px] mx-auto pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(53,37,205,0.25)]">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-on-surface">
                Gói tập của tôi
              </h1>
              <p className="text-[12.5px] text-on-surface-variant mt-0.5">
                Quản lý các gói tập, trạng thái duyệt và khả năng hiển thị công
                khai.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors shrink-0 shadow-[0_2px_8px_rgba(53,37,205,0.2)]"
          >
            <Plus size={16} />
            Tạo gói tập
          </button>
        </div>

        {/* Summary stat cards */}
        {!loading && !error && (
          <SummaryRow items={items} />
        )}

        {/* Status flow info */}
        <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-primary/15 bg-primary/[0.04] px-3.5 py-2.5 text-[12px] text-on-surface-variant">
          <Info size={14} className="text-primary mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold text-on-surface">Chờ duyệt</span> →
            quản trị viên duyệt →{" "}
            <span className="font-semibold text-on-surface">Đã xuất bản</span>.
            Gói bị từ chối có thể chỉnh sửa và gửi lại. Bạn có thể lưu trữ gói bất
            kỳ lúc nào.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-surface-container-low rounded-[10px] mb-4 border border-[var(--color-border-soft)]">
          {TABS.map((t) => {
            const count = t.id === "all" ? items.length : counts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3.5 h-8 rounded-[7px] text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5",
                  active
                    ? "text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tp-tab-pill"
                    className="absolute inset-0 rounded-[7px] bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,15,30,0.08),0_0_0_1px_rgba(15,15,30,0.05)]"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <span className="relative">{t.label}</span>
                <span
                  className={cn(
                    "relative text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "bg-surface-container-high text-on-surface-variant",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        {loading ? (
          <LoadingState label="Đang tải gói tập…" />
        ) : error ? (
          <ErrorState
            message={messageForApiError(error)}
            onRetry={refetch}
            className="mx-auto mt-10 max-w-md"
          />
        ) : items.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
              <Package size={20} className="text-on-surface-variant" />
            </div>
            <p className="text-body-sm text-on-surface-variant mb-4 max-w-sm mx-auto">
              Bạn chưa có gói tập nào. Hãy tạo gói tập đầu tiên để gửi quản trị
              viên duyệt.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] border border-primary/30 bg-primary/[0.06] text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
            >
              <Plus size={15} />
              Tạo gói tập
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-12 text-center">
            <p className="text-body-sm text-on-surface-variant">
              Không có gói tập nào ở trạng thái này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p, i) => (
              <PackageCard
                key={p.id}
                pkg={p}
                index={i}
                onViewDetail={() => setDetailTarget(p)}
                onEdit={() => setEditing(p)}
                onArchive={() => setArchiveTarget(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <AnimatePresence>
        {(creating || editing) && (
          <PackageFormModal
            initial={editing}
            sports={sports ?? []}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={(msg) => {
              setCreating(false);
              setEditing(null);
              showSuccess(msg);
              refetch();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailTarget && (
          <CoachPackageDetailModal
            pkg={detailTarget}
            canEdit={canEdit(detailTarget.status)}
            onEdit={() => {
              setEditing(detailTarget);
              setDetailTarget(null);
            }}
            onArchive={() => {
              setArchiveTarget(detailTarget);
              setDetailTarget(null);
            }}
            onClose={() => setDetailTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <Modal onClose={() => !archiving && setArchiveTarget(null)}>
            <h3 className="text-[16px] font-semibold">Lưu trữ gói tập</h3>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Bạn có chắc muốn lưu trữ &ldquo;{archiveTarget.title}&rdquo; không? Gói đã lưu
              trữ sẽ không hiển thị công khai.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmArchive()}
                disabled={archiving}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[9px] bg-primary text-white text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
              >
                {archiving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Đang lưu trữ…
                  </>
                ) : (
                  <>
                    <Archive size={15} />
                    Lưu trữ gói tập
                  </>
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ---- Summary stat row -------------------------------------------------------

interface StatTile {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  valueColor: string;
}

function SummaryRow({ items }: { items: TrainingPackageResponse[] }) {
  const published = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "published",
  ).length;
  const pending = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "pending",
  ).length;
  const rejected = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "rejected",
  ).length;
  const archived = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "archived",
  ).length;

  const tiles: StatTile[] = [
    {
      label: "Tổng gói",
      value: items.length,
      icon: <Package size={15} />,
      gradient: "from-primary to-[#7d6dff]",
      valueColor: "text-primary",
    },
    {
      label: "Đã xuất bản",
      value: published,
      icon: <CheckCircle2 size={15} />,
      gradient: "from-[#10b981] to-[#34d399]",
      valueColor: "text-[#0d9268]",
    },
    {
      label: "Chờ duyệt",
      value: pending,
      icon: <Clock size={15} />,
      gradient: "from-[#f59e0b] to-[#fb923c]",
      valueColor: "text-[#b95000]",
    },
    {
      label: "Bị từ chối",
      value: rejected,
      icon: <XCircle size={15} />,
      gradient: "from-[#f43f5e] to-[#fb7185]",
      valueColor: "text-[#ba1a1a]",
    },
    {
      label: "Đã lưu trữ",
      value: archived,
      icon: <Archive size={15} />,
      gradient: "from-slate-400 to-slate-500",
      valueColor: "text-on-surface-variant",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5"
        >
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tile.gradient} flex items-center justify-center text-white mb-2.5`}
          >
            {tile.icon}
          </div>
          <p className="text-[11px] text-on-surface-variant mb-0.5 leading-none">
            {tile.label}
          </p>
          <p
            className={`text-[22px] font-bold tabular-nums leading-none ${tile.valueColor}`}
          >
            {tile.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Package card ----------------------------------------------------------

function PackageCard({
  pkg,
  index,
  onViewDetail,
  onEdit,
  onArchive,
}: {
  pkg: TrainingPackageResponse;
  index: number;
  onViewDetail: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const editable = canEdit(pkg.status);
  const archived = (pkg.status ?? "").toLowerCase() === "archived";
  const tags = [
    goalTypeLabel(pkg.goalType),
    levelLabel(pkg.level),
    pkg.location,
  ].filter(Boolean) as string[];
  const visibleTags = tags.slice(0, 3);
  const extraTagCount = tags.length - visibleTags.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 flex flex-col hover:-translate-y-0.5 transition-transform shadow-[0_1px_2px_rgba(15,15,30,0.03),0_4px_16px_-8px_rgba(15,15,30,0.04)]"
    >
      {/* Card header: title + status badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-[15px] font-semibold leading-snug text-on-surface">
          {pkg.title}
        </h3>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border whitespace-nowrap",
            trainingPackageStatusBadge(pkg.status),
          )}
        >
          {trainingPackageStatusLabel(pkg.status)}
        </span>
      </div>

      {/* Description */}
      {pkg.description && (
        <p className="text-[12.5px] text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
          {pkg.description}
        </p>
      )}

      {/* Metadata row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Số buổi
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface">
            <Layers size={12} className="text-on-surface-variant" />
            {pkg.sessionCount}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Thời gian
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface">
            <CalendarRange size={12} className="text-on-surface-variant shrink-0" />
            {pkg.startDate || pkg.endDate
              ? `${formatVnDate(pkg.startDate)} – ${formatVnDate(pkg.endDate)}`
              : `${pkg.durationDays} ngày`}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Môn
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface truncate">
            {pkg.isOnline ? (
              <Globe size={12} className="text-on-surface-variant shrink-0" />
            ) : (
              <MapPin size={12} className="text-on-surface-variant shrink-0" />
            )}
            <span className="truncate">
              {pkg.sportName || (pkg.isOnline ? "Trực tuyến" : "Trực tiếp")}
            </span>
          </span>
        </div>
      </div>

      {/* Fixed schedule preview — first few sessions */}
      {pkg.sessions && pkg.sessions.length > 0 && (
        <div className="mb-3 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide font-medium text-on-surface-variant mb-1.5 inline-flex items-center gap-1">
            <Clock size={11} />
            Lịch học cố định
          </p>
          <ul className="space-y-1">
            {pkg.sessions.slice(0, 3).map((s) => (
              <li
                key={s.sessionNumber}
                className="flex items-center justify-between gap-2 text-[11.5px] text-on-surface"
              >
                <span className="text-on-surface-variant">Buổi {s.sessionNumber}</span>
                <span className="tabular-nums font-medium">
                  {formatVnDateTime(s.startTime)}
                </span>
              </li>
            ))}
          </ul>
          {pkg.sessions.length > 3 && (
            <p className="text-[10.5px] text-on-surface-variant mt-1">
              +{pkg.sessions.length - 3} buổi khác
            </p>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleTags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="px-2 py-0.5 rounded-full bg-surface-container-low border border-[var(--color-border-soft)] text-[11px] text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-[var(--color-border-soft)] text-[11px] text-on-surface-variant">
              +{extraTagCount}
            </span>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {(pkg.status ?? "").toLowerCase() === "rejected" && pkg.rejectionReason && (
        <div className="mb-3 rounded-[8px] border border-[#ffbbb3] bg-[#ffdad6]/50 px-3 py-2 text-[11.5px] text-[#ba1a1a]">
          <span className="font-semibold">Lý do từ chối: </span>
          {pkg.rejectionReason}
        </div>
      )}

      {/* Footer: price + actions */}
      <div className="mt-auto pt-3 border-t border-[var(--color-border-soft)] flex items-end justify-between gap-2">
        <div>
          <p className="text-[10.5px] text-on-surface-variant mb-0.5 font-medium uppercase tracking-wide">
            Giá gói
          </p>
          <p className="text-[19px] font-bold tabular-nums text-primary leading-none">
            {formatCurrencyVnd(pkg.price)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onViewDetail}
            title="Xem chi tiết gói tập"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-medium border border-primary/25 bg-primary/[0.06] text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye size={13} />
            Xem chi tiết
          </button>
          <button
            onClick={onEdit}
            disabled={!editable}
            title={
              editable
                ? "Chỉnh sửa gói tập"
                : "Gói đã xuất bản không thể chỉnh sửa"
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-medium border border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low hover:text-primary hover:border-primary/20 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant disabled:hover:border-[var(--color-border-soft)]"
          >
            <Pencil size={13} />
            Sửa
          </button>
          {!archived && (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-medium border border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
            >
              <Archive size={13} />
              Lưu trữ
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---- shared primitives -----------------------------------------------------

function Modal({
  children,
  onClose,
  maxWidthClass = "max-w-[520px]",
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative w-full max-h-[90vh] overflow-y-auto rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_20px_60px_-12px_rgba(15,15,30,0.3)]",
          maxWidthClass,
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

