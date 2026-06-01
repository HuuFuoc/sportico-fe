// ============================================================================
// Image-upload endpoint → AWS S3.
//
// The browser POSTs a multipart/form-data body with a single `file` field
// (and an optional `folder`). We stream it to the S3 bucket configured via the
// server-only AWS_* env vars and return the object's public URL. The database
// only ever stores that URL — the bytes live in S3.
//
// Why server-side: the AWS credentials are NOT NEXT_PUBLIC_*, so they never
// reach the browser. The client talks only to this same-origin route.
//
// Bucket requirement: objects must be publicly readable (bucket policy allowing
// s3:GetObject) so the returned URL renders in <img>. We do NOT set an ACL on
// upload — modern buckets default to "Bucket owner enforced" (ACLs disabled),
// where any ACL would be rejected.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// AWS SDK needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REGION = process.env.AWS_REGION ?? "";
const BUCKET = process.env.AWS_S3_BUCKET ?? "";
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "";

// The IAM credential (s3-image-presigner) is scoped to `s3:PutObject` under this
// prefix ONLY — every key MUST live under it or S3 returns AccessDenied. Override
// via AWS_S3_UPLOAD_PREFIX if the bucket policy changes.
const BASE_PREFIX = (process.env.AWS_S3_UPLOAD_PREFIX ?? "uploads").replace(
  /^\/+|\/+$/g,
  "",
);

// 8 MB ceiling — generous for avatars/covers, cheap to reject oversized uploads.
const MAX_BYTES = 8 * 1024 * 1024;

// Allowed MIME → file extension. Keeps the key clean and blocks non-image bodies.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// Only allow simple folder names (a-z, 0-9, dash, slash) to avoid key injection.
const FOLDER_RE = /^[a-z0-9][a-z0-9/-]{0,40}$/;

let _client: S3Client | null = null;
function s3(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  // Fail loudly if the deployment forgot the AWS env vars, rather than 500ing
  // deep inside the SDK with an opaque message.
  if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    return err(
      "Tải ảnh chưa được cấu hình trên máy chủ (thiếu thông tin AWS S3).",
      500,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return err("Yêu cầu không hợp lệ (cần multipart/form-data).", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return err("Không tìm thấy tệp ảnh trong yêu cầu.", 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return err(
      "Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPG, PNG, WebP, GIF, AVIF).",
      415,
    );
  }

  if (file.size > MAX_BYTES) {
    return err("Ảnh quá lớn. Kích thước tối đa là 8MB.", 413);
  }

  // Sanitise optional sub-folder (e.g. "avatars", "coaches/covers"). Always
  // nested under BASE_PREFIX so the IAM PutObject policy permits the write.
  const rawFolder = (form.get("folder") ?? "").toString().trim();
  const folder = rawFolder && FOLDER_RE.test(rawFolder) ? rawFolder : "general";

  const key = `${BASE_PREFIX}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const body = Buffer.from(await file.arrayBuffer());
    await s3().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: file.type,
        // Long-lived cache: keys are unique per upload, so they never change.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (cause) {
    console.error("[upload] S3 putObject failed:", cause);
    return err("Tải ảnh lên thất bại. Vui lòng thử lại.", 502);
  }

  // Virtual-hosted–style public URL. Works for every region's bucket.
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return NextResponse.json({ url, key });
}
