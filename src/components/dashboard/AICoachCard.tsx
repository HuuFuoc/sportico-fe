"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

const PROMPTS = [
  "Lập kế hoạch tập tuần này",
  "Tại sao hôm nay cường độ thấp?",
  "Phục hồi của tôi đang như thế nào?",
  "Điều chỉnh mục tiêu",
];

/**
 * The AI Coach — a conversational, first-class dashboard surface (not a
 * support widget): insight bubbles, an expandable recommendation rationale,
 * confidence indicator, smart prompts, voice input and a typing indicator.
 */
export function AICoachCard({
  recommendation,
}: {
  recommendation: { title: string; detail: string; confidence: number };
}) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0c0a20] p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_80%_0%,#000,transparent)]" />
        <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl" />
      </div>

      {/* header */}
      <div className="relative flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br from-indigo-400 to-violet-500 text-white">
          <MaterialIcon name="auto_awesome" filled size={22} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c0a20] bg-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">Trợ lý AI</p>
          <p className="flex items-center gap-1.5 text-[12px] text-white/55">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Đang phân tích dữ liệu tập luyện
          </p>
        </div>
        <button
          aria-label="Cài đặt AI Coach"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-[8px] text-white/45 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MaterialIcon name="more_horiz" size={18} />
        </button>
      </div>

      {/* conversation */}
      <div className="relative mt-5 flex-1 space-y-3">
        <div className="rounded-[14px] rounded-tl-[4px] border border-white/10 bg-white/[0.04] p-3.5">
          <p className="text-[13px] leading-relaxed text-white/85">
            Xin chào! Chỉ số{" "}
            <span className="font-semibold text-white">sẵn sàng là 78%</span> —
            phục hồi qua đêm tốt, bạn có thể tập buổi cường độ trung bình.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
              <MaterialIcon name="verified" filled size={11} />
              {recommendation.confidence}% độ tin cậy
            </span>
            <span className="text-[11px] text-white/40">
              dựa trên xu hướng 14 ngày
            </span>
          </div>
        </div>

        <div className="rounded-[14px] rounded-tl-[4px] border border-indigo-300/15 bg-indigo-400/[0.08] p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-200">
            <MaterialIcon name="bolt" filled size={13} />
            Đề xuất cho hôm nay
          </p>
          <p className="mt-1.5 text-[13.5px] font-medium text-white">
            {recommendation.title}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-medium text-indigo-300 transition-colors hover:text-indigo-200"
          >
            {expanded ? "Ẩn lý do" : "Vì sao vậy?"}
            <MaterialIcon
              name={expanded ? "expand_less" : "expand_more"}
              size={15}
            />
          </button>
          {expanded && (
            <p className="mt-2 border-t border-white/10 pt-2 text-[12px] leading-relaxed text-white/65">
              {recommendation.detail}
            </p>
          )}
        </div>

        {/* typing indicator */}
        <div className="flex items-center gap-1.5 pl-1.5 pt-0.5">
          <span className="h-1.5 w-1.5 animate-dot-flash rounded-full bg-white/45" />
          <span className="h-1.5 w-1.5 animate-dot-flash rounded-full bg-white/45 [animation-delay:0.18s]" />
          <span className="h-1.5 w-1.5 animate-dot-flash rounded-full bg-white/45 [animation-delay:0.36s]" />
        </div>
      </div>

      {/* smart prompts */}
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setInput(p)}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            {p}
          </button>
        ))}
      </div>

      {/* composer */}
      <div className="relative mt-3 flex items-center gap-1.5 rounded-[12px] border border-white/12 bg-white/[0.05] px-1.5 py-1.5 transition-colors focus-within:border-indigo-300/40">
        <button
          aria-label="Nhập bằng giọng nói"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MaterialIcon name="mic" size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          name="ai-coach-input"
          aria-label="Hỏi AI coach"
          placeholder="Hỏi AI coach bất cứ điều gì…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
        />
        <button
          disabled={!input.trim()}
          aria-label="Gửi tin nhắn"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-indigo-400 to-violet-500 text-white transition-opacity disabled:opacity-35"
        >
          <MaterialIcon name="arrow_upward" size={17} />
        </button>
      </div>
    </div>
  );
}
