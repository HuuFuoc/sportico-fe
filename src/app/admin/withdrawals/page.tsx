"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  Hourglass,
  Loader2,
  RefreshCw,
  RotateCcw,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn, formatCurrency } from "@/lib/utils";
import type { Payout } from "@/types";

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  string,
  { label: string; chip: string }
> = {
  pending:    { label: "Chờ duyệt",   chip: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:   { label: "Đã duyệt",    chip: "bg-blue-50 text-blue-700 border-blue-200" },
  processing: { label: "Đang xử lý",  chip: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:       { label: "Đã trả",      chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:   { label: "Đã từ chối",  chip: "bg-red-50 text-red-600 border-red-200" },
  failed:     { label: "Thất bại",    chip: "bg-red-50 text-red-600 border-red-200" },
};

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status?.toLowerCase()] ?? {
    label: status,
    chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
  };
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold", meta.chip)}>
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminWithdrawalsPage() {
  const { data, loading, error, refetch } = useApiResource(
    () => api.fetchAllWithdrawals(),
    [],
  );
  const items = useMemo(() => data ?? [], [data]);

  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const isBusy = (id: string) => busy === id;

  async function run(
    id: string,
    action: () => Promise<void>,
    successMsg: string,
    failMsg = "Thao tác thất bại.",
  ) {
    if (isBusy(id)) return;
    setBusy(id);
    try {
      await action();
      showToast(successMsg);
      refetch();
    } catch {
      showToast(failMsg);
    } finally {
      setBusy(null);
    }
  }

  const approve = (w: Payout) =>
    run(w.id, () => api.approveWithdrawal(w.id),
      `Đã duyệt rút ${formatCurrency(w.amount, w.currency)}`);

  const markPaid = (w: Payout) =>
    run(w.id, () => api.markPaidWithdrawal(w.id),
      `Đã đánh dấu đã trả ${formatCurrency(w.amount, w.currency)}`);

  const refresh = (w: Payout) =>
    run(w.id, () => api.refreshPayoutStatus(w.id),
      "Đã làm mới trạng thái");

  const retry = (w: Payout) =>
    run(w.id, () => api.retryPayout(w.id),
      "Đã gửi lại lệnh thanh toán");

  const confirmReject = async () => {
    const id = rejectId;
    if (!id) return;
    setRejectId(null);
    await run(id, () => api.rejectWithdrawal(id, note.trim()),
      "Đã từ chối yêu cầu rút tiền");
    setNote("");
  };

  // Stats
  const pending = items.filter((w) => w.status === "pending");
  const totalPending = pending.reduce((s, w) => s + w.amount, 0);

  return (
    <AppShell role="admin" title="Yêu cầu rút tiền">
      <div className="max-w-[1200px] mx-auto space-y-5">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight">Yêu cầu rút tiền</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Quản lý tất cả yêu cầu rút tiền của huấn luyện viên.
          </p>
        </header>

        {loading ? (
          <LoadingState label="Đang tải yêu cầu rút tiền…" />
        ) : error ? (
          <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Hourglass} label="Chờ duyệt" value={String(pending.length)} />
              <StatCard icon={Banknote} label="Tổng chờ duyệt" value={formatCurrency(totalPending, "VND")} />
              <StatCard icon={Check} label="Đã hoàn thành" value={String(items.filter((w) => w.status === "paid").length)} />
              <StatCard icon={Wallet} label="Tất cả yêu cầu" value={String(items.length)} />
            </div>

            {/* Table */}
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">HLV</th>
                    <th className="px-3 py-3 font-semibold">Ngày yêu cầu</th>
                    <th className="px-3 py-3 font-semibold text-right">Số tiền</th>
                    <th className="px-3 py-3 font-semibold text-center">Trạng thái</th>
                    <th className="px-5 py-3 font-semibold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-container-low flex items-center justify-center">
                          <Check size={16} className="text-[#10b981]" />
                        </div>
                        <p className="text-[13px] text-on-surface-variant">
                          Không có yêu cầu rút tiền nào.
                        </p>
                      </td>
                    </tr>
                  )}
                  {items.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low/20 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-medium font-mono">{w.coachId.slice(0, 8) || "—"}</p>
                        <p className="text-[11px] text-on-surface-variant">{w.method}</p>
                      </td>
                      <td className="px-3 py-3.5 text-[12.5px] text-on-surface-variant tabular-nums">
                        {new Date(w.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-3 py-3.5 text-right text-[14px] font-bold tabular-nums">
                        {formatCurrency(w.amount, w.currency)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <StatusChip status={w.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Pending: approve or reject */}
                          {w.status === "pending" && (
                            <>
                              <ActionBtn
                                label="Từ chối"
                                icon={<XCircle size={12} />}
                                disabled={isBusy(w.id)}
                                variant="danger"
                                onClick={() => setRejectId(w.id)}
                              />
                              <ActionBtn
                                label="Duyệt"
                                icon={isBusy(w.id) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                disabled={isBusy(w.id)}
                                variant="success"
                                onClick={() => void approve(w)}
                              />
                            </>
                          )}
                          {/* Approved/Processing: mark paid or refresh */}
                          {(w.status === "approved" || w.status === "processing") && (
                            <>
                              <ActionBtn
                                label="Làm mới"
                                icon={isBusy(w.id) ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                disabled={isBusy(w.id)}
                                variant="neutral"
                                onClick={() => void refresh(w)}
                              />
                              <ActionBtn
                                label="Đánh dấu đã trả"
                                icon={isBusy(w.id) ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                disabled={isBusy(w.id)}
                                variant="success"
                                onClick={() => {
                                  if (window.confirm("Xác nhận đã chuyển tiền thủ công cho HLV này?")) {
                                    void markPaid(w);
                                  }
                                }}
                              />
                            </>
                          )}
                          {/* Failed: retry payout or refresh */}
                          {w.status === "failed" && (
                            <>
                              <ActionBtn
                                label="Làm mới"
                                icon={isBusy(w.id) ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                disabled={isBusy(w.id)}
                                variant="neutral"
                                onClick={() => void refresh(w)}
                              />
                              <ActionBtn
                                label="Thử lại"
                                icon={isBusy(w.id) ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                disabled={isBusy(w.id)}
                                variant="warning"
                                onClick={() => {
                                  if (window.confirm("Gửi lại lệnh thanh toán tự động qua PayOS?")) {
                                    void retry(w);
                                  }
                                }}
                              />
                            </>
                          )}
                          {/* Paid/Rejected: read-only */}
                          {(w.status === "paid" || w.status === "rejected") && (
                            <span className="text-[12px] text-on-surface-variant">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setRejectId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[16px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
          >
            <div className="p-5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Từ chối yêu cầu rút tiền</h3>
              <button
                onClick={() => setRejectId(null)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-[12px] font-semibold text-on-surface-variant">
                Lý do (gửi cho HLV)
              </label>
              <textarea
                autoFocus
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: thông tin tài khoản không khớp…"
                className="w-full px-3 py-2 bg-surface-container-low/40 border border-[var(--color-border-soft)] focus:border-primary/40 focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13px] resize-none transition-all"
              />
            </div>
            <div className="p-4 border-t border-[var(--color-border-soft)] flex items-center justify-end gap-2 bg-surface-container-low/40">
              <button
                onClick={() => setRejectId(null)}
                className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmReject()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-gradient-to-br from-[#ef4444] to-[#fb7185] text-white text-[12.5px] font-semibold"
              >
                <XCircle size={13} />
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-on-surface text-white text-[13px] font-medium shadow-[0_8px_24px_-6px_rgba(15,15,30,0.4)]">
          <Check size={14} className="text-[#34d399]" />
          {toast}
        </div>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
          {label}
        </p>
        <p className="text-[18px] font-bold tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  icon,
  disabled,
  variant,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  variant: "success" | "danger" | "neutral" | "warning";
  onClick: () => void;
}) {
  const cls: Record<typeof variant, string> = {
    success: "bg-[#10b981] hover:bg-[#0e9f70] text-white",
    danger: "border border-[#ffbbb3] bg-[#ffdad6]/30 hover:bg-[#ffdad6]/60 text-[#ba1a1a]",
    neutral: "border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant",
    warning: "border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-[12px] font-medium transition-colors disabled:opacity-50",
        cls[variant],
      )}
    >
      {icon}
      {label}
    </button>
  );
}
