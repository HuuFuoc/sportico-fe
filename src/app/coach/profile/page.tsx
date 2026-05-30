"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Globe2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Save,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getMyCoachProfile, updateMyCoachProfile } from "@/lib/coach-api";
import { messageForApiError } from "@/lib/errors-vi";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { UpdateCoachProfileRequest } from "@/lib/types/coach";

const EASE = [0.16, 1, 0.3, 1] as const;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

interface FormState {
  headline: string;
  bio: string;
  experienceYears: string;
  coverImageUrl: string;
  teachingAddress: string;
  teachingCity: string;
  teachingDistrict: string;
  teachingLatitude: string;
  teachingLongitude: string;
  isOnlineAvailable: boolean;
  isOfflineAvailable: boolean;
  specialties: string;
  certificationsSummary: string;
  achievementsSummary: string;
  facebookUrl: string;
  instagramUrl: string;
  websiteUrl: string;
}

const EMPTY: FormState = {
  headline: "",
  bio: "",
  experienceYears: "",
  coverImageUrl: "",
  teachingAddress: "",
  teachingCity: "",
  teachingDistrict: "",
  teachingLatitude: "",
  teachingLongitude: "",
  isOnlineAvailable: false,
  isOfflineAvailable: false,
  specialties: "",
  certificationsSummary: "",
  achievementsSummary: "",
  facebookUrl: "",
  instagramUrl: "",
  websiteUrl: "",
};

export default function CoachProfilePage() {
  const { data: profile, loading, error, refetch } = useApiResource(
    () => getMyCoachProfile(),
    [],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the form from the loaded profile.
  useEffect(() => {
    if (!profile) return;
    setForm({
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      experienceYears:
        profile.experienceYears != null ? String(profile.experienceYears) : "",
      coverImageUrl: profile.coverImageUrl ?? "",
      teachingAddress: profile.teachingAddress ?? "",
      teachingCity: profile.teachingCity ?? "",
      teachingDistrict: profile.teachingDistrict ?? "",
      teachingLatitude:
        profile.teachingLatitude != null ? String(profile.teachingLatitude) : "",
      teachingLongitude:
        profile.teachingLongitude != null
          ? String(profile.teachingLongitude)
          : "",
      isOnlineAvailable: profile.isOnlineAvailable ?? false,
      isOfflineAvailable: profile.isOfflineAvailable ?? false,
      specialties: profile.specialties ?? "",
      certificationsSummary: profile.certificationsSummary ?? "",
      achievementsSummary: profile.achievementsSummary ?? "",
      facebookUrl: profile.facebookUrl ?? "",
      instagramUrl: profile.instagramUrl ?? "",
      websiteUrl: profile.websiteUrl ?? "",
    });
    setDirty(false);
  }, [profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const clientError = useMemo(() => {
    if (form.experienceYears !== "") {
      const n = Number(form.experienceYears);
      if (!Number.isFinite(n) || n < 0 || n > 60)
        return "Số năm kinh nghiệm phải từ 0 đến 60.";
    }
    const urlFields: [string, string][] = [
      [form.coverImageUrl, "Ảnh bìa"],
      [form.facebookUrl, "Facebook"],
      [form.instagramUrl, "Instagram"],
      [form.websiteUrl, "Website"],
    ];
    for (const [val, label] of urlFields) {
      if (val.trim() && !isHttpUrl(val.trim()))
        return `${label} phải là một đường dẫn hợp lệ (bắt đầu bằng http/https).`;
    }
    return null;
  }, [form]);

  const buildPayload = (): UpdateCoachProfileRequest => ({
    headline: form.headline.trim() || undefined,
    bio: form.bio.trim() || undefined,
    experienceYears:
      form.experienceYears === "" ? undefined : Number(form.experienceYears),
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    teachingAddress: form.teachingAddress.trim() || undefined,
    teachingCity: form.teachingCity.trim() || undefined,
    teachingDistrict: form.teachingDistrict.trim() || undefined,
    teachingLatitude:
      form.teachingLatitude === "" ? undefined : Number(form.teachingLatitude),
    teachingLongitude:
      form.teachingLongitude === "" ? undefined : Number(form.teachingLongitude),
    isOnlineAvailable: form.isOnlineAvailable,
    isOfflineAvailable: form.isOfflineAvailable,
    specialties: form.specialties.trim() || undefined,
    certificationsSummary: form.certificationsSummary.trim() || undefined,
    achievementsSummary: form.achievementsSummary.trim() || undefined,
    facebookUrl: form.facebookUrl.trim() || undefined,
    instagramUrl: form.instagramUrl.trim() || undefined,
    websiteUrl: form.websiteUrl.trim() || undefined,
  });

  const onSave = async () => {
    if (clientError) {
      setFormError(clientError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await updateMyCoachProfile(buildPayload());
      setSaved(true);
      setDirty(false);
      refetch(); // re-read GET /api/coaches/me
    } catch (e) {
      setFormError(messageForApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="coach" title="Hồ sơ huấn luyện viên">
        <LoadingState label="Đang tải hồ sơ…" />
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell role="coach" title="Hồ sơ huấn luyện viên">
        <ErrorState
          message={error ? messageForApiError(error) : undefined}
          onRetry={refetch}
          className="mx-auto mt-10 max-w-md"
        />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="Hồ sơ huấn luyện viên">
      <div className="max-w-[860px] mx-auto pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary shrink-0">
            <UserRound size={20} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">
              Hồ sơ huấn luyện viên
            </h1>
            <p className="text-body-sm text-on-surface-variant">
              Thông tin này hiển thị cho học viên đang tìm huấn luyện viên.
            </p>
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              role="status"
              className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-[#bce8c8] bg-success-container/50 px-4 py-3 text-[13px] font-medium text-[#1f7a4d]"
            >
              <CheckCircle2 size={17} />
              Đã cập nhật hồ sơ huấn luyện viên.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          {/* Thông tin chính */}
          <Section icon={UserRound} title="Thông tin chính" delay={0.04}>
            <Field label="Tiêu đề hồ sơ" hint="Một câu mô tả chuyên môn của bạn.">
              <Input
                value={form.headline}
                onChange={(e) => set("headline", e.target.value.slice(0, 200))}
                placeholder="VD: HLV cầu lông cho người mới và bán chuyên"
              />
            </Field>
            <Field label="Số năm kinh nghiệm" hint="0 – 60 năm.">
              <Input
                type="number"
                min={0}
                max={60}
                className="tabular-nums"
                value={form.experienceYears}
                onChange={(e) => set("experienceYears", e.target.value)}
                placeholder="VD: 8"
              />
            </Field>
            <Field label="Ảnh bìa" hint="Đường dẫn ảnh (http/https).">
              <Input
                value={form.coverImageUrl}
                onChange={(e) => set("coverImageUrl", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Giới thiệu">
              <Textarea
                rows={5}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value.slice(0, 3000))}
                placeholder="Phong cách huấn luyện, kinh nghiệm, điểm mạnh…"
              />
            </Field>
          </Section>

          {/* Địa điểm dạy */}
          <Section icon={MapPin} title="Địa điểm dạy" delay={0.08}>
            <Field label="Địa chỉ dạy">
              <Input
                value={form.teachingAddress}
                onChange={(e) => set("teachingAddress", e.target.value)}
                placeholder="VD: 123 Nguyễn Văn Cừ"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Thành phố">
                <Input
                  value={form.teachingCity}
                  onChange={(e) => set("teachingCity", e.target.value)}
                  placeholder="VD: Hà Nội"
                />
              </Field>
              <Field label="Quận/Huyện">
                <Input
                  value={form.teachingDistrict}
                  onChange={(e) => set("teachingDistrict", e.target.value)}
                  placeholder="VD: Long Biên"
                />
              </Field>
              <Field label="Tọa độ vĩ độ" hint="-90 đến 90 (tùy chọn).">
                <Input
                  type="number"
                  className="tabular-nums"
                  value={form.teachingLatitude}
                  onChange={(e) => set("teachingLatitude", e.target.value)}
                  placeholder="VD: 21.0285"
                />
              </Field>
              <Field label="Tọa độ kinh độ" hint="-180 đến 180 (tùy chọn).">
                <Input
                  type="number"
                  className="tabular-nums"
                  value={form.teachingLongitude}
                  onChange={(e) => set("teachingLongitude", e.target.value)}
                  placeholder="VD: 105.8542"
                />
              </Field>
            </div>
          </Section>

          {/* Hình thức dạy */}
          <Section icon={Globe2} title="Hình thức dạy" delay={0.12}>
            <Toggle
              label="Có dạy online"
              description="Học viên có thể đặt buổi học trực tuyến."
              checked={form.isOnlineAvailable}
              onChange={(v) => set("isOnlineAvailable", v)}
            />
            <Toggle
              label="Có dạy trực tiếp"
              description="Học viên có thể đặt buổi học tại địa điểm."
              checked={form.isOfflineAvailable}
              onChange={(v) => set("isOfflineAvailable", v)}
            />
          </Section>

          {/* Chuyên môn / chứng chỉ / thành tích */}
          <Section icon={Sparkles} title="Chuyên môn · Chứng chỉ · Thành tích" delay={0.16}>
            <Field label="Chuyên môn" hint="Ví dụ: kỹ thuật smash, thể lực, chiến thuật.">
              <Textarea
                rows={3}
                value={form.specialties}
                onChange={(e) => set("specialties", e.target.value.slice(0, 1000))}
                placeholder="Liệt kê các thế mạnh của bạn…"
              />
            </Field>
            <Field label="Tóm tắt chứng chỉ">
              <Textarea
                rows={3}
                value={form.certificationsSummary}
                onChange={(e) =>
                  set("certificationsSummary", e.target.value.slice(0, 2000))
                }
                placeholder="VD: Chứng chỉ HLV cấp 1 Liên đoàn…"
              />
            </Field>
            <Field label="Thành tích nổi bật">
              <Textarea
                rows={3}
                value={form.achievementsSummary}
                onChange={(e) =>
                  set("achievementsSummary", e.target.value.slice(0, 2000))
                }
                placeholder="VD: HCV giải phong trào 2023…"
              />
            </Field>
          </Section>

          {/* Liên kết mạng xã hội */}
          <Section icon={Share2} title="Liên kết mạng xã hội" delay={0.2}>
            <Field label="Facebook">
              <Input
                value={form.facebookUrl}
                onChange={(e) => set("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </Field>
            <Field label="Instagram">
              <Input
                value={form.instagramUrl}
                onChange={(e) => set("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/…"
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.websiteUrl}
                onChange={(e) => set("websiteUrl", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </Section>

          {/* Cover preview hint */}
          {form.coverImageUrl.trim() && isHttpUrl(form.coverImageUrl.trim()) && (
            <div className="rounded-[12px] border border-[var(--color-border-soft)] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 text-[11.5px] text-on-surface-variant border-b border-[var(--color-border-soft)]">
                <ImageIcon size={13} /> Xem trước ảnh bìa
              </div>
              <img
                src={form.coverImageUrl.trim()}
                alt="Ảnh bìa"
                className="w-full max-h-48 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-[calc(16rem+1rem)] lg:right-6 z-30">
        <div className="max-w-[860px] mx-auto rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest/95 backdrop-blur-md p-3 pl-4 flex items-center justify-between gap-3 shadow-[0_8px_24px_-6px_rgba(15,15,30,0.15)]">
          <div className="min-w-0 flex items-center gap-2">
            {formError ? (
              <p className="text-[12.5px] font-medium text-rose-600 truncate" role="alert">
                {formError}
              </p>
            ) : (
              <p className="text-[12.5px] text-on-surface-variant truncate">
                {dirty ? "Có thay đổi chưa lưu." : "Cập nhật hồ sơ của bạn."}
              </p>
            )}
          </div>
          <button
            onClick={() => void onSave()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[10px] bg-primary text-on-primary text-[13px] font-semibold transition-colors hover:bg-[#2d20b8] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang lưu…
              </>
            ) : (
              <>
                <Save size={15} />
                Lưu hồ sơ
              </>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ---- primitives ------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
  delay,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 flex items-center justify-center text-primary">
          <Icon size={16} />
        </div>
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.section>
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
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-on-surface">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-on-surface-variant">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const fieldCls =
  "w-full px-3.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] transition-colors";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, "h-11", props.className)} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(fieldCls, "py-2.5 leading-relaxed resize-none", props.className)}
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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low/50 px-4 py-3 text-left transition-colors hover:border-primary/30"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-on-surface">
          {label}
        </span>
        {description && (
          <span className="block text-[11.5px] text-on-surface-variant mt-0.5">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-container-high",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
