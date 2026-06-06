"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/AsyncStates";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { PersonalProfileForm } from "@/components/settings/PersonalProfileForm";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { AVAILABLE_SPORTS } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";

// ── Tab definition ────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: "person" },
  { id: "account", label: "Tài khoản", icon: "lock" },
  { id: "preferences", label: "Tuỳ chỉnh", icon: "tune" },
  { id: "notifications", label: "Thông báo", icon: "notifications" },
  { id: "billing", label: "Thanh toán", icon: "credit_card" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────

export default function LearnerSettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell role="learner" title="Cài đặt">
          <LoadingState label="Đang tải cài đặt…" />
        </AppShell>
      }
    >
      <LearnerSettingsInner />
    </Suspense>
  );
}

// ── Inner (has access to useSearchParams) ─────────────────────────────────────

function LearnerSettingsInner() {
  const params = useSearchParams();
  const fromLogin = params.get("fromLogin") === "1";

  // Auto-select profile tab when arriving from login
  const [tab, setTab] = useState<TabId>(fromLogin ? "profile" : "profile");

  const { data: learner } = useApiResource(
    () => api.fetchCurrentLearner(),
    [],
  );

  const [sports, setSports] = useState<Set<string>>(new Set());
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!learner) return;
    setSports(new Set(learner.preferredSports));
  }, [learner]);

  useEffect(() => {
    if (!pwFeedback) return;
    const t = setTimeout(() => setPwFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [pwFeedback]);

  const toggleSport = (s: string) =>
    setSports((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const submitPasswordChange = async () => {
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      setPwFeedback({ tone: "error", text: "Vui lòng nhập mật khẩu hiện tại và mới." });
      return;
    }
    if (newPassword.length < 6) {
      setPwFeedback({ tone: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }
    setSavingPassword(true);
    setPwFeedback(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwFeedback({ tone: "success", text: "Đã đổi mật khẩu." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwFeedback({
        tone: "error",
        text: err instanceof Error ? err.message : "Đổi mật khẩu thất bại.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppShell role="learner" title="Cài đặt">
      <div className="max-w-[1100px]">
        <header className="mb-5">
          <h1 className="text-h1">Cài đặt</h1>
          <p className="mt-1 text-body-base text-on-surface-variant">
            Quản lý hồ sơ, tài khoản và tuỳ chỉnh.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
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
          </nav>

          {/* Panel */}
          <section className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
            {/* ── Hồ sơ cá nhân tab ────────────────────────────────── */}
            {tab === "profile" && (
              <div>
                <PanelHeader
                  title="Hồ sơ cá nhân"
                  description="Thông tin tài khoản cá nhân của bạn."
                />
                <div className="p-6">
                  <PersonalProfileForm
                    fromLogin={fromLogin}
                    skipHref="/learner/dashboard"
                  />
                </div>

                {/* Preferred sports — local-only, backend doesn't support it */}
                <div className="border-t border-[var(--color-border-soft)] p-6">
                  <p className="mb-3 text-[13px] font-semibold text-on-surface">
                    Môn thể thao yêu thích
                  </p>
                  <p className="mb-3 text-[12px] text-on-surface-variant">
                    Dùng để tinh chỉnh gợi ý AI — chưa đồng bộ lên backend.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SPORTS.map((s) => {
                      const active = sports.has(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSport(s)}
                          className={cn(
                            "rounded-[6px] border px-3 py-1.5 text-body-sm transition-colors",
                            active
                              ? "border-primary bg-primary text-on-primary"
                              : "border-[var(--color-border-soft)] hover:border-primary",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tài khoản tab ─────────────────────────────────────── */}
            {tab === "account" && (
              <div>
                <PanelHeader
                  title="Tài khoản"
                  description="Đổi mật khẩu và bảo mật."
                />
                <div className="space-y-5 p-6">
                  <Field label="Đổi mật khẩu" />
                  {pwFeedback && (
                    <div
                      role={pwFeedback.tone === "error" ? "alert" : "status"}
                      className={cn(
                        "rounded-[8px] border px-4 py-2.5 text-[13px]",
                        pwFeedback.tone === "success"
                          ? "border-[#bce8c8] bg-success-container/50 text-[#1f7a4d]"
                          : "border-rose-200 bg-rose-50 text-rose-700",
                      )}
                    >
                      {pwFeedback.text}
                    </div>
                  )}
                  <div className="space-y-4">
                    <SettingsInput
                      label="Mật khẩu hiện tại"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <SettingsInput
                      label="Mật khẩu mới"
                      type="password"
                      placeholder="••••••••"
                      hint="Tối thiểu 6 ký tự."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => void submitPasswordChange()}
                      disabled={savingPassword}
                      className="h-10 rounded-[8px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:opacity-60"
                    >
                      {savingPassword ? "Đang đổi…" : "Đổi mật khẩu"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tuỳ chỉnh tab ─────────────────────────────────────── */}
            {tab === "preferences" && (
              <div>
                <PanelHeader
                  title="Tuỳ chỉnh"
                  description="Gợi ý AI và trợ năng."
                />
                <div className="space-y-5 p-6">
                  <Toggle
                    label="Gợi ý bài tập từ AI"
                    description="Cho phép AI đề xuất kế hoạch dựa trên dữ liệu của bạn."
                    checked={aiSuggestions}
                    onChange={setAISuggestions}
                  />
                  <Toggle
                    label="Tự xác nhận buổi tập từ AI"
                    description="Bỏ qua bước xác nhận cho các buổi miễn phí do AI lên lịch."
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
              </div>
            )}

            {/* ── Thông báo tab ─────────────────────────────────────── */}
            {tab === "notifications" && (
              <div>
                <PanelHeader
                  title="Thông báo"
                  description="Email và thông báo trong app."
                />
                <div className="space-y-5 p-6">
                  <Toggle
                    label="Thông báo Email"
                    description="Nhắc nhở buổi tập, insights AI và tổng hợp hàng tuần."
                    checked={emailNotif}
                    onChange={setEmailNotif}
                  />
                  <Toggle
                    label="Thông báo đẩy"
                    description="Cảnh báo thời gian thực trên thiết bị của bạn."
                    checked={pushNotif}
                    onChange={setPushNotif}
                  />
                </div>
              </div>
            )}

            {/* ── Thanh toán tab ────────────────────────────────────── */}
            {tab === "billing" && (
              <div>
                <PanelHeader
                  title="Thanh toán"
                  description="Phương thức thanh toán và hoá đơn."
                />
                <div className="p-6">
                  <p className="text-[13px] italic text-on-surface-variant">
                    Tính năng thanh toán sẽ sớm ra mắt.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
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

function Field({ label }: { label: string }) {
  return (
    <label className="block text-[13px] font-semibold text-on-surface">
      {label}
    </label>
  );
}

function SettingsInput({
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
