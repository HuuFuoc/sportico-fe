// ============================================================================
// Media upload for community posts and chat attachments.
//
// The backend has NO upload endpoint and accepts no multipart bodies. The only
// correct flow is:
//
//   1. validate the file in the browser
//   2. PUT it to our own storage route (/api/upload → S3)
//   3. take the returned HTTPS URL
//   4. send only that URL to the backend
//
// Users never type or paste a media URL — every URL the API receives came from
// step 2, so a post can't be used to embed arbitrary third-party content.
// ============================================================================

import type {
  ChatAttachmentType,
  CommunityMediaType,
  CommunityPostMediaRequest,
  SendMessageAttachmentRequest,
} from "@/lib/social/types";

export const MAX_COMMUNITY_MEDIA = 8;
export const MAX_COMMUNITY_VIDEOS = 1;
export const MAX_CHAT_ATTACHMENTS = 5;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_MEDIA_BYTES = 64 * 1024 * 1024;

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

/** `accept` for a community media picker (images + video). */
export const COMMUNITY_MEDIA_ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",");
/** `accept` for a chat attachment picker (images + video + documents). */
export const CHAT_ATTACHMENT_ACCEPT = [
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...FILE_TYPES,
].join(",");

export function isImageFile(file: File): boolean {
  return (IMAGE_TYPES as readonly string[]).includes(file.type);
}

export function isVideoFile(file: File): boolean {
  return (VIDEO_TYPES as readonly string[]).includes(file.type);
}

/** Classify an uploaded file into the enum the chat API expects. */
export function chatAttachmentType(file: File): ChatAttachmentType {
  if (isImageFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  return "file";
}

/** Classify an uploaded file into the enum community media expects. */
export function communityMediaType(file: File): CommunityMediaType {
  return isVideoFile(file) ? "video" : "image";
}

/** Returns a Vietnamese error string, or null when the file is acceptable. */
export function validateMediaFile(
  file: File,
  allow: "community" | "chat",
): string | null {
  const allowed =
    allow === "community"
      ? [...IMAGE_TYPES, ...VIDEO_TYPES]
      : [...IMAGE_TYPES, ...VIDEO_TYPES, ...FILE_TYPES];

  if (!(allowed as readonly string[]).includes(file.type)) {
    return allow === "community"
      ? "Chỉ hỗ trợ ảnh (JPG, PNG, WebP, GIF, AVIF) hoặc video (MP4, WebM, MOV)."
      : "Định dạng tệp không được hỗ trợ.";
  }

  const max = isImageFile(file) ? MAX_IMAGE_BYTES : MAX_MEDIA_BYTES;
  if (file.size > max) {
    return isImageFile(file)
      ? "Ảnh quá lớn. Kích thước tối đa là 8MB."
      : "Tệp quá lớn. Kích thước tối đa là 64MB.";
  }
  return null;
}

export interface UploadedMedia {
  url: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

/**
 * Upload one file and return its HTTPS URL plus the intrinsic dimensions we can
 * measure in the browser. Throws a localised Error on failure.
 */
export async function uploadMediaFile(
  file: File,
  options: { folder?: string; signal?: AbortSignal; allow?: "community" | "chat" } = {},
): Promise<UploadedMedia> {
  const invalid = validateMediaFile(file, options.allow ?? "community");
  if (invalid) throw new Error(invalid);

  const body = new FormData();
  body.append("file", file);
  if (options.folder) body.append("folder", options.folder);

  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      body,
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new Error("Không thể kết nối để tải tệp lên. Vui lòng thử lại.");
  }

  const data = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;

  if (!res.ok || !data?.url) {
    throw new Error(data?.error ?? "Tải tệp lên thất bại. Vui lòng thử lại.");
  }

  // The storage route returns an https:// S3 URL. Assert it rather than trust
  // it — the backend accepts http:// but we never want to store one.
  if (!isHttpsUrl(data.url)) {
    throw new Error("Máy chủ lưu trữ trả về đường dẫn không an toàn.");
  }

  const measured = isImageFile(file)
    ? await measureImage(file)
    : isVideoFile(file)
      ? await measureVideo(file)
      : {};

  return {
    url: data.url,
    mimeType: file.type,
    fileSize: file.size,
    ...measured,
  };
}

/** Only HTTPS media is ever sent to the API. */
export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Shape an uploaded file into the community media payload. */
export function toCommunityMediaRequest(
  file: File,
  uploaded: UploadedMedia,
): CommunityPostMediaRequest {
  return {
    mediaType: communityMediaType(file),
    url: uploaded.url,
    thumbnailUrl: null,
    mimeType: uploaded.mimeType,
    fileSize: uploaded.fileSize,
    width: uploaded.width ?? null,
    height: uploaded.height ?? null,
    durationSeconds: uploaded.durationSeconds ?? null,
  };
}

/** Shape an uploaded file into the chat attachment payload. */
export function toChatAttachmentRequest(
  file: File,
  uploaded: UploadedMedia,
): SendMessageAttachmentRequest {
  return { fileUrl: uploaded.url, fileType: chatAttachmentType(file) };
}

// ---- Intrinsic dimensions (best-effort — never blocks the upload) ----------

function measureImage(file: File): Promise<Partial<UploadedMedia>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    img.src = url;
  });
}

function measureVideo(file: File): Promise<Partial<UploadedMedia>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: Number.isFinite(video.duration)
          ? Math.round(video.duration)
          : undefined,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    video.src = url;
  });
}
