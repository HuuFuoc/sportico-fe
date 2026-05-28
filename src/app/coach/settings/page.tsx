"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

const TABS = [
  { id: "account", label: "Account", icon: "lock" },
  { id: "availability", label: "Availability", icon: "schedule" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "policies", label: "Cancellation Policies", icon: "policy" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CoachSettingsPage() {
  const [tab, setTab] = useState<TabId>("account");
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
  const [sessionReminder, setSessionReminder] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [aiNudge, setAiNudge] = useState(true);
  const [cancellationFee, setCancellationFee] = useState(50);

  return (
    <AppShell role="coach" title="Settings">
      <div className="max-w-[1100px]">
        <header className="mb-5">
          <h1 className="text-h1">Coach Settings</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Account, availability, payments and policies.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
          <nav className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-1.5 h-fit md:sticky md:top-20 space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-body-base text-left transition-colors",
                  tab === t.id
                    ? "bg-primary/8 text-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                <MaterialIcon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
            <Link
              href="/coach/profile"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-body-base text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors mt-2 border-t border-[var(--color-border-soft)] pt-3"
            >
              <MaterialIcon name="account_circle" size={18} />
              Edit public profile →
            </Link>
          </nav>

          <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]">
            {tab === "account" && (
              <Tab title="Account" description="Login and security.">
                <Field label="Email">
                  <Input value="sarah.jenkins@procoach.ai" type="email" />
                </Field>
                <Field label="Current password">
                  <Input type="password" placeholder="••••••••" />
                </Field>
                <Field label="New password">
                  <Input type="password" placeholder="••••••••" />
                </Field>
                <Toggle
                  label="Two-factor authentication"
                  description="Required for accounts handling payouts."
                  checked
                  onChange={() => {}}
                />
              </Tab>
            )}

            {tab === "availability" && (
              <Tab
                title="Availability"
                description="Days and hours learners can book you."
              >
                <Field label="Available days">
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          setAvail({ ...avail, [d]: !avail[d] })
                        }
                        className={cn(
                          "w-12 h-12 rounded-[6px] border transition-colors text-body-sm font-medium",
                          avail[d]
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-[var(--color-border-soft)] text-on-surface-variant hover:border-primary",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Daily start">
                    <Input type="time" defaultValue="08:00" />
                  </Field>
                  <Field label="Daily end">
                    <Input type="time" defaultValue="18:00" />
                  </Field>
                </div>
                <Field
                  label="Booking window"
                  hint="Minimum hours notice learners need to book."
                >
                  <div className="flex items-center gap-3 max-w-md">
                    <input
                      type="range"
                      min={0}
                      max={168}
                      step={6}
                      value={bookingWindow}
                      onChange={(e) =>
                        setBookingWindow(Number(e.target.value))
                      }
                      className="flex-1 accent-primary"
                    />
                    <span className="text-body-base font-medium min-w-[60px]">
                      {bookingWindow}h
                    </span>
                  </div>
                </Field>
                <Toggle
                  label="Auto-confirm new bookings"
                  description="If off, you'll review every request manually."
                  checked={autoConfirm}
                  onChange={setAutoConfirm}
                />
              </Tab>
            )}

            {tab === "notifications" && (
              <Tab
                title="Notifications"
                description="Email and in-app alerts."
              >
                <Toggle
                  label="Session reminders"
                  description="Get a reminder 24h before each session."
                  checked={sessionReminder}
                  onChange={setSessionReminder}
                />
                <Toggle
                  label="Payment alerts"
                  description="Notify when a payout is paid or failed."
                  checked={paymentAlerts}
                  onChange={setPaymentAlerts}
                />
                <Toggle
                  label="AI coaching nudges"
                  description="Insights about learner activity and retention."
                  checked={aiNudge}
                  onChange={setAiNudge}
                />
                <Toggle
                  label="Weekly digest"
                  description="Summary email every Monday morning."
                  checked={false}
                  onChange={() => {}}
                />
              </Tab>
            )}

            {tab === "payments" && <PaymentsTab />}

            {tab === "policies" && (
              <Tab
                title="Cancellation policy"
                description="Rules applied when learners cancel."
              >
                <Field
                  label="Free cancellation window"
                  hint="Hours before session start."
                >
                  <Input type="number" defaultValue={24} className="max-w-[150px]" />
                </Field>
                <Field
                  label="Late cancellation fee"
                  hint="% of session price charged after the free window."
                >
                  <div className="flex items-center gap-3 max-w-md">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={cancellationFee}
                      onChange={(e) =>
                        setCancellationFee(Number(e.target.value))
                      }
                      className="flex-1 accent-primary"
                    />
                    <span className="text-body-base font-medium min-w-[50px]">
                      {cancellationFee}%
                    </span>
                  </div>
                </Field>
                <Toggle
                  label="No-show full charge"
                  description="Charge 100% if learner doesn't show within 15 min."
                  checked
                  onChange={() => {}}
                />
              </Tab>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function PaymentsTab() {
  const { data: account, loading, refetch } = useApiResource(
    () => api.fetchPayoutAccount(),
    [],
  );
  const [editing, setEditing] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setBankName(account.bankName ?? "");
      setAccountNumber(account.bankAccountNumber ?? "");
      setAccountHolder(account.bankAccountHolder ?? "");
    }
  }, [account]);

  const hasAccount = !!account?.bankAccountNumber;

  const save = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Vui lòng nhập đủ thông tin ngân hàng.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.upsertPayoutAccount({
        payoutMethod: "BankTransfer",
        bankName: bankName.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankAccountHolder: accountHolder.trim(),
      });
      refetch();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tab title="Payments" description="Payout method and tax info.">
      {!editing ? (
        <div className="p-4 border border-[var(--color-border-soft)] rounded-[10px] flex items-center gap-4">
          <div className="w-10 h-10 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
            <MaterialIcon
              name="account_balance"
              size={20}
              className="text-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <p className="text-body-sm text-on-surface-variant">Đang tải…</p>
            ) : hasAccount ? (
              <>
                <p className="text-body-base font-medium">
                  {account?.bankName} ••••{" "}
                  {(account?.bankAccountNumber ?? "").slice(-4)}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {account?.bankAccountHolder}
                  {account?.status ? ` • ${account.status}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-body-base font-medium">
                  Chưa có tài khoản nhận tiền
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Thêm tài khoản ngân hàng để nhận payout
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-body-sm text-primary hover:underline shrink-0"
          >
            {hasAccount ? "Replace" : "Add"}
          </button>
        </div>
      ) : (
        <div className="p-4 border border-[var(--color-border-soft)] rounded-[10px] space-y-3">
          <Field label="Tên ngân hàng">
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Vietcombank"
            />
          </Field>
          <Field label="Số tài khoản">
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
            />
          </Field>
          <Field label="Chủ tài khoản">
            <Input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="NGUYEN VAN A"
            />
          </Field>
          {error && (
            <p className="text-body-sm text-[#ba1a1a]" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={saving}
              className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Lưu tài khoản"}
            </button>
          </div>
        </div>
      )}

      <Field label="Payout schedule">
        <div className="flex gap-2">
          {["Weekly", "Bi-weekly", "Monthly"].map((s, i) => (
            <button
              key={s}
              className={cn(
                "px-3 py-1.5 rounded-[6px] text-body-sm border",
                i === 0
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-[var(--color-border-soft)] hover:border-primary",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
    </Tab>
  );
}

function Tab({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-6 py-4 border-b border-[var(--color-border-soft)]">
        <h2 className="text-h2">{title}</h2>
        <p className="text-body-sm text-on-surface-variant">{description}</p>
      </div>
      <div className="p-6 space-y-5">{children}</div>
      <div className="px-6 py-3 border-t border-[var(--color-border-soft)] flex items-center justify-end gap-2 bg-surface-container-low/40">
        <button className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface">
          Cancel
        </button>
        <button className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
          Save changes
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-body-base font-medium text-on-surface mb-1">
        {label}
      </label>
      {hint && (
        <p className="text-body-sm text-on-surface-variant mb-2">{hint}</p>
      )}
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors",
        props.className,
      )}
    />
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
      <div className="flex-1 min-w-0">
        <p className="text-body-base font-medium">{label}</p>
        {description && (
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
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
