"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { AVAILABLE_SPORTS } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";

const TABS = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "account", label: "Account", icon: "lock" },
  { id: "preferences", label: "Preferences", icon: "tune" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "billing", label: "Billing", icon: "credit_card" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type FeedbackTone = "success" | "error";
interface Feedback {
  tone: FeedbackTone;
  text: string;
}

export default function LearnerSettingsPage() {
  const {
    data: learner,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCurrentLearner(), []);

  const [tab, setTab] = useState<TabId>("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState(
    "Recreational athlete focused on consistency and mobility.",
  );
  const [sports, setSports] = useState<Set<string>>(new Set());
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState(true);

  // Account tab fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Seed editable fields once the learner profile loads from the API.
  useEffect(() => {
    if (!learner) return;
    setName(learner.name);
    setEmail(learner.email);
    setAvatarUrl(learner.avatarUrl);
    setSports(new Set(learner.preferredSports));
  }, [learner]);

  // Auto-dismiss feedback after 4s so it doesn't linger.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const saveProfile = async () => {
    if (!learner || savingProfile) return;
    setSavingProfile(true);
    setFeedback(null);
    try {
      await api.updateMyProfile({
        fullName: name.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setFeedback({ tone: "success", text: "Đã cập nhật hồ sơ." });
      refetch();
    } catch (err) {
      setFeedback({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async () => {
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      setFeedback({
        tone: "error",
        text: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.",
      });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({
        tone: "error",
        text: "Mật khẩu mới phải có ít nhất 6 ký tự.",
      });
      return;
    }
    setSavingPassword(true);
    setFeedback(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setFeedback({ tone: "success", text: "Đã đổi mật khẩu." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setFeedback({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "Đổi mật khẩu thất bại. Vui lòng thử lại.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleSport = (s: string) => {
    setSports((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  if (loading) {
    return (
      <AppShell role="learner" title="Settings">
        <LoadingState label="Đang tải cài đặt…" />
      </AppShell>
    );
  }

  if (error || !learner) {
    return (
      <AppShell role="learner" title="Settings">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="learner" title="Settings">
      <div className="max-w-[1100px]">
        <header className="mb-5">
          <h1 className="text-h1">Settings</h1>
          <p className="text-body-base text-on-surface-variant mt-1">
            Manage your profile, account and preferences.
          </p>
        </header>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "mb-4 flex items-start gap-2 rounded-[8px] border px-4 py-2.5 text-body-sm",
              feedback.tone === "success"
                ? "border-[#0c8a4d]/30 bg-[#0c8a4d]/10 text-[#0c6b3c]"
                : "border-error/30 bg-error/8 text-error",
            )}
          >
            <MaterialIcon
              name={feedback.tone === "success" ? "check_circle" : "error"}
              size={16}
              filled
              className="mt-0.5 shrink-0"
            />
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          {/* Tabs */}
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
          </nav>

          {/* Panel */}
          <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]">
            {tab === "profile" && (
              <div>
                <PanelHeader
                  title="Profile"
                  description="This is how others on the platform see you."
                />
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={avatarUrl || learner.avatarUrl}
                      alt={learner.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://… (đường dẫn ảnh đại diện)"
                      />
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        Dán đường dẫn ảnh đại diện (JPG/PNG).
                      </p>
                    </div>
                  </div>

                  <Field label="Full name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Email" hint="Email được dùng để đăng nhập, không thể chỉnh sửa.">
                    <Input value={email} readOnly disabled />
                  </Field>
                  <Field label="Bio" hint="Bio chỉ lưu cục bộ — backend chưa hỗ trợ.">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors resize-none"
                    />
                  </Field>
                  <Field
                    label="Preferred sports"
                    hint="Tuỳ chọn để tinh chỉnh AI matching — chưa lưu lên backend."
                  >
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SPORTS.map((s) => {
                        const active = sports.has(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSport(s)}
                            className={cn(
                              "px-3 py-1.5 rounded-[6px] text-body-sm transition-colors border",
                              active
                                ? "bg-primary text-on-primary border-primary"
                                : "border-[var(--color-border-soft)] hover:border-primary",
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
                <SaveBar onSave={saveProfile} saving={savingProfile} />
              </div>
            )}

            {tab === "account" && (
              <div>
                <PanelHeader
                  title="Account"
                  description="Email, password, and connected services."
                />
                <div className="p-6 space-y-5">
                  <Field label="Email">
                    <Input value={email} type="email" readOnly disabled />
                  </Field>
                  <Field label="Current password">
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </Field>
                  <Field label="New password" hint="Tối thiểu 6 ký tự.">
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <button
                      onClick={submitPasswordChange}
                      disabled={savingPassword}
                      className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingPassword ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
                    </button>
                  </div>
                  <div className="border-t border-[var(--color-border-soft)] pt-5">
                    <p className="text-h3 text-on-surface mb-3">
                      Connected accounts
                    </p>
                    <div className="space-y-2">
                      <ConnectedRow
                        name="Google"
                        icon="g_translate"
                        connected
                      />
                      <ConnectedRow name="Apple" icon="apple" />
                      <ConnectedRow name="Strava" icon="directions_run" />
                    </div>
                  </div>
                  <div className="border-t border-[var(--color-border-soft)] pt-5">
                    <p className="text-h3 text-error mb-1">Danger zone</p>
                    <p className="text-body-sm text-on-surface-variant mb-3">
                      Once deleted, your account cannot be recovered.
                    </p>
                    <button className="px-4 py-2 border border-error text-error rounded-[6px] text-body-sm font-medium hover:bg-error/5 transition-colors">
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "preferences" && (
              <div>
                <PanelHeader
                  title="Preferences"
                  description="Tune AI suggestions and accessibility."
                />
                <div className="p-6 space-y-5">
                  <Toggle
                    label="AI workout suggestions"
                    description="Let AI propose plans based on your data."
                    checked={aiSuggestions}
                    onChange={setAISuggestions}
                  />
                  <Toggle
                    label="Auto-confirm AI-guided sessions"
                    description="Skip booking confirmations for free AI sessions."
                    checked={false}
                    onChange={() => {}}
                  />
                  <Field label="Measurement units">
                    <div className="flex gap-2">
                      {["Metric", "Imperial"].map((u) => (
                        <button
                          key={u}
                          className={cn(
                            "px-3 py-1.5 rounded-[6px] text-body-sm border",
                            u === "Metric"
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-[var(--color-border-soft)] hover:border-primary",
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Time zone">
                    <Input value="America/Los_Angeles" readOnly />
                  </Field>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div>
                <PanelHeader
                  title="Notifications"
                  description="How and when we contact you."
                />
                <div className="p-6 space-y-5">
                  <Toggle
                    label="Email notifications"
                    description="Session reminders, AI insights and weekly summary."
                    checked={emailNotif}
                    onChange={setEmailNotif}
                  />
                  <Toggle
                    label="Push notifications"
                    description="Real-time alerts on your device."
                    checked={pushNotif}
                    onChange={setPushNotif}
                  />
                  <Toggle
                    label="Marketing emails"
                    description="Tips, new features, and seasonal promos."
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
              </div>
            )}

            {tab === "billing" && (
              <div>
                <PanelHeader
                  title="Billing"
                  description="Payment methods and invoices."
                />
                <div className="p-6 space-y-5">
                  <div className="p-4 border border-[var(--color-border-soft)] rounded-[10px] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[8px] bg-surface-container-high flex items-center justify-center">
                      <MaterialIcon
                        name="credit_card"
                        size={20}
                        className="text-primary"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-base font-medium">
                        Visa ending in 4521
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        Expires 09/27 • Default method
                      </p>
                    </div>
                    <button className="text-body-sm text-primary hover:underline">
                      Edit
                    </button>
                  </div>
                  <button className="text-body-sm text-primary hover:underline">
                    + Add payment method
                  </button>
                  <div className="border-t border-[var(--color-border-soft)] pt-5">
                    <p className="text-h3 mb-3">Recent invoices</p>
                    <ul className="space-y-2 text-body-sm">
                      {[
                        { id: "INV-2841", date: "May 1, 2026", amount: "$130" },
                        { id: "INV-2814", date: "Apr 1, 2026", amount: "$95" },
                        { id: "INV-2790", date: "Mar 1, 2026", amount: "$130" },
                      ].map((inv) => (
                        <li
                          key={inv.id}
                          className="flex items-center justify-between p-3 bg-surface-container-low rounded-[6px]"
                        >
                          <span>{inv.id}</span>
                          <span className="text-on-surface-variant">
                            {inv.date}
                          </span>
                          <span className="font-medium">{inv.amount}</span>
                          <button className="text-primary hover:underline">
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-4 border-b border-[var(--color-border-soft)]">
      <h2 className="text-h2">{title}</h2>
      <p className="text-body-sm text-on-surface-variant">{description}</p>
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

function ConnectedRow({
  name,
  icon,
  connected,
}: {
  name: string;
  icon: string;
  connected?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 border border-[var(--color-border-soft)] rounded-[6px]">
      <div className="w-9 h-9 rounded-[8px] bg-surface-container-high flex items-center justify-center">
        <MaterialIcon name={icon} size={18} />
      </div>
      <p className="flex-1 text-body-base font-medium">{name}</p>
      <button
        className={cn(
          "px-3 py-1.5 rounded-[6px] text-body-sm font-medium",
          connected
            ? "border border-[var(--color-border-soft)] hover:bg-surface-container-low"
            : "bg-primary text-on-primary hover:bg-[#2d20b8]",
        )}
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}

function SaveBar({
  onSave,
  saving = false,
}: {
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <div className="px-6 py-3 border-t border-[var(--color-border-soft)] flex items-center justify-end gap-2 bg-surface-container-low/40">
      <button
        type="button"
        className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Đang lưu…" : "Save changes"}
      </button>
    </div>
  );
}
