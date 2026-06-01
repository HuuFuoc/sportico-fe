"use client";

// ============================================================================
// PersonalProfileForm — reusable "Hồ sơ cá nhân" form for all three roles.
//
// Wraps the PUT /api/users/me flow (fullName, phone, avatarUrl, dateOfBirth).
// Email is read-only because it is not part of the update payload.
//
// Props:
//   fromLogin  – when true renders the onboarding banner + "Bỏ qua" button.
//   skipHref   – route for the skip action (role/dashboard, no API call).
//   footer     – optional slot rendered below the save bar (e.g. coach profile
//                shortcut link).
//
// Auth store:
//   api.updateMyProfile() calls useAuthStore.setUser() after the live save, so
//   the sidebar immediately shows the new name/avatar.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Loader2, SkipForward } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { ImageUpload } from "@/components/common/ImageUpload";
import { cn } from "@/lib/utils";

// ── Types / props ─────────────────────────────────────────────────────────────

interface PersonalProfileFormProps {
  /** Show the post-login onboarding banner + "Bỏ qua" button. */
  fromLogin: boolean;
  /** Route to navigate to when the user skips (no API call). */
  skipHref: string;
  /** Content rendered after the save bar (e.g. "Edit coach profile" link). */
  footer?: React.ReactNode;
  className?: string;
}

interface FormState {
  fullName: string;
  phone: string;
  avatarUrl: string;
  dateOfBirth: string; // YYYY-MM-DD (for <input type="date">)
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(f: FormState): string | null {
  if (!f.fullName.trim()) return "Họ và tên không được để trống.";

  if (f.phone.trim()) {
    // Accept digits, spaces, +, -, (, ) — 7-20 chars after trimming spaces
    if (!/^[0-9+\-\s()]{7,20}$/.test(f.phone.trim())) {
      return "Số điện thoại không hợp lệ (7–20 ký tự, chỉ gồm chữ số và + - ( )).";
    }
  }

  if (f.avatarUrl.trim()) {
    try {
      const u = new URL(f.avatarUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return "URL ảnh đại diện phải bắt đầu bằng http:// hoặc https://.";
      }
    } catch {
      return "URL ảnh đại diện không hợp lệ.";
    }
  }

  if (f.dateOfBirth) {
    const d = new Date(f.dateOfBirth + "T00:00:00.000Z");
    if (isNaN(d.getTime())) return "Ngày sinh không hợp lệ.";
    if (d > new Date()) return "Ngày sinh không được là ngày trong tương lai.";
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PersonalProfileForm({
  fromLogin,
  skipHref,
  footer,
  className,
}: PersonalProfileFormProps) {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);

  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    avatarUrl: "",
    dateOfBirth: "",
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Seed from auth store. Only run when user identity changes (not on every
  // field update after a save — authUser.id stays the same).
  useEffect(() => {
    if (!authUser) return;
    setForm({
      fullName: authUser.fullName ?? "",
      phone: authUser.phone ?? "",
      avatarUrl: authUser.avatarUrl ?? "",
      // dateOfBirth from backend: "1990-05-15T00:00:00.000Z" → "1990-05-15"
      dateOfBirth: authUser.dateOfBirth
        ? authUser.dateOfBirth.split("T")[0]
        : "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Auto-dismiss success toast after 4 s
  useEffect(() => {
    if (toast?.type !== "success") return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) {
      setToast({ type: "error", text: err });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await api.updateMyProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        // Convert YYYY-MM-DD → ISO 8601 UTC string (backend Swagger format)
        dateOfBirth: form.dateOfBirth
          ? new Date(form.dateOfBirth + "T00:00:00.000Z").toISOString()
          : undefined,
      });
      setToast({ type: "success", text: "Đã cập nhật hồ sơ cá nhân." });
    } catch (err) {
      setToast({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật. Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => router.push(skipHref);

  const avatarPreview = form.avatarUrl.trim() || authUser?.avatarUrl;

  return (
    <div className={cn("space-y-5", className)}>
      {/* ── fromLogin onboarding banner ────────────────────────────────── */}
      {fromLogin && (
        <div className="flex items-start justify-between gap-4 rounded-[12px] border border-primary/25 bg-primary/[0.06] px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-[13.5px] font-semibold text-primary">
                Hoàn thiện hồ sơ cá nhân
              </p>
              <p className="mt-0.5 text-[12.5px] text-on-surface-variant">
                Cập nhật thông tin để cá nhân hóa trải nghiệm tập luyện của
                bạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-1.5 text-[12px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <SkipForward size={13} />
            Bỏ qua
          </button>
        </div>
      )}

      {/* ── Toast feedback ─────────────────────────────────────────────── */}
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "flex items-start gap-2 rounded-[10px] border px-4 py-3 text-[13px]",
            toast.type === "success"
              ? "border-[#bce8c8] bg-success-container/50 text-[#1f7a4d]"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          <CheckCircle2
            size={15}
            className={cn(
              "mt-0.5 shrink-0",
              toast.type === "error" && "hidden",
            )}
          />
          {toast.text}
        </div>
      )}

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Avatar — upload from device to S3, store the returned URL */}
        <div className="flex items-start gap-5">
          <ImageUpload
            variant="avatar"
            value={avatarPreview || undefined}
            folder="avatars"
            onChange={(url) => setForm((prev) => ({ ...prev, avatarUrl: url }))}
            onError={(text) => setToast({ type: "error", text })}
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[13px] font-semibold text-on-surface">
              Ảnh đại diện
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
              Tải ảnh từ máy của bạn (JPG, PNG, WebP, GIF — tối đa 8MB). Ảnh sẽ
              được lưu trữ an toàn và hiển thị trên hồ sơ của bạn.
            </p>
          </div>
        </div>

        <FieldLabel label="Họ và tên" required>
          <FormInput
            value={form.fullName}
            onChange={set("fullName")}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />
        </FieldLabel>

        {/* Email — read-only; not part of PUT /api/users/me payload */}
        <FieldLabel
          label="Email"
          hint="Email dùng để đăng nhập, không thể thay đổi tại đây."
        >
          <FormInput
            type="email"
            value={authUser?.email ?? ""}
            readOnly
            disabled
          />
        </FieldLabel>

        <FieldLabel label="Số điện thoại">
          <FormInput
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="0912 345 678"
            autoComplete="tel"
            inputMode="tel"
          />
        </FieldLabel>

        <FieldLabel label="Ngày sinh">
          <FormInput
            type="date"
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
            max={new Date().toISOString().split("T")[0]} // can't pick future
          />
        </FieldLabel>

        {/* ── Save bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {fromLogin && (
            <button
              type="button"
              onClick={handleSkip}
              className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              Bỏ qua
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Đang lưu…
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        </div>
      </form>

      {footer && <div className="pt-2">{footer}</div>}
    </div>
  );
}

// ── Small shared UI ───────────────────────────────────────────────────────────

function FieldLabel({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-on-surface">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {hint && (
        <p className="mb-1.5 text-[11.5px] text-on-surface-variant">{hint}</p>
      )}
      {children}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3.5 text-[14px] outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

// ── Convenience re-export: a pre-wired "Edit coach profile" footer link ───────

export function CoachProfileFooter() {
  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low/50 px-4 py-3">
      <p className="text-[12.5px] text-on-surface-variant">
        Muốn cập nhật hồ sơ công khai (bio, chuyên môn, địa điểm dạy)?{" "}
        <Link
          href="/coach/profile"
          className="font-semibold text-primary hover:underline"
        >
          Chỉnh sửa hồ sơ huấn luyện viên →
        </Link>
      </p>
    </div>
  );
}
