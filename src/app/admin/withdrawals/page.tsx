"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  Hourglass,
  Loader2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { formatCurrency } from "@/lib/utils";
import type { Payout } from "@/types";

export default function AdminWithdrawalsPage() {
  const { data, loading, error, refetch } = useApiResource(
    () => api.fetchPendingWithdrawals(),
    [],
  );
  const items = useMemo(() => data ?? [], [data]);

  // Optimistic: ids already actioned are hidden; rolled back on failure.
  const [resolved, setResolved] = useState<Record<string, "approved" | "rejected">>(
    {},
  );
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const visible = items.filter((w) => !resolved[w.id]);
  const totalPending = visible.reduce((s, w) => s + w.amount, 0);

  const approve = async (w: Payout) => {
    setBusy(w.id);
    setResolved((r) => ({ ...r, [w.id]: "approved" }));
    try {
      await api.approveWithdrawal(w.id);
      showToast(`Đã duyệt rút ${formatCurrency(w.amount, w.currency)}`);
    } catch {
      setResolved((r) => {
        const next = { ...r };
        delete next[w.id];
        return next;
      });
      showToast("Duyệt thất bại, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    const id = rejectId;
    if (!id) return;
    setRejectId(null);
    setBusy(id);
    setResolved((r) => ({ ...r, [id]: "rejected" }));
    try {
      await api.rejectWithdrawal(id, note.trim());
      showToast("Đã từ chối yêu cầu rút tiền");
    } catch {
      setResolved((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      showToast("Từ chối thất bại, thử lại.");
    } finally {
      setNote("");
      setBusy(null);
    }
  };

  return (
    <AppShell role="admin" title="Yêu cầu rút tiền">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight">
            Yêu cầu rút tiền
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Duyệt hoặc từ chối yêu cầu rút tiền của huấn luyện viên.
          </p>
        </header>

        {loading ? (
          <LoadingState label="Đang tải yêu cầu rút tiền…" />
        ) : error ? (
          <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Hourglass}
                label="Đang chờ"
                value={String(visible.length)}
              />
              <StatCard
                icon={Banknote}
                label="Tổng tiền chờ duyệt"
                value={formatCurrency(totalPending, "VND")}
              />
            </div>

            {/* Table */}
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Huấn luyện viên</th>
                    <th className="px-3 py-3 font-semibold">Ngày yêu cầu</th>
                    <th className="px-3 py-3 font-semibold text-right">Số tiền</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center">
                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-container-low flex items-center justify-center">
                          <Check size={16} className="text-[#10b981]" />
                        </div>
                        <p className="text-body-sm text-on-surface-variant">
                          Không còn yêu cầu nào chờ duyệt.
                        </p>
                      </td>
                    </tr>
                  )}
                  {visible.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-[var(--color-border-soft)] last:border-b-0"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-medium font-mono">
                          {w.coachId.slice(0, 8) || "—"}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {w.method}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-[12.5px] text-on-surface-variant">
                        {new Date(w.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-3 py-3.5 text-right text-[14px] font-bold tabular-nums">
                        {formatCurrency(w.amount, w.currency)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRejectId(w.id)}
                            disabled={busy === w.id}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-[6px] border border-[#ffbbb3] bg-[#ffdad6]/30 hover:bg-[#ffdad6]/60 text-[#ba1a1a] text-[12.5px] font-medium transition-colors disabled:opacity-50"
                          >
                            <XCircle size={13} />
                            Từ chối
                          </button>
                          <button
                            onClick={() => void approve(w)}
                            disabled={busy === w.id}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-[6px] bg-[#10b981] hover:bg-[#0e9f70] text-white text-[12.5px] font-medium transition-colors disabled:opacity-50"
                          >
                            {busy === w.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Duyệt
                          </button>
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
