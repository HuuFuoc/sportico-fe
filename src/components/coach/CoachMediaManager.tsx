"use client";

// ============================================================================
// CoachMediaManager — self-contained media gallery management, designed to be
// embedded as a section inside /coach/profile (previously its own /coach/media
// page). Handles list + create + edit + delete against the coach media API.
// ============================================================================

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { TiltedCard } from "@/components/ui/TiltedCard";
import { useApiResource } from "@/lib/hooks/useApiResource";
import {
  getMyCoachMedia,
  createCoachMedia,
  updateCoachMedia,
  deleteCoachMedia,
} from "@/lib/coach-api";
import {
  COACH_MEDIA_TYPES,
  type CoachMediaType,
} from "@/lib/constants/coach-media";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { ImageUpload } from "@/components/common/ImageUpload";
import { cn } from "@/lib/utils";
import type {
  CoachProfileMediaResponse,
  CoachProfileMediaRequest,
} from "@/lib/types/coach";

// ── Type-specific palette ────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  {
    gradient: string;
    badge: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  certificate: {
    gradient: "from-indigo-500 via-violet-500 to-purple-600",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: BadgeCheck,
    label: "Chứng chỉ",
  },
  award: {
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Trophy,
    label: "Giải thưởng",
  },
  gallery: {
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ImageIcon,
    label: "Thư viện",
  },
  identity: {
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: ShieldCheck,
    label: "Xác minh",
  },
  other: {
    gradient: "from-slate-400 via-slate-500 to-slate-600",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: FileText,
    label: "Khác",
  },
};

function typeConfig(mediaType: string | null | undefined) {
  return TYPE_CONFIG[(mediaType ?? "other").toLowerCase()] ?? TYPE_CONFIG.other;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url.trim());
}

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Main component ─────────────────────────────────────────────────────────────

export function CoachMediaManager({
  delay = 0,
  onChanged,
}: {
  delay?: number;
  /** Called after a media item is added/edited/deleted (to refresh parents). */
  onChanged?: () => void;
}) {
  const {
    data: media,
    loading,
    error,
    refetch,
  } = useApiResource(() => getMyCoachMedia(), []);

  const [editing, setEditing] = useState<CoachProfileMediaResponse | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<CoachProfileMediaResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Sort + group
  const grouped = useMemo(() => {
    const list = [...(media ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    const map = new Map<string, CoachProfileMediaResponse[]>();
    for (const t of COACH_MEDIA_TYPES) map.set(t.value, []);
    for (const m of list) {
      const key = (m.mediaType ?? "other").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [media]);

  // Stats
  const stats = useMemo(() => {
    const total = (media ?? []).length;
    const byType: Record<string, number> = {};
    for (const t of COACH_MEDIA_TYPES) {
      byType[t.value] = grouped.get(t.value)?.length ?? 0;
    }
    return { total, byType };
  }, [media, grouped]);

  // Filter tabs (only show types with items, plus "Tất cả")
  const activeTabs = useMemo(() => {
    const tabs: { value: string; label: string; count: number }[] = [
      { value: "all", label: "Tất cả", count: stats.total },
    ];
    for (const t of COACH_MEDIA_TYPES) {
      const count = stats.byType[t.value] ?? 0;
      if (count > 0)
        tabs.push({ value: t.value, label: typeConfig(t.value).label, count });
    }
    return tabs;
  }, [stats]);

  // Filtered display list
  const displayItems = useMemo(() => {
    if (activeFilter === "all")
      return [...(media ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
    return grouped.get(activeFilter) ?? [];
  }, [media, grouped, activeFilter]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCoachMedia(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess("Đã xóa media.");
      refetch();
      onChanged?.();
    } catch (e) {
      setDeleteError(messageForApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  const hasMedia = (media ?? []).length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 flex items-center justify-center text-primary">
            <ImageIcon size={16} />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              Bộ sưu tập media
            </h2>
            <p className="text-[12.5px] text-on-surface-variant">
              Chứng chỉ, giải thưởng, hình ảnh thi đấu và tài liệu xác minh.
            </p>
          </div>
        </div>
        {hasMedia && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
          >
            <Plus size={15} />
            Thêm media
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState label="Đang tải media…" />
      ) : error ? (
        <ErrorState
          message={messageForApiError(error)}
          onRetry={refetch}
          className="mx-auto my-6 max-w-md"
        />
      ) : !hasMedia ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-low/40 px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-[#7d6dff]/10 ring-8 ring-primary/5">
            <ImageIcon size={24} className="text-primary/60" />
          </div>
          <h3 className="text-[15px] font-semibold text-on-surface">
            Chưa có media nào
          </h3>
          <p className="mt-1.5 max-w-[360px] text-[12.5px] leading-relaxed text-on-surface-variant">
            Thêm chứng chỉ, giải thưởng hoặc hình ảnh để tăng độ tin cậy cho hồ
            sơ và thu hút học viên.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-[9px] border border-primary/30 bg-primary/[0.06] px-4 py-2 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <Plus size={15} />
            Thêm media đầu tiên
          </button>
        </div>
      ) : (
        <>
          {/* Stats strip */}
          <div className="flex flex-wrap items-center gap-2">
            <StatChip
              label="Tổng cộng"
              count={stats.total}
              className="bg-surface-container-low"
            />
            {COACH_MEDIA_TYPES.map((t) => {
              const count = stats.byType[t.value] ?? 0;
              if (count === 0) return null;
              const cfg = typeConfig(t.value);
              return (
                <StatChip
                  key={t.value}
                  label={cfg.label}
                  count={count}
                  className={cfg.badge}
                />
              );
            })}
          </div>

          {/* Filter tabs */}
          {activeTabs.length > 2 && (
            <div className="flex flex-wrap gap-1">
              {activeTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={cn(
                    "relative h-8 rounded-full px-4 text-[12.5px] font-medium transition-colors",
                    activeFilter === tab.value
                      ? "text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {activeFilter === tab.value && (
                    <motion.span
                      layoutId="profile-media-filter-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ duration: 0.22, ease: EASE }}
                    />
                  )}
                  <span className="relative">
                    {tab.label}{" "}
                    <span className="tabular-nums opacity-70">
                      ({tab.count})
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Media grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {displayItems.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.04 + i * 0.04, ease: EASE }}
                >
                  <TiltedCard
                    containerClassName="h-full"
                    className="h-full"
                    maxTilt={10}
                    scaleOnHover={1.02}
                  >
                    <MediaPortfolioCard
                      item={m}
                      onEdit={() => setEditing(m)}
                      onDelete={() => {
                        setDeleteError(null);
                        setDeleteTarget(m);
                      }}
                    />
                  </TiltedCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Create / edit modal */}
      <AnimatePresence>
        {(creating || editing) && (
          <MediaFormModal
            initial={editing}
            existingCount={(media ?? []).length}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={(msg) => {
              setCreating(false);
              setEditing(null);
              showSuccess(msg);
              refetch();
              onChanged?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal onClose={() => !deleting && setDeleteTarget(null)}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#ffdad6]">
              <Trash2 size={18} className="text-[#ba1a1a]" />
            </div>
            <h3 className="text-[16px] font-semibold">Xóa media</h3>
            <p className="mt-1.5 text-[13px] text-on-surface-variant">
              Bạn có chắc muốn xóa{" "}
              <strong className="text-on-surface">
                {deleteTarget.title ?? "media này"}
              </strong>
              ? Hành động này không thể hoàn tác.
            </p>
            {deleteError && (
              <p className="mt-3 text-[12.5px] text-rose-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-10 rounded-[9px] border border-[var(--color-border-soft)] px-4 text-[13px] font-medium transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-[#ba1a1a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#9f1414] disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Đang xóa…
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Xóa media
                  </>
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium",
        className,
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums font-semibold">{count}</span>
    </span>
  );
}

// ── Portfolio card ────────────────────────────────────────────────────────────

function MediaPortfolioCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CoachProfileMediaResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const url = item.mediaUrl ?? "";
  const isImage = looksLikeImage(url);
  const cfg = typeConfig(item.mediaType);
  const Icon = cfg.icon;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,15,30,0.04),0_4px_16px_-6px_rgba(15,15,30,0.06)] transition-shadow duration-200 group-hover:shadow-[0_2px_8px_rgba(15,15,30,0.06),0_12px_32px_-8px_rgba(15,15,30,0.12)]">
      {/* Visual area */}
      <div className="relative h-44 overflow-hidden">
        {isImage ? (
          <img
            src={url}
            alt={item.title ?? cfg.label}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              cfg.gradient,
            )}
          >
            <Icon size={40} className="text-white/80" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Type badge — top right */}
        <div className="absolute right-3 top-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold backdrop-blur-sm",
              cfg.badge,
            )}
          >
            <Icon size={10} />
            {cfg.label}
          </span>
        </div>

        {/* Order index — top left */}
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/80 backdrop-blur-sm">
          #{item.orderIndex}
        </span>

        {/* Link indicator overlay — for non-image */}
        {!isImage && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mở đường dẫn"
            className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
              <Link2 size={11} />
              <span className="max-w-[180px] truncate">{url}</span>
            </span>
          </a>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col p-4">
        {item.title && (
          <p className="text-[14px] font-semibold leading-snug text-on-surface">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-on-surface-variant">
            {item.description}
          </p>
        )}
        {!item.title && !item.description && (
          <p className="text-[12.5px] italic text-on-surface-variant/60">
            Chưa có tiêu đề
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] text-on-surface-variant transition-colors hover:text-primary"
          >
            <ExternalLink size={12} />
            Mở
          </a>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-[7px] px-2.5 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:bg-primary/[0.07] hover:text-primary"
            >
              <Pencil size={12} />
              Sửa
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-[7px] px-2.5 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
            >
              <Trash2 size={12} />
              Xóa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Create / edit modal ───────────────────────────────────────────────────────

function MediaFormModal({
  initial,
  existingCount,
  onClose,
  onSaved,
}: {
  initial: CoachProfileMediaResponse | null;
  existingCount: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(initial);
  const [mediaType, setMediaType] = useState<CoachMediaType>(
    (initial?.mediaType?.toLowerCase() as CoachMediaType) ?? "certificate",
  );
  const [mediaUrl, setMediaUrl] = useState(initial?.mediaUrl ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [orderIndex, setOrderIndex] = useState<string>(
    initial ? String(initial.orderIndex) : String(existingCount),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!mediaUrl.trim()) return "Vui lòng nhập đường dẫn media.";
    if (!isHttpUrl(mediaUrl.trim()))
      return "Đường dẫn media phải là URL hợp lệ (bắt đầu bằng http/https).";
    if (title.length > 200) return "Tiêu đề tối đa 200 ký tự.";
    if (description.length > 1000) return "Mô tả tối đa 1000 ký tự.";
    const oi = Number(orderIndex);
    if (orderIndex === "" || !Number.isInteger(oi) || oi < 0)
      return "Thứ tự hiển thị phải là số nguyên ≥ 0.";
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSaving(true);
    setErr(null);
    // mediaType is the EXACT backend value (certificate|award|gallery|identity|other).
    const payload: CoachProfileMediaRequest = {
      mediaType,
      mediaUrl: mediaUrl.trim(),
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      orderIndex: Number(orderIndex),
    };
    try {
      if (isEdit && initial) {
        await updateCoachMedia(initial.id, payload);
        onSaved("Đã cập nhật media.");
      } else {
        await createCoachMedia(payload);
        onSaved("Đã thêm media.");
      }
    } catch (e) {
      setErr(messageForApiError(e));
      setSaving(false);
    }
  };

  const selectedCfg = typeConfig(mediaType);

  return (
    <Modal onClose={() => !saving && onClose()}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br",
              selectedCfg.gradient,
            )}
          >
            <selectedCfg.icon size={17} className="text-white" />
          </div>
          <h3 className="text-[16px] font-semibold">
            {isEdit ? "Cập nhật media" : "Thêm media"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => !saving && onClose()}
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Media type — COMBOBOX (never free text; backend receives English constants) */}
        <FieldLabel label="Loại media" required>
          <div className="relative">
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as CoachMediaType)}
              className="w-full h-11 cursor-pointer appearance-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low pl-3.5 pr-9 text-[14px] outline-none focus:border-primary"
            >
              {COACH_MEDIA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </FieldLabel>

        <FieldLabel label="Ảnh media" required>
          <ImageUpload
            variant="wide"
            value={mediaUrl}
            folder="coaches/media"
            allowRemove
            placeholder="Kéo thả ảnh hoặc bấm để chọn"
            onChange={(url) => setMediaUrl(url)}
            onError={(msg) => setErr(msg)}
          />
        </FieldLabel>

        <FieldLabel label="Tiêu đề">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder="VD: Chứng chỉ HLV cấp 1"
            className="h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 text-[14px] outline-none focus:border-primary"
          />
        </FieldLabel>

        <FieldLabel label="Mô tả">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Mô tả ngắn gọn…"
            className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-primary"
          />
        </FieldLabel>

        <FieldLabel label="Thứ tự hiển thị" hint="Số nhỏ hiển thị trước.">
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            className="h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 text-[14px] tabular-nums outline-none focus:border-primary"
          />
        </FieldLabel>

        {err && (
          <p className="text-[12.5px] text-rose-600" role="alert">
            {err}
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => !saving && onClose()}
          disabled={saving}
          className="h-10 rounded-[9px] border border-[var(--color-border-soft)] px-4 text-[13px] font-medium transition-colors hover:bg-surface-container-low disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Đang lưu…
            </>
          ) : isEdit ? (
            "Cập nhật media"
          ) : (
            "Thêm media"
          )}
        </button>
      </div>
    </Modal>
  );
}

// ── Shared modal ─────────────────────────────────────────────────────────────

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
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
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_24px_64px_-12px_rgba(15,15,30,0.3)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────

function FieldLabel({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-on-surface">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
        {hint && (
          <span className="text-[11px] text-on-surface-variant">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
