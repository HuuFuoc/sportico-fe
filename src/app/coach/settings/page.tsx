"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/AsyncStates";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import {
  PersonalProfileForm,
  CoachProfileFooter,
} from "@/components/settings/PersonalProfileForm";
import { cn } from "@/lib/utils";
import { showSuccess, showApiError } from "@/lib/toast";
import { api } from "@/lib/api";
import { messageForApiError } from "@/lib/errors-vi";
import { useApiResource } from "@/lib/hooks/useApiResource";
import {
  VN_BANKS,
  findBankByBin,
  findBankByName,
  isValidBankBin,
} from "@/lib/banks-vn";

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: "person" },
  { id: "account", label: "Tài khoản", icon: "lock" },
  { id: "availability", label: "Lịch rảnh", icon: "schedule" },
  { id: "notifications", label: "Thông báo", icon: "notifications" },
  { id: "payments", label: "Thanh toán", icon: "payments" },
  { id: "policies", label: "Chính sách huỷ", icon: "policy" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoachSettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell role="coach" title="Cài đặt">
          <LoadingState label="Đang tải cài đặt…" />
        </AppShell>
      }
    >
      <CoachSettingsInner />
    </Suspense>
  );
}

function CoachSettingsInner() {
  const params = useSearchParams();
  const fromLogin = params.get("fromLogin") === "1";
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <AppShell role="coach" title="Cài đặt">
      <div className="max-w-[1100px]">
        <header className="mb-5">
          <h1 className="text-h1">Cài đặt huấn luyện viên</h1>
          <p className="mt-1 text-body-base text-on-surface-variant">
            Hồ sơ cá nhân, lịch rảnh, thanh toán và chính sách.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_1fr]">
          {/* Sidebar nav */}
          <nav className="h-fit space-y-0.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-1.5 md:sticky md:top-20">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-body-base text-left transition-colors",
                  tab === t.id
                    ? "bg-primary/[0.08] font-medium text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                <MaterialIcon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
            <Link
              href="/coach/profile"
              className="mt-2 flex w-full items-center gap-3 rounded-[6px] border-t border-[var(--color-border-soft)] px-3 pb-2 pt-3 text-body-base text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <MaterialIcon name="account_circle" size={18} />
              Hồ sơ công khai →
            </Link>
          </nav>

          {/* Panel */}
          <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
            {/* ── Hồ sơ cá nhân ──────────────────────────────────── */}
            {tab === "profile" && (
              <div>
                <PanelHeader
                  title="Hồ sơ cá nhân"
                  description="Thông tin tài khoản cá nhân. Hồ sơ công khai (bio, chuyên môn, địa điểm) được chỉnh sửa ở trang riêng."
                />
                <div className="p-6">
                  <PersonalProfileForm
                    fromLogin={fromLogin}
                    skipHref="/coach/dashboard"
                    footer={<CoachProfileFooter />}
                  />
                </div>
              </div>
            )}

            {/* ── Tài khoản ──────────────────────────────────────── */}
            {tab === "account" && <AccountTab />}

            {/* ── Lịch rảnh ──────────────────────────────────────── */}
            {tab === "availability" && <AvailabilityTab />}

            {/* ── Thông báo ──────────────────────────────────────── */}
            {tab === "notifications" && <NotificationsTab />}

            {/* ── Thanh toán ─────────────────────────────────────── */}
            {tab === "payments" && <PaymentsTab />}

            {/* ── Chính sách huỷ ─────────────────────────────────── */}
            {tab === "policies" && <PoliciesTab />}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

// ── Account tab ───────────────────────────────────────────────────────────────

function AccountTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      setFeedback({ tone: "error", text: "Vui lòng nhập mật khẩu hiện tại và mới." });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ tone: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setFeedback({ tone: "success", text: "Đã đổi mật khẩu thành công." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      // Covers AUTH_PASSWORD_NOT_SET (409) for Google-created accounts, which
      // points the user at forgot-password instead of a dead end.
      setFeedback({ tone: "error", text: messageForApiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Tài khoản" description="Bảo mật đăng nhập." />
      <div className="space-y-5 p-6">
        {feedback && (
          <div
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cn(
              "rounded-[8px] border px-4 py-2.5 text-[13px]",
              feedback.tone === "success"
                ? "border-[#bce8c8] bg-success-container/50 text-[#1f7a4d]"
                : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            {feedback.text}
          </div>
        )}
        <TabInput
          label="Mật khẩu hiện tại"
          type="password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <TabInput
          label="Mật khẩu mới"
          type="password"
          placeholder="••••••••"
          hint="Tối thiểu 6 ký tự."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div className="flex justify-end">
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="h-10 rounded-[8px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
          >
            {saving ? "Đang đổi…" : "Đổi mật khẩu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Availability tab ──────────────────────────────────────────────────────────

function AvailabilityTab() {
  const [avail, setAvail] = useState<Record<string, boolean>>({
    Mon: true,
    Tue: true,
    Wed: true,
    Thu: true,
    Fri: true,
    Sat: false,
    Sun: false,
  });
  const [bookingWindow, setBookingWindow] = useState(48);
  const [autoConfirm, setAutoConfirm] = useState(true);

  return (
    <div>
      <PanelHeader
        title="Lịch rảnh"
        description="Ngày và giờ học viên có thể đặt lịch bạn."
      />
      <div className="space-y-5 p-6">
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-on-surface">
            Ngày hoạt động
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const key = DAYS_EN[i];
              return (
                <button
                  key={key}
                  onClick={() => setAvail({ ...avail, [key]: !avail[key] })}
                  className={cn(
                    "h-10 w-10 rounded-[6px] border text-[13px] font-medium transition-colors",
                    avail[key]
                      ? "border-primary bg-primary/[0.08] text-primary"
                      : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TabInput label="Giờ bắt đầu" type="time" defaultValue="08:00" />
          <TabInput label="Giờ kết thúc" type="time" defaultValue="18:00" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-on-surface">
            Thời hạn đặt trước (giờ)
          </label>
          <p className="mb-2 text-[11.5px] text-on-surface-variant">
            Số giờ tối thiểu học viên cần báo trước khi đặt.
          </p>
          <div className="flex max-w-sm items-center gap-3">
            <input
              type="range"
              min={0}
              max={168}
              step={6}
              value={bookingWindow}
              onChange={(e) => setBookingWindow(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="min-w-[52px] text-right text-[13px] font-medium tabular-nums">
              {bookingWindow}h
            </span>
          </div>
        </div>
        <Toggle
          label="Tự xác nhận đặt lịch mới"
          description="Nếu tắt, bạn sẽ xem xét thủ công mỗi yêu cầu."
          checked={autoConfirm}
          onChange={setAutoConfirm}
        />
      </div>
    </div>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [sessionReminder, setSessionReminder] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [aiNudge, setAiNudge] = useState(true);

  return (
    <div>
      <PanelHeader title="Thông báo" description="Email và thông báo trong app." />
      <div className="space-y-5 p-6">
        <Toggle
          label="Nhắc nhở buổi tập"
          description="Nhận nhắc 24h trước mỗi buổi."
          checked={sessionReminder}
          onChange={setSessionReminder}
        />
        <Toggle
          label="Cảnh báo thanh toán"
          description="Thông báo khi payout được xử lý hoặc thất bại."
          checked={paymentAlerts}
          onChange={setPaymentAlerts}
        />
        <Toggle
          label="Gợi ý từ AI"
          description="Nhận insights về hoạt động và giữ chân học viên."
          checked={aiNudge}
          onChange={setAiNudge}
        />
      </div>
    </div>
  );
}

// ── Payments tab ──────────────────────────────────────────────────────────────

function PaymentsTab() {
  const { data: account, loading, refetch } = useApiResource(
    () => api.fetchPayoutAccount(),
    [],
  );
  const [editing, setEditing] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setBankName(account.bankName ?? "");
      // Prefill BIN from saved value, or best-effort match a legacy account by name.
      setBankBin(account.bankBin ?? findBankByName(account.bankName)?.bin ?? "");
      setAccountNumber(account.bankAccountNumber ?? "");
      setAccountHolder(account.bankAccountHolder ?? "");
    }
  }, [account]);

  const hasAccount = !!account?.bankAccountNumber;

  /** Selecting a bank fills both the display name and the BIN. */
  const onSelectBank = (bin: string) => {
    setBankBin(bin);
    const bank = findBankByBin(bin);
    if (bank) setBankName(bank.name);
  };

  const save = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Vui lòng nhập đủ thông tin ngân hàng.");
      return;
    }
    if (!isValidBankBin(bankBin.trim())) {
      setError("Vui lòng chọn ngân hàng để có mã BIN (6 chữ số).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.upsertPayoutAccount({
        payoutMethod: "BankTransfer",
        bankName: bankName.trim(),
        bankBin: bankBin.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankAccountHolder: accountHolder.trim(),
      });
      showSuccess("Đã lưu tài khoản nhận tiền thành công.");
      refetch();
      setEditing(false);
    } catch (e) {
      showApiError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PanelHeader title="Thanh toán" description="Tài khoản nhận tiền." />
      <div className="space-y-5 p-6">
        {!editing ? (
          <div className="flex items-center gap-4 rounded-[10px] border border-[var(--color-border-soft)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-surface-container-high">
              <MaterialIcon name="account_balance" size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <p className="text-[13px] text-on-surface-variant">Đang tải…</p>
              ) : hasAccount ? (
                <>
                  <p className="text-[14px] font-medium">
                    {account?.bankName} •••• {(account?.bankAccountNumber ?? "").slice(-4)}
                  </p>
                  <p className="text-[12px] text-on-surface-variant">
                    {account?.bankAccountHolder}
                    {account?.status ? ` • ${account.status}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-medium">Chưa có tài khoản nhận tiền</p>
                  <p className="text-[12px] text-on-surface-variant">
                    Thêm tài khoản ngân hàng để nhận payout
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 text-[13px] font-medium text-primary hover:underline"
            >
              {hasAccount ? "Thay đổi" : "Thêm"}
            </button>
          </div>
        ) : (
          <div className="space-y-4 rounded-[10px] border border-[var(--color-border-soft)] p-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-on-surface">
                Ngân hàng
              </label>
              <select
                value={bankBin}
                onChange={(e) => onSelectBank(e.target.value)}
                className={cn(
                  "h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 text-[14px] outline-none transition-colors focus:border-primary",
                  !bankBin && "text-on-surface-variant",
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
              {bankBin && (
                <p className="mt-1 text-[11.5px] text-on-surface-variant">
                  Mã BIN:{" "}
                  <span className="font-mono tabular-nums text-on-surface">
                    {bankBin}
                  </span>
                </p>
              )}
            </div>
            <TabInput
              label="Số tài khoản"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
            />
            <TabInput
              label="Chủ tài khoản"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="NGUYEN VAN A"
            />
            {error && (
              <p className="text-[12.5px] text-rose-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setEditing(false); setError(null); }}
                disabled={saving}
                className="px-4 py-2 text-[13px] text-on-surface-variant hover:text-on-surface disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="h-10 rounded-[8px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
              >
                {saving ? "Đang lưu…" : "Lưu tài khoản"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Policies tab ──────────────────────────────────────────────────────────────

function PoliciesTab() {
  const [cancellationFee, setCancellationFee] = useState(50);

  return (
    <div>
      <PanelHeader
        title="Chính sách huỷ lịch"
        description="Quy tắc áp dụng khi học viên huỷ."
      />
      <div className="space-y-5 p-6">
        <TabInput
          label="Cửa sổ huỷ miễn phí (giờ)"
          hint="Số giờ trước khi bắt đầu buổi tập."
          type="number"
          defaultValue={24}
          className="max-w-[150px]"
        />
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-on-surface">
            Phí huỷ muộn (%)
          </label>
          <p className="mb-2 text-[11.5px] text-on-surface-variant">
            % giá buổi tập áp dụng khi huỷ sau giờ miễn phí.
          </p>
          <div className="flex max-w-sm items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={cancellationFee}
              onChange={(e) => setCancellationFee(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="min-w-[48px] text-right text-[13px] font-medium tabular-nums">
              {cancellationFee}%
            </span>
          </div>
        </div>
        <Toggle
          label="Tính đủ 100% khi vắng mặt"
          description="Thu 100% nếu học viên không có mặt trong 15 phút đầu."
          checked
          onChange={() => {}}
        />
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[var(--color-border-soft)] px-6 py-4">
      <h2 className="text-h2">{title}</h2>
      <p className="text-body-sm text-on-surface-variant">{description}</p>
    </div>
  );
}

function TabInput({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-on-surface">
        {label}
      </label>
      {hint && (
        <p className="mb-1.5 text-[11.5px] text-on-surface-variant">{hint}</p>
      )}
      <input
        {...props}
        className={cn(
          "h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 text-[14px] outline-none transition-colors focus:border-primary",
          props.className,
        )}
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-body-base font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-container-highest",
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
