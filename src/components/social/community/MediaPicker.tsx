"use client";

import { useRef, useState } from "react";
import { MediaImagePlus, Xmark, WarningTriangle } from "iconoir-react";
import ClassicLoader from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_MEDIA_ACCEPT,
  MAX_COMMUNITY_MEDIA,
  MAX_COMMUNITY_VIDEOS,
  isVideoFile,
  toCommunityMediaRequest,
  uploadMediaFile,
  validateMediaFile,
} from "@/lib/social/media-upload";
import type { CommunityPostMediaRequest } from "@/lib/social/types";

interface MediaPickerProps {
  value: CommunityPostMediaRequest[];
  onChange: (next: CommunityPostMediaRequest[]) => void;
  /** Called the first time the user actually adds/removes an item this session. */
  onTouched: () => void;
  disabled?: boolean;
}

interface UploadingItem {
  localId: string;
  previewUrl: string;
  progress: "uploading" | "error";
  error?: string;
}

/**
 * Community post media picker: up to {@link MAX_COMMUNITY_MEDIA} items, at most
 * {@link MAX_COMMUNITY_VIDEOS} video. Every file goes through
 * `uploadMediaFile()` (our own storage route) before it is added to `value` —
 * the user never types or pastes a URL.
 */
export function MediaPicker({ value, onChange, onTouched, disabled }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);

  const videoCount = value.filter((m) => m.mediaType === "video").length;
  const remainingSlots = MAX_COMMUNITY_MEDIA - value.length - uploading.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const toAdd = Array.from(files).slice(0, Math.max(0, remainingSlots));

    for (const file of toAdd) {
      const wouldBeVideo = isVideoFile(file);
      if (wouldBeVideo && videoCount + uploading.filter((u) => u.progress === "uploading").length >= MAX_COMMUNITY_VIDEOS) {
        continue; // silently skip extra videos — the counter below explains the limit
      }
      const invalid = validateMediaFile(file, "community");
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);

      if (invalid) {
        setUploading((prev) => [...prev, { localId, previewUrl, progress: "error", error: invalid }]);
        continue;
      }

      setUploading((prev) => [...prev, { localId, previewUrl, progress: "uploading" }]);

      try {
        const uploaded = await uploadMediaFile(file, { folder: "community" });
        onTouched();
        onChange([...value, toCommunityMediaRequest(file, uploaded)]);
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.localId === localId
              ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Tải lên thất bại." }
              : u,
          ),
        );
        continue;
      }
      setUploading((prev) => prev.filter((u) => u.localId !== localId));
      URL.revokeObjectURL(previewUrl);
    }
  }

  function removeAt(index: number) {
    onTouched();
    onChange(value.filter((_, i) => i !== index));
  }

  function dismissFailed(localId: string) {
    setUploading((prev) => {
      const item = prev.find((u) => u.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((u) => u.localId !== localId);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((item, i) => (
          <div key={`${item.url}-${i}`} className="group relative h-20 w-20 overflow-hidden rounded-[8px] bg-surface-container-high">
            {item.mediaType === "video" ? (
              <video src={item.url} className="h-full w-full object-cover" muted />
            ) : (
              <img src={item.url} alt="" className="h-full w-full object-cover" />
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Xoá"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Xmark width={12} height={12} />
              </button>
            )}
          </div>
        ))}

        {uploading.map((u) => (
          <div key={u.localId} className="relative h-20 w-20 overflow-hidden rounded-[8px] bg-surface-container-high">
            <img src={u.previewUrl} alt="" className="h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              {u.progress === "uploading" ? (
                <ClassicLoader size="sm" className="border-white border-t-transparent" />
              ) : (
                <button
                  type="button"
                  onClick={() => dismissFailed(u.localId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-error text-white"
                  title={u.error}
                >
                  <WarningTriangle width={14} height={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {!disabled && remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-[var(--color-border-soft)] text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
          >
            <MediaImagePlus width={20} height={20} />
            <span className="text-[10.5px]">Thêm</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={COMMUNITY_MEDIA_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className={cn("mt-1.5 text-[11px] text-on-surface-variant")}>
        Tối đa {MAX_COMMUNITY_MEDIA} ảnh/video, tối đa {MAX_COMMUNITY_VIDEOS} video mỗi bài.
        {videoCount >= MAX_COMMUNITY_VIDEOS && " Đã đạt giới hạn video."}
      </p>
    </div>
  );
}
