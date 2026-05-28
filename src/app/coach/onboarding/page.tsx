"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { registerCoachProfile } from "@/lib/auth-api";

export default function CoachOnboardingPage() {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headlineValid = headline.trim().length >= 5;
  const yearsNum = Number(experienceYears);
  const yearsValid =
    experienceYears !== "" && yearsNum >= 0 && yearsNum <= 60;
  const canSubmit = headlineValid && yearsValid && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await registerCoachProfile({
        headline: headline.trim(),
        bio: bio.trim() || undefined,
        experienceYears: yearsNum,
        sportIds: [],
      });
      router.push("/coach/dashboard");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Đăng ký huấn luyện viên thất bại. Vui lòng thử lại.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AppShell role="learner" title="Trở thành huấn luyện viên">
      <div className="max-w-[640px] mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-[#7d6dff]/[0.06] p-6 mb-5">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight">
                Trở thành huấn luyện viên
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Tạo hồ sơ huấn luyện viên để bắt đầu cung cấp gói tập và nhận học
                viên.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 space-y-5">
          <Field
            label="Tiêu đề hồ sơ"
            hint="Một câu mô tả chuyên môn của bạn (tối thiểu 5 ký tự)."
          >
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, 255))}
              placeholder="VD: HLV tennis cho người chơi nghiệp dư tham vọng"
              className="w-full h-11 px-4 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-base transition-colors"
            />
          </Field>

          <Field label="Số năm kinh nghiệm" hint="0 – 60 năm.">
            <input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="VD: 8"
              className="w-full h-11 px-4 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-base tabular-nums transition-colors"
            />
          </Field>

          <Field label="Giới thiệu (tùy chọn)">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Phong cách huấn luyện, thành tích, vì sao học viên nên chọn bạn…"
              className="w-full px-4 py-3 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-base leading-relaxed resize-none transition-colors"
            />
          </Field>

          {error && (
            <p className="text-body-sm text-[#ba1a1a]" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="w-full h-11 rounded-[8px] bg-primary text-on-primary font-medium hover:bg-[#2d20b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang tạo hồ sơ…
              </>
            ) : (
              <>
                <Award size={16} />
                Tạo hồ sơ huấn luyện viên
              </>
            )}
          </button>
        </div>
      </div>
    </AppShell>
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
