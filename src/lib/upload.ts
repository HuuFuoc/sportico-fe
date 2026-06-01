// ============================================================================
// Client-side image upload helper.
//
// Sends a File to the same-origin `/api/upload` route (which streams it to S3)
// and resolves to the public URL the database should store. Throws a localised
// Error on any failure so callers can surface a Vietnamese message directly.
// ============================================================================

/** MIME types the upload endpoint accepts. Mirror of the server allow-list. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** `accept` attribute value for <input type="file">. */
export const IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/** Max upload size in bytes — keep in sync with the route handler (8 MB). */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface UploadImageOptions {
  /** Logical S3 key prefix, e.g. "avatars" or "coaches/covers". */
  folder?: string;
  /** Optional AbortSignal to cancel an in-flight upload. */
  signal?: AbortSignal;
}

/**
 * Validate a file client-side before hitting the network. Returns a localised
 * error message, or null when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
    return "Định dạng ảnh không được hỗ trợ (chỉ JPG, PNG, WebP, GIF, AVIF).";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Ảnh quá lớn. Kích thước tối đa là 8MB.";
  }
  return null;
}

/**
 * Upload a single image file to S3 and return its public URL.
 * @throws Error with a user-facing Vietnamese message on validation or network failure.
 */
export async function uploadImage(
  file: File,
  options: UploadImageOptions = {},
): Promise<string> {
  const invalid = validateImageFile(file);
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
    throw new Error("Không thể kết nối để tải ảnh lên. Vui lòng thử lại.");
  }

  const data = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;

  if (!res.ok || !data?.url) {
    throw new Error(data?.error ?? "Tải ảnh lên thất bại. Vui lòng thử lại.");
  }

  return data.url;
}
