"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import {
  getMyCoachMedia,
  createCoachMedia,
  updateCoachMedia,
  deleteCoachMedia,
} from "@/lib/coach-api";
import {
  COACH_MEDIA_TYPES,
  coachMediaLabel,
  type CoachMediaType,
} from "@/lib/constants/coach-media";
import { messageForApiError } from "@/lib/errors-vi";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type {
  CoachProfileMediaResponse,
  CoachProfileMediaRequest,
} from "@/lib/types/coach";

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

export default function CoachMediaPage() {
  const { data: media, loading, error, refetch } = useApiResource(
    () => getMyCoachMedia(),
    [],
  );

  const [editing, setEditing] = useState<CoachProfileMediaResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<CoachProfileMediaResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const grouped = useMemo(() => {
    const list = [...(media ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const map = new Map<string, CoachProfileMediaResponse[]>();
    for (const t of COACH_MEDIA_TYPES) map.set(t.value, []);
    for (const m of list) {
      const key = (m.mediaType ?? "other").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [media]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCoachMedia(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Đã xóa media.");
      refetch();
    } catch (e) {
      setDeleteError(messageForApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell role="coach" title="Quản lý media">
      <div className="max-w-[960px] mx-auto pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary shrink-0">
              <ImageIcon size={20} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight">
                Quản lý media huấn luyện viên
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Thêm chứng chỉ, giải thưởng, hình ảnh và tài liệu xác minh.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-primary text-on-primary text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors shrink-0"
          >
            <Plus size={16} />
            Thêm media
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              role="status"
              className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-[#bce8c8] bg-success-container/50 px-4 py-3 text-[13px] font-medium text-[#1f7a4d]"
            >
              <CheckCircle2 size={17} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <LoadingState label="Đang tải media…" />
        ) : error ? (
          <ErrorState
            message={messageForApiError(error)}
            onRetry={refetch}
            className="mx-auto mt-10 max-w-md"
          />
        ) : (media ?? []).length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
              <ImageIcon size={20} className="text-on-surface-variant" />
            </div>
            <p className="text-body-sm text-on-surface-variant mb-4">
              Bạn chưa có media nào.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] border border-primary/30 bg-primary/[0.06] text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
            >
              <Plus size={15} />
              Thêm media đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {COACH_MEDIA_TYPES.map((t) => {
              const items = grouped.get(t.value) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={t.value}>
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/80 mb-2.5">
                    {t.label}{" "}
                    <span className="tabular-nums text-on-surface-variant/60">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((m) => (
                      <MediaCard
                        key={m.id}
                        item={m}
                        onEdit={() => setEditing(m)}
                        onDelete={() => {
                          setDeleteError(null);
                          setDeleteTarget(m);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

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
              showToast(msg);
              refetch();
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal onClose={() => !deleting && setDeleteTarget(null)}>
            <h3 className="text-[16px] font-semibold">Xóa media</h3>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Bạn có chắc muốn xóa media này không? Hành động này không thể hoàn
              tác.
            </p>
            {deleteError && (
              <p className="mt-3 text-[12.5px] text-rose-600" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[9px] bg-[#ba1a1a] text-white text-[13px] font-semibold hover:bg-[#9f1414] transition-colors disabled:opacity-60"
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
    </AppShell>
  );
}

// ---- Media card ------------------------------------------------------------

function MediaCard({
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
  return (
    <article className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden flex flex-col">
      {isImage ? (
        <img
          src={url}
          alt={item.title ?? coachMediaLabel(item.mediaType)}
          className="w-full h-36 object-cover bg-surface-container-low"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3.5 h-36 bg-surface-container-low/60 text-[12.5px] text-primary hover:underline"
        >
          <Link2 size={15} className="shrink-0" />
          <span className="truncate">{url}</span>
        </a>
      )}
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10.5px] font-semibold">
            {coachMediaLabel(item.mediaType)}
          </span>
          <span className="text-[10.5px] text-on-surface-variant tabular-nums">
            #{item.orderIndex}
          </span>
        </div>
        {item.title && (
          <p className="text-[13.5px] font-semibold leading-snug">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="text-[12px] text-on-surface-variant line-clamp-2 mt-0.5">
            {item.description}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-[var(--color-border-soft)] flex items-center justify-between">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] text-on-surface-variant hover:text-primary transition-colors"
          >
            <ExternalLink size={12} />
            Mở
          </a>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[7px] text-[12px] text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <Pencil size={13} />
              Sửa
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[7px] text-[12px] text-on-surface-variant hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors"
            >
              <Trash2 size={13} />
              Xóa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---- Create / edit modal ---------------------------------------------------

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

  return (
    <Modal onClose={() => !saving && onClose()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold">
          {isEdit ? "Cập nhật media" : "Thêm media"}
        </h3>
        <button
          onClick={() => !saving && onClose()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Media type — COMBOBOX (never free text) */}
        <FieldLabel label="Loại media" required>
          <div className="relative">
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as CoachMediaType)}
              className="w-full h-11 pl-3.5 pr-9 appearance-none bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] cursor-pointer"
            >
              {COACH_MEDIA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </FieldLabel>

        <FieldLabel label="Đường dẫn media" required>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
            className="w-full h-11 px-3.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px]"
          />
        </FieldLabel>

        <FieldLabel label="Tiêu đề">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder="VD: Chứng chỉ HLV cấp 1"
            className="w-full h-11 px-3.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px]"
          />
        </FieldLabel>

        <FieldLabel label="Mô tả">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Mô tả ngắn gọn…"
            className="w-full px-3.5 py-2.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] resize-none leading-relaxed"
          />
        </FieldLabel>

        <FieldLabel label="Thứ tự hiển thị" hint="Số nhỏ hiển thị trước.">
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            className="w-full h-11 px-3.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] tabular-nums"
          />
        </FieldLabel>

        {err && (
          <p className="text-[12.5px] text-rose-600" role="alert">
            {err}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => !saving && onClose()}
          disabled={saving}
          className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={() => void submit()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[9px] bg-primary text-on-primary text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
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

// ---- Shared modal + field --------------------------------------------------

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
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_20px_60px_-12px_rgba(15,15,30,0.3)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

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
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-on-surface">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-[11px] text-on-surface-variant">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
