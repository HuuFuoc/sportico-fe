"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { cn, formatCurrencyVnd } from "@/lib/utils";
import { api } from "@/lib/api";
import { showSuccess, showApiError } from "@/lib/toast";
import { useApiResource } from "@/lib/hooks/useApiResource";
import {
  VN_BANKS,
  findBankByBin,
  findBankByName,
  isValidBankBin,
} from "@/lib/banks-vn";
import type { PayoutAccount } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  /** Available balance to withdraw against (VND). */
  available: number;
  /** Called after a successful withdrawal so the parent can refresh its data. */
  onSuccess?: () => void;
}

type View = "loading" | "account" | "form" | "success";

export function WithdrawModal({
  open,
  onClose,
  available,
  onSuccess,
}: WithdrawModalProps) {
  const reduce = useReducedMotion();
  const { data: account, loading, refetch } = useApiResource(
    () => (open ? api.fetchPayoutAccount() : Promise.resolve<PayoutAccount | null>(null)),
    [open],
  );

  const hasAccount = !!account?.bankAccountNumber;
  const [view, setView] = useState<View>("loading");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank form fields
  const [bankName, setBankName] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  // Resolve the initial view once the account finishes loading.
  useEffect(() => {
    if (!open) return;
    if (loading) {
      setView("loading");
      return;
    }
    setView(hasAccount ? "form" : "account");
  }, [open, loading, hasAccount]);

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setAmount("");
      setError(null);
      setBankName(account?.bankName ?? "");
      // Prefill BIN from the saved value, or best-effort match a legacy account
      // (saved before the BIN field existed) by its bank name.
      setBankBin(
        account?.bankBin ?? findBankByName(account?.bankName)?.bin ?? "",
      );
      setAccountNumber(account?.bankAccountNumber ?? "");
      setAccountHolder(account?.bankAccountHolder ?? "");
    }
  }, [open, account]);

  if (!open) return null;

  const amountNum = Number(amount);
  const amountValid = amountNum > 0 && amountNum <= available;

  // The backend only allows withdrawals against a payout account an admin has
  // verified. Reflect that here so the coach isn't surprised by a 409.
  const accountStatus = (account?.status ?? "").toLowerCase();
  const isVerified = accountStatus === "verified" || accountStatus === "approved";
  const isRejected = accountStatus === "rejected";

  const saveAccount = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Vui lòng nhập đủ thông tin ngân hàng.");
      return;
    }
    if (!isValidBankBin(bankBin.trim())) {
      setError("Vui lòng chọn ngân hàng để có mã BIN (6 chữ số).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.upsertPayoutAccount({
        payoutMethod: "BankTransfer",
        bankName: bankName.trim(),
        bankBin: bankBin.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankAccountHolder: accountHolder.trim(),
      });
      showSuccess("Đã lưu tài khoản ngân hàng thành công.");
      refetch();
      setView("form");
    } catch (e) {
      showApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  /** Selecting a bank fills both the display name and the BIN. */
  const onSelectBank = (bin: string) => {
    setBankBin(bin);
    const bank = findBankByBin(bin);
    if (bank) setBankName(bank.name);
  };

  const submitWithdrawal = async () => {
    if (!amountValid) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.createWithdrawal(amountNum);
      showSuccess("Gửi yêu cầu rút tiền thành công.");
      setView("success");
      onSuccess?.();
    } catch (e) {
      showApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[20px] bg-surface-container-lowest shadow-[0_20px_50px_-12px_rgba(15,15,30,0.35)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-[var(--color-border-soft)] flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)]">
              <ArrowDownToLine size={18} className="text-on-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold tracking-tight">
                Rút tiền
              </h3>
              <p className="text-[12.5px] text-on-surface-variant mt-0.5">
                Số dư khả dụng:{" "}
                <span className="font-semibold text-on-surface tabular-nums">
                  {formatCurrencyVnd(available)}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-5">
            {view === "loading" && (
              <div className="py-10 flex items-center justify-center text-on-surface-variant">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {view === "account" && (
              <div className="space-y-3">
                <p className="text-[12.5px] text-on-surface-variant">
                  Thêm tài khoản ngân hàng để nhận tiền trước khi rút.
                </p>
                <FormField label="Ngân hàng">
                  <BankSelect value={bankBin} onChange={onSelectBank} />
                </FormField>
                {bankBin && (
                  <p className="text-[11px] text-on-surface-variant -mt-1">
                    Mã BIN:{" "}
                    <span className="font-mono tabular-nums text-on-surface">
                      {bankBin}
                    </span>
                  </p>
                )}
                <FormField label="Số tài khoản">
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="0123456789"
                    inputMode="numeric"
                  />
                </FormField>
                <FormField label="Chủ tài khoản">
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="NGUYEN VAN A"
                  />
                </FormField>
                {error && <ErrorText>{error}</ErrorText>}
                <button
                  onClick={() => void saveAccount()}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang lưu…
                    </>
                  ) : (
                    "Lưu tài khoản"
                  )}
                </button>
              </div>
            )}

            {view === "form" && (
              <div className="space-y-4">
                {/* Linked account */}
                <div className="flex items-center gap-3 p-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/40">
                  <div className="w-9 h-9 rounded-[10px] bg-surface-container-high flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {account?.bankName ?? "Bank"} ••••
                      {(account?.bankAccountNumber ?? "").slice(-4)}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {account?.bankAccountHolder ?? ""}
                    </p>
                  </div>
                  <AccountStatusBadge status={accountStatus} />
                  <button
                    onClick={() => setView("account")}
                    className="text-[12px] text-primary hover:underline shrink-0"
                  >
                    Đổi
                  </button>
                </div>

                {/* Verification gate — withdrawals need an admin-verified account */}
                {!isVerified && (
                  <div
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-[12px] border text-[12.5px]",
                      isRejected
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {isRejected ? (
                      <XCircle size={16} className="shrink-0 mt-0.5" />
                    ) : (
                      <Clock size={16} className="shrink-0 mt-0.5" />
                    )}
                    <p>
                      {isRejected
                        ? "Tài khoản nhận tiền đã bị từ chối. Vui lòng cập nhật thông tin và chờ duyệt lại."
                        : "Tài khoản nhận tiền đang chờ quản trị viên xác minh. Bạn có thể rút tiền sau khi tài khoản được duyệt."}
                    </p>
                  </div>
                )}

                <FormField label="Số tiền rút">
                  <Input
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="0"
                    inputMode="numeric"
                    className="text-[18px] font-semibold tabular-nums"
                  />
                </FormField>

                {/* Quick amounts */}
                <div className="flex items-center gap-2">
                  {[0.25, 0.5, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() =>
                        setAmount(String(Math.floor(available * pct)))
                      }
                      className="flex-1 h-8 rounded-lg border border-[var(--color-border-soft)] hover:border-primary/40 hover:bg-primary/[0.04] text-[12px] font-medium transition-colors"
                    >
                      {pct === 1 ? "Tối đa" : `${pct * 100}%`}
                    </button>
                  ))}
                </div>

                {amount && !amountValid && (
                  <ErrorText>
                    {amountNum > available
                      ? "Vượt quá số dư khả dụng."
                      : "Số tiền không hợp lệ."}
                  </ErrorText>
                )}

                <button
                  onClick={() => void submitWithdrawal()}
                  disabled={!amountValid || submitting || !isVerified}
                  className="w-full h-11 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13.5px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang gửi yêu cầu…
                    </>
                  ) : !isVerified ? (
                    <>
                      <Clock size={15} />
                      Chờ duyệt tài khoản
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine size={15} />
                      Rút {amount ? formatCurrencyVnd(amountNum) : "tiền"}
                    </>
                  )}
                </button>
              </div>
            )}

            {view === "success" && (
              <div className="py-6 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 size={26} className="text-white" />
                </div>
                <h4 className="text-[16px] font-bold">Đã gửi yêu cầu rút tiền</h4>
                <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-xs mx-auto">
                  {formatCurrencyVnd(amountNum)} đã được chuyển sang số dư chờ xử lý.
                  Tiền sẽ được chuyển tới {account?.bankName ?? "tài khoản ngân hàng"} sau khi admin duyệt và PayOS xác nhận chuyển khoản thành công.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 h-10 px-5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-on-surface-variant mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-10 px-3 bg-surface-container-low border border-[var(--color-border-soft)] focus:border-primary/40 focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13.5px] transition-all",
        props.className,
      )}
    />
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const verified = status === "verified" || status === "approved";
  const rejected = status === "rejected";
  if (verified) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
        <ShieldCheck size={11} />
        Đã duyệt
      </span>
    );
  }
  if (rejected) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600">
        <XCircle size={11} />
        Bị từ chối
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
      <Clock size={11} />
      Chờ duyệt
    </span>
  );
}

function BankSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (bin: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-10 px-3 bg-surface-container-low border border-[var(--color-border-soft)] focus:border-primary/40 focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13.5px] transition-all",
        !value && "text-on-surface-variant",
      )}
    >
      <option value="" disabled>
        Chọn ngân hàng…
      </option>
      {VN_BANKS.map((b) => (
        <option key={b.bin} value={b.bin}>
          {b.name} ({b.code})
        </option>
      ))}
    </select>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-[#ba1a1a]" role="alert">
      {children}
    </p>
  );
}
