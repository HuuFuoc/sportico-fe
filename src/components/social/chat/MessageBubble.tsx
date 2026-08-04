"use client";

import { WarningTriangle, Trash, RefreshDouble, PageDown } from "iconoir-react";
import { formatChatTimestamp } from "@/lib/social/datetime";
import { cn } from "@/lib/utils";
import type { ChatMessageResponse, PendingMessage } from "@/lib/social/types";

interface MessageBubbleProps {
  mine: boolean;
  content: string;
  sentAt: string;
  attachments: { fileUrl: string; fileType: string }[];
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  onDiscard?: () => void;
}

export function MessageBubble({ mine, content, sentAt, attachments, pending, failed, onRetry, onDiscard }: MessageBubbleProps) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%]", mine && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-[14px] px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            mine ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface",
            failed && "opacity-60",
          )}
        >
          {attachments.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {attachments.map((att, i) => (
                <AttachmentPreview key={i} fileUrl={att.fileUrl} fileType={att.fileType} />
              ))}
            </div>
          )}
          {content && <p className="whitespace-pre-wrap">{content}</p>}
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[10.5px] text-on-surface-variant">
          {pending && !failed && <span>Đang gửi…</span>}
          {failed ? (
            <span className="flex items-center gap-1 text-error">
              <WarningTriangle width={11} height={11} />
              Gửi thất bại
              {onRetry && (
                <button type="button" onClick={onRetry} className="ml-1 flex items-center gap-0.5 font-semibold hover:underline">
                  <RefreshDouble width={11} height={11} />
                  Thử lại
                </button>
              )}
              {onDiscard && (
                <button type="button" onClick={onDiscard} className="ml-1 flex items-center gap-0.5 font-semibold hover:underline">
                  <Trash width={11} height={11} />
                  Xoá
                </button>
              )}
            </span>
          ) : (
            <span>{formatChatTimestamp(sentAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ fileUrl, fileType }: { fileUrl: string; fileType: string }) {
  if (fileType === "image") {
    return (
      <img
        src={fileUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="h-32 w-32 rounded-[8px] object-cover"
        onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}
      />
    );
  }
  if (fileType === "video") {
    return <video src={fileUrl} controls className="max-h-48 rounded-[8px]" />;
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-[8px] bg-black/10 px-2.5 py-1.5 text-[12px] font-medium underline"
    >
      <PageDown width={14} height={14} />
      Tệp đính kèm
    </a>
  );
}

export function bubbleFromMessage(m: ChatMessageResponse): {
  content: string;
  sentAt: string;
  attachments: { fileUrl: string; fileType: string }[];
} {
  return {
    // Attachment-only messages arrive as "" — render nothing, never "null".
    content: m.content ?? "",
    sentAt: m.sentAt,
    attachments: m.attachments.map((a) => ({ fileUrl: a.fileUrl ?? "", fileType: a.fileType ?? "file" })),
  };
}

export function bubbleFromPending(m: PendingMessage): {
  content: string;
  sentAt: string;
  attachments: { fileUrl: string; fileType: string }[];
} {
  return {
    content: m.content,
    sentAt: m.sentAt,
    attachments: m.attachments.map((a) => ({ fileUrl: a.fileUrl, fileType: a.fileType })),
  };
}
