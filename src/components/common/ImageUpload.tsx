"use client";

// ============================================================================
// ImageUpload — pick an image from the device, upload it to S3, hand the parent
// back the resulting public URL via onChange. The DB only stores that URL.
//
// Variants:
//   "avatar" — circular control with a camera overlay (profile pictures).
//   "cover"  — wide 3:1 banner drop zone (coach cover image).
//   "wide"   — flexible 16:9 card drop zone (media / generic images).
//
// Drag-and-drop and click-to-browse are both supported. Validation + upload
// errors render inline and are also forwarded through onError so a parent toast
// can mirror them.
// ============================================================================

import { useId, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, RefreshCw, Trash2, User } from "lucide-react";
import { IMAGE_ACCEPT, uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

type Variant = "avatar" | "cover" | "wide";

interface ImageUploadProps {
  /** Current image URL (already uploaded). */
  value?: string;
  /** Called with the new public URL after a successful upload. */
  onChange: (url: string) => void;
  /** S3 key prefix, e.g. "avatars" or "coaches/covers". */
  folder: string;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  /** Hint text shown in the empty state of cover/wide variants. */
  placeholder?: string;
  /** Allow clearing the current image (renders a remove button). */
  allowRemove?: boolean;
  /** Mirrors upload/validation errors to a parent (e.g. a toast). */
  onError?: (message: string) => void;
  /**
   * CSS `object-position` for the preview image (e.g. "51% 37%"). Lets the
   * preview match a focal point chosen elsewhere so both stay in sync.
   */
  objectPosition?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  variant = "wide",
  disabled = false,
  className,
  placeholder = "Kéo thả ảnh vào đây hoặc bấm để chọn",
  allowRemove = false,
  onError,
  objectPosition,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasImage = Boolean(value && value.trim());

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, { folder });
      onChange(url);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Tải ảnh lên thất bại. Vui lòng thử lại.";
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
      // Reset so picking the same file again re-fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={IMAGE_ACCEPT}
      className="sr-only"
      disabled={disabled || uploading}
      onChange={(e) => void handleFiles(e.target.files)}
    />
  );

  // ── Avatar variant ──────────────────────────────────────────────────────────
  if (variant === "avatar") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-2", className)}>
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          aria-label="Tải ảnh đại diện"
          className="group relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-[var(--color-border-soft)] transition-[box-shadow,transform] hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
        >
          {hasImage ? (
            <img
              src={value}
              alt="Ảnh đại diện"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
              <User size={30} />
            </span>
          )}
          {/* Hover / uploading overlay */}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity",
              uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ImagePlus size={20} />
            )}
          </span>
          {hiddenInput}
        </button>
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className="text-[12px] font-medium text-primary transition-colors hover:text-[#2d20b8] disabled:opacity-60"
        >
          {uploading ? "Đang tải lên…" : hasImage ? "Đổi ảnh" : "Tải ảnh lên"}
        </button>
        {error && <FieldError message={error} center />}
      </div>
    );
  }

  // ── Cover / wide variants ─────────────────────────────────────────────────────
  const aspect = variant === "cover" ? "aspect-[3/1]" : "aspect-[16/9]";

  return (
    <div className={cn("w-full", className)}>
      {hasImage ? (
        <div
          className={cn(
            "group relative w-full overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low",
            aspect,
          )}
        >
          <img
            src={value}
            alt="Ảnh đã tải lên"
            className="h-full w-full object-cover"
            style={objectPosition ? { objectPosition } : undefined}
          />
          {/* Action overlay */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 bg-black/45 transition-opacity",
              uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {uploading ? (
              <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-white/90 px-3 py-1.5 text-[12.5px] font-medium text-slate-700">
                <Loader2 size={14} className="animate-spin" />
                Đang tải lên…
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white disabled:opacity-60"
                >
                  <RefreshCw size={13} />
                  Đổi ảnh
                </button>
                {allowRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      onChange("");
                    }}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-[8px] bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-[#ba1a1a] shadow-sm transition-colors hover:bg-white disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                    Xóa
                  </button>
                )}
              </>
            )}
          </div>
          {hiddenInput}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={disabled || uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed bg-surface-container-low/60 px-4 text-center transition-colors disabled:cursor-not-allowed",
            aspect,
            dragOver
              ? "border-primary bg-primary/[0.06]"
              : "border-[var(--color-border-soft)] hover:border-primary/40 hover:bg-surface-container-low",
          )}
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin text-primary" />
              <span className="text-[12.5px] font-medium text-on-surface-variant">
                Đang tải lên…
              </span>
            </>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImagePlus size={18} />
              </span>
              <span className="text-[12.5px] font-medium text-on-surface">
                {placeholder}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                JPG, PNG, WebP, GIF · tối đa 8MB
              </span>
            </>
          )}
          {hiddenInput}
        </button>
      )}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message, center }: { message: string; center?: boolean }) {
  return (
    <p
      role="alert"
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-[12px] text-rose-600",
        center && "justify-center text-center",
      )}
    >
      <AlertCircle size={13} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
