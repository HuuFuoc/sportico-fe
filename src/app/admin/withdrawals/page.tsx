"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  ExternalLink,
  Hourglass,
  Loader2,
  RefreshCw,
  RotateCcw,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn, formatCurrency } from "@/lib/utils";
import { messageForApiError } from "@/lib/errors-vi";
import type { Payout } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTO_PAYOUT = process.env.NEXT_PUBLIC_AUTO_PAYOUT_ENABLED === "true";

// ---------------------------------------------------------------------------
// Status metadata
// ---------------------------------------------------------------------------

const STATUS_META: Record<string, { label: string; chip: string }> = {
  pending:    { label: "Chờ duyệt",                    chip: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:   { label: "Đã duyệt — Chờ chuyển thủ công", chip: "bg-blue-50 text-blue-700 border-blue-200" },
  processing: { label: "Đang chuyển tiền qua PayOS",   chip: "bg-violet-50 text-violet-700 border-violet-200" },
  paid:       { label: "Đã chi trả",                   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:   { label: "Đã từ chối",                   chip: "bg-red-50 text-red-600 border-red-200" },
  failed:     { label: "Chi trả thất bại",             chip: "bg-red-50 text-red-600 border-red-200" },
};

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status?.toLowerCase()] ?? {
    label: status,
    chip: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
  };
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap", meta.chip)}>
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
  const [approveTarget, setApproveTarget] = useState<Payout | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const isBusy = (id: string) => busy === id;

  async function run(
    id: string,
    action: () => Promise<void>,
    successMsg: string,
  ) {
    if (isBusy(id)) return;
    setBusy(id);
    try {
      await action();
      showToast(successMsg);
      refetch();
    } catch (e) {
      showToast(messageForApiError(e), false);
    } finally {
      setBusy(null);
    }
  }

  // Approve — returns the updated payout so we can show status-aware toast.
  const confirmApprove = async (w: Payout) => {
    setApproveTarget(null);
    if (isBusy(w.id)) return;
    setBusy(w.id);
    try {
      const updated = await api.approveWithdrawal(w.id);
      refetch();
      if (AUTO_PAYOUT) {
        if (updated.status === "paid") {
          showToast(`Chi trả ${formatCurrency(updated.amount, updated.currency)} thành công.`);
        } else if (updated.status === "failed") {
          showToast(`Chi trả thất bại. Tiền đã hoàn về ví khả dụng của HLV.`, false);
        } else {
          showToast(`Đã gửi yêu cầu chuyển tiền ${formatCurrency(updated.amount, updated.currency)} qua PayOS.`);
        }
      } else {
        showToast(`Đã duyệt rút ${formatCurrency(w.amount, w.currency)}`);
      }
    } catch (e) {
      showToast(messageForApiError(e), false);
    } finally {
      setBusy(null);
    }
  };

  const markPaid = (w: Payout) =>
    run(w.id, () => api.markPaidWithdrawal(w.id),
      `Đã xác nhận chuyển khoản ${formatCurrency(w.amount, w.currency)}`);

  const refresh = async (w: Payout) => {
    if (isBusy(w.id)) return;
    setBusy(w.id);
    try {
      const updated = await api.refreshPayoutStatus(w.id);
      refetch();
      if (updated.status === "paid") {
        showToast(`Đã xác nhận PayOS chuyển tiền thành công.`);
      } else if (updated.status === "failed") {
        showToast(`PayOS báo lỗi: ${updated.failureReason ?? "Chi trả thất bại."}`, false);
      } else {
        showToast("Đã cập nhật trạng thái PayOS.");
      }
    } catch (e) {
      showToast(messageForApiError(e), false);
    } finally {
      setBusy(null);
    }
  };

  const retry = async (w: Payout) => {
    if (isBusy(w.id)) return;
    if (!window.confirm("Gửi lại lệnh chuyển tiền qua PayOS?")) return;
    setBusy(w.id);
    try {
      const updated = await api.retryPayout(w.id);
      refetch();
      if (updated.status === "paid") {
        showToast(`Chi trả ${formatCurrency(updated.amount, updated.currency)} thành công.`);
      } else if (updated.status === "failed") {
        showToast(
          `Chi trả thất bại: ${updated.failureReason ?? "PayOS từ chối lệnh thanh toán."}`,
          false,
        );
      } else {
        showToast("Đã gửi lại lệnh chuyển tiền — đang xử lý.");
      }
    } catch (e) {
      showToast(messageForApiError(e), false);
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    const id = rejectId;
    if (!id) return;
    setRejectId(null);
    await run(id, () => api.rejectWithdrawal(id, note.trim()),
      "Đã từ chối yêu cầu rút tiền");
    setNote("");
  };

  // Stats
  const pending    = items.filter((w) => w.status === "pending");
  const processing = items.filter((w) => w.status === "processing");
  const paid       = items.filter((w) => w.status === "paid");
  const totalPending    = pending.reduce((s, w) => s + w.amount, 0);
  const totalProcessing = processing.reduce((s, w) => s + w.amount, 0);

  return (
    <AppShell role="admin" title="Yêu cầu rút tiền">
      <div className="max-w-[1200px] mx-auto space-y-5">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight">Yêu cầu rút tiền</h1>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Quản lý tất cả yêu cầu rút tiền của huấn luyện viên.
          </p>
        </header>

        {/* Auto-payout mode banner */}
        {AUTO_PAYOUT && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-[12px] border border-violet-200 bg-violet-50">
            <Zap size={16} className="text-violet-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-violet-800">
              <span className="font-semibold">Chi trả tự động đang bật.</span>{" "}
              Khi admin bấm <strong>Duyệt và chuyển tiền</strong>, hệ thống sẽ tự động gửi lệnh chuyển khoản qua PayOS đến tài khoản ngân hàng đã xác minh của HLV.
            </p>
          </div>
        )}

        {loading ? (
          <LoadingState label="Đang tải yêu cầu rút tiền…" />
        ) : error ? (
          <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Hourglass} label="Chờ duyệt"     value={String(pending.length)} />
              <StatCard icon={Banknote}  label="Chờ duyệt (VND)" value={formatCurrency(totalPending, "VND")} />
              {AUTO_PAYOUT
                ? <StatCard icon={RefreshCw} label="Đang xử lý PayOS" value={formatCurrency(totalProcessing, "VND")} />
                : <StatCard icon={Check}    label="Đã hoàn thành"    value={String(paid.length)} />
              }
              <StatCard icon={Wallet} label="Tất cả yêu cầu" value={String(items.length)} />
            </div>

            {/* Table */}
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-x-auto">
              <table className="w-full text-left min-w-[780px]">
                <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">HLV</th>
                    <th className="px-3 py-3 font-semibold">Ngày yêu cầu</th>
                    <th className="px-3 py-3 font-semibold text-right">Số tiền</th>
                    <th className="px-3 py-3 font-semibold text-center">Trạng thái</th>
                    {AUTO_PAYOUT && (
                      <th className="px-3 py-3 font-semibold text-center">PayOS</th>
                    )}
                    <th className="px-5 py-3 font-semibold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={AUTO_PAYOUT ? 6 : 5} className="px-5 py-12 text-center">
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
                    <WithdrawalRow
                      key={w.id}
                      w={w}
                      autoPayout={AUTO_PAYOUT}
                      busy={isBusy(w.id)}
                      onApprove={() => setApproveTarget(w)}
                      onReject={() => setRejectId(w.id)}
                      onMarkPaid={() => {
                        if (window.confirm("Xác nhận đã chuyển tiền thủ công cho HLV này?")) {
                          void markPaid(w);
                        }
                      }}
                      onRefresh={() => void refresh(w)}
                      onRetry={() => void retry(w)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Approve confirm modal (auto payout mode) */}
      {approveTarget && AUTO_PAYOUT && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setApproveTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[16px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
          >
            <div className="p-5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center">
                  <Zap size={15} className="text-white" />
                </div>
                <h3 className="text-[15px] font-bold">Duyệt và chuyển tiền qua PayOS?</h3>
              </div>
              <button
                onClick={() => setApproveTarget(null)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 rounded-[10px] bg-surface-container-low/60 border border-[var(--color-border-soft)]">
                <p className="text-[13px] font-semibold">
                  {formatCurrency(approveTarget.amount, approveTarget.currency)}
                </p>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                  HLV ID: <span className="font-mono">{approveTarget.coachId.slice(0, 8)}</span>
                </p>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                Sau khi xác nhận, hệ thống sẽ gửi yêu cầu chuyển tiền đến{" "}
                <strong>tài khoản ngân hàng đã xác minh</strong> của HLV qua PayOS. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="p-4 border-t border-[var(--color-border-soft)] flex items-center justify-end gap-2 bg-surface-container-low/40">
              <button
                onClick={() => setApproveTarget(null)}
                className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmApprove(approveTarget)}
                disabled={isBusy(approveTarget.id)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] text-white text-[12.5px] font-semibold disabled:opacity-60"
              >
                {isBusy(approveTarget.id)
                  ? <><Loader2 size={13} className="animate-spin" /> Đang xử lý…</>
                  : <><Zap size={13} /> Duyệt và chuyển tiền</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirm modal (manual mode) */}
      {approveTarget && !AUTO_PAYOUT && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setApproveTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[16px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
          >
            <div className="p-5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Duyệt yêu cầu rút tiền?</h3>
              <button onClick={() => setApproveTarget(null)} className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-on-surface-variant">
                Yêu cầu rút <strong>{formatCurrency(approveTarget.amount, approveTarget.currency)}</strong> sẽ được duyệt.
                Chế độ thủ công: bạn cần chuyển khoản ngoài hệ thống rồi xác nhận đã trả.
              </p>
            </div>
            <div className="p-4 border-t border-[var(--color-border-soft)] flex justify-end gap-2 bg-surface-container-low/40">
              <button onClick={() => setApproveTarget(null)} className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] text-[12.5px] font-medium">
                Hủy
              </button>
              <button
                onClick={() => void confirmApprove(approveTarget)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[#10b981] text-white text-[12.5px] font-semibold"
              >
                <Check size={13} /> Xác nhận duyệt
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-[13px] font-medium shadow-[0_8px_24px_-6px_rgba(15,15,30,0.4)]",
          toast.ok ? "bg-on-surface" : "bg-[#ba1a1a]",
        )}>
          {toast.ok
            ? <Check size={14} className="text-[#34d399]" />
            : <XCircle size={14} className="text-white/80" />
          }
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// WithdrawalRow
// ---------------------------------------------------------------------------

function WithdrawalRow({
  w,
  autoPayout,
  busy,
  onApprove,
  onReject,
  onMarkPaid,
  onRefresh,
  onRetry,
}: {
  w: Payout;
  autoPayout: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMarkPaid: () => void;
  onRefresh: () => void;
  onRetry: () => void;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low/20 transition-colors">
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
          {w.status === "failed" && w.failureReason && (
            <p className="text-[10px] text-red-500 mt-1 max-w-[160px] mx-auto truncate" title={w.failureReason}>
              {w.failureReason}
            </p>
          )}
        </td>
        {autoPayout && (
          <td className="px-3 py-3.5 text-center">
            {w.payOsPayoutId
              ? <span className="text-[11px] font-mono text-on-surface-variant">{w.payOsPayoutId.slice(0, 10)}…</span>
              : <span className="text-[11px] text-on-surface-variant">—</span>
            }
          </td>
        )}
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {/* pending: approve + reject */}
            {w.status === "pending" && (
              <>
                <ActionBtn
                  label="Từ chối"
                  icon={<XCircle size={12} />}
                  disabled={busy}
                  variant="danger"
                  onClick={onReject}
                />
                <ActionBtn
                  label={autoPayout ? "Duyệt và chuyển tiền" : "Duyệt"}
                  icon={busy
                    ? <Loader2 size={12} className="animate-spin" />
                    : autoPayout ? <Zap size={12} /> : <Check size={12} />
                  }
                  disabled={busy}
                  variant="primary"
                  onClick={onApprove}
                />
              </>
            )}

            {/* processing (auto payout): refresh */}
            {w.status === "processing" && (
              <ActionBtn
                label="Cập nhật trạng thái PayOS"
                icon={busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                disabled={busy}
                variant="neutral"
                onClick={onRefresh}
              />
            )}

            {/* approved: always show mark-paid.
                In auto mode these are legacy records approved before auto payout was enabled.
                In manual mode these are the normal flow. */}
            {w.status === "approved" && (
              <>
                <ActionBtn
                  label="Làm mới"
                  icon={busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  disabled={busy}
                  variant="neutral"
                  onClick={onRefresh}
                />
                <ActionBtn
                  label="Xác nhận đã chuyển khoản"
                  icon={busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  disabled={busy}
                  variant="success"
                  onClick={onMarkPaid}
                />
              </>
            )}

            {/* failed: retry payout */}
            {w.status === "failed" && (
              <>
                <ActionBtn
                  label="Cập nhật trạng thái"
                  icon={busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  disabled={busy}
                  variant="neutral"
                  onClick={onRefresh}
                />
                <ActionBtn
                  label="Thử chuyển lại"
                  icon={busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  disabled={busy}
                  variant="warning"
                  onClick={onRetry}
                />
              </>
            )}

            {/* paid: view receipt */}
            {w.status === "paid" && (
              <ActionBtn
                label="Xem biên lai"
                icon={<ExternalLink size={12} />}
                disabled={false}
                variant="neutral"
                onClick={() => setReceiptOpen(true)}
              />
            )}

            {/* rejected: read-only */}
            {w.status === "rejected" && (
              <span className="text-[12px] text-on-surface-variant">—</span>
            )}
          </div>
        </td>
      </tr>

      {/* Receipt mini-modal */}
      {receiptOpen && (
        <tr>
          <td colSpan={autoPayout ? 6 : 5} className="p-0">
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => setReceiptOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-[16px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
              >
                <div className="p-5 border-b border-[var(--color-border-soft)] flex items-center justify-between">
                  <h3 className="text-[15px] font-bold">Biên lai rút tiền</h3>
                  <button onClick={() => setReceiptOpen(false)} className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-5 space-y-2 text-[13px]">
                  <ReceiptRow label="ID" value={w.id.slice(0, 16) + "…"} mono />
                  <ReceiptRow label="Số tiền" value={formatCurrency(w.amount, w.currency)} />
                  <ReceiptRow label="Ngày yêu cầu" value={new Date(w.date).toLocaleDateString("vi-VN")} />
                  <ReceiptRow label="Trạng thái" value="Đã chi trả" />
                  {w.payOsPayoutId && (
                    <ReceiptRow label="PayOS Payout ID" value={w.payOsPayoutId} mono />
                  )}
                  {w.payOsPayoutStatus && (
                    <ReceiptRow label="PayOS Status" value={w.payOsPayoutStatus} />
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={() => setReceiptOpen(false)}
                    className="w-full h-9 rounded-[8px] border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[12.5px] font-medium"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-on-surface-variant shrink-0">{label}</span>
      <span className={cn("text-right", mono && "font-mono text-[12px]")}>{value}</span>
    </div>
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

type ActionVariant = "success" | "primary" | "danger" | "neutral" | "warning";

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
  variant: ActionVariant;
  onClick: () => void;
}) {
  const cls: Record<ActionVariant, string> = {
    primary:  "bg-gradient-to-br from-primary to-[#5b4ee8] text-white shadow-[0_2px_8px_-2px_rgba(53,37,205,0.4)]",
    success:  "bg-[#10b981] hover:bg-[#0e9f70] text-white",
    danger:   "border border-[#ffbbb3] bg-[#ffdad6]/30 hover:bg-[#ffdad6]/60 text-[#ba1a1a]",
    neutral:  "border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant",
    warning:  "border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-[12px] font-medium transition-colors disabled:opacity-50 whitespace-nowrap",
        cls[variant],
      )}
    >
      {icon}
      {label}
    </button>
  );
}
