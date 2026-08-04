"use client";

import { useRef, useState } from "react";
import { Attachment, SendDiagonal, WarningTriangle, Xmark } from "iconoir-react";
import ClassicLoader from "@/components/ui/loader";
import { CHAT_ATTACHMENT_ACCEPT, MAX_CHAT_ATTACHMENTS, toChatAttachmentRequest, uploadMediaFile, validateMediaFile } from "@/lib/social/media-upload";
import { cn } from "@/lib/utils";
import type { SendMessageAttachmentRequest } from "@/lib/social/types";

interface PendingAttachment {
  localId: string;
  file: File;
  status: "uploading" | "done" | "error";
  error?: string;
  uploaded?: SendMessageAttachmentRequest;
}

interface ChatComposerProps {
  disabled: boolean;
  disabledHint?: string;
  onSubmit: (payload: { content: string; attachments: SendMessageAttachmentRequest[] }) => void;
}

export function ChatComposer({ disabled, disabledHint, onSubmit }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploading = attachments.some((a) => a.status === "uploading");
  const doneAttachments = attachments.filter((a) => a.status === "done" && a.uploaded);
  const canSubmit = !disabled && !uploading && (text.trim().length > 0 || doneAttachments.length > 0);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_CHAT_ATTACHMENTS - attachments.length;
    const toAdd = Array.from(files).slice(0, Math.max(0, remaining));

    for (const file of toAdd) {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const invalid = validateMediaFile(file, "chat");
      if (invalid) {
        setAttachments((prev) => [...prev, { localId, file, status: "error", error: invalid }]);
        continue;
      }
      setAttachments((prev) => [...prev, { localId, file, status: "uploading" }]);
      try {
        const uploaded = await uploadMediaFile(file, { folder: "chat", allow: "chat" });
        setAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "done", uploaded: toChatAttachmentRequest(file, uploaded) } : a)),
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "error", error: err instanceof Error ? err.message : "Tải lên thất bại." } : a)),
        );
      }
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      content: text.trim(),
      attachments: doneAttachments.map((a) => a.uploaded as SendMessageAttachmentRequest),
    });
    setText("");
    setAttachments([]);
  }

  if (disabled) {
    return (
      <div className="border-t border-[var(--color-border-soft)] bg-surface-container-high px-4 py-3 text-center text-[12.5px] text-on-surface-variant">
        {disabledHint ?? "Bạn không thể gửi tin nhắn trong cuộc trò chuyện này."}
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest p-3">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <div key={a.localId} className="relative flex h-14 w-14 items-center justify-center rounded-[8px] bg-surface-container-high">
              {a.status === "uploading" && <ClassicLoader size="sm" />}
              {a.status === "error" && (
                <span title={a.error}>
                  <WarningTriangle width={16} height={16} className="text-error" />
                </span>
              )}
              {a.status === "done" && a.file.type.startsWith("image/") && (
                <img src={URL.createObjectURL(a.file)} alt="" className="h-full w-full rounded-[8px] object-cover" />
              )}
              {a.status === "done" && !a.file.type.startsWith("image/") && (
                <Attachment width={18} height={18} className="text-on-surface-variant" />
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.localId)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <Xmark width={10} height={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={attachments.length >= MAX_CHAT_ATTACHMENTS}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40"
          aria-label="Đính kèm tệp"
        >
          <Attachment width={18} height={18} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={CHAT_ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={1}
          placeholder="Nhắn tin…"
          className="min-w-0 flex-1 resize-none rounded-[10px] border border-[var(--color-border-soft)] bg-surface px-3.5 py-2.5 text-[13.5px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors",
            canSubmit ? "bg-primary text-on-primary hover:bg-[#2d20b8]" : "bg-surface-container-high text-on-surface-variant",
          )}
          aria-label="Gửi"
        >
          <SendDiagonal width={17} height={17} />
        </button>
      </div>
    </div>
  );
}
