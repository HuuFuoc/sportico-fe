"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getSports } from "@/lib/sports-api";
import { registerCoachAndElevate } from "@/lib/coach-onboarding";
import { messageForApiError } from "@/lib/errors-vi";
import { cn } from "@/lib/utils";

const RELOGIN_MESSAGE =
  "Bạn đã đăng ký huấn luyện viên thành công. Vui lòng đăng nhập lại để cập nhật quyền huấn luyện viên.";

const BENEFITS = [
  { icon: Users, title: "Tiếp cận học viên", text: "Hiển thị gói tập tới học viên đang tìm HLV." },
  { icon: Wallet, title: "Thu nhập linh hoạt", text: "Tự định giá gói tập và rút tiền về tài khoản." },
  { icon: TrendingUp, title: "Phát triển thương hiệu", text: "Hồ sơ, media và đánh giá giúp bạn nổi bật." },
];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const { data: sports, loading: sportsLoading } = useApiResource(
    () => getSports(),
    [],
  );

  const [headline, setHeadline] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [sportIds, setSportIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headlineValid = headline.trim().length >= 5;
  const yearsNum = Number(experienceYears);
  const yearsValid = experienceYears !== "" && yearsNum >= 0 && yearsNum <= 60;
  const canSubmit = headlineValid && yearsValid && !submitting && !success;

  const toggleSport = (id: number) => {
    setSportIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await registerCoachAndElevate({
        headline: headline.trim(),
        bio: bio.trim() || undefined,
        experienceYears: yearsNum,
        sportIds,
      });

      if (outcome.ok) {
        // Coach role confirmed via refresh + /api/auth/me — proceed.
        setSuccess(true);
        setTimeout(() => router.replace("/coach/profile"), 900);
      } else {
        // Registered but role not effective this session → force re-login.
        setError(RELOGIN_MESSAGE);
        setSubmitting(false);
        setTimeout(() => router.replace("/login"), 2600);
      }
    } catch (e) {
      setError(messageForApiError(e));
      setSubmitting(false);
    }
  };

  return (
    <AppShell role="learner" title="Trở thành huấn luyện viên">
      <div className="max-w-[680px] mx-auto pb-10">
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
                viên trên Sportico.
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest/70 p-3"
              >
                <b.icon size={16} className="text-primary mb-1.5" />
                <p className="text-[12.5px] font-semibold leading-tight">
                  {b.title}
                </p>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-snug">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div
            role="status"
            className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-[#bce8c8] bg-success-container/50 px-4 py-3 text-[13px] font-medium text-[#1f7a4d]"
          >
            <CheckCircle2 size={17} />
            Đăng ký huấn luyện viên thành công. Đang cập nhật quyền truy cập của
            bạn…
          </div>
        )}

        {/* Form */}
        <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 space-y-5">
          <Field
            label="Tiêu đề hồ sơ"
            required
            hint="Một câu mô tả chuyên môn của bạn (tối thiểu 5 ký tự)."
          >
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value.slice(0, 255))}
              placeholder="VD: HLV cầu lông cho người mới và bán chuyên"
              className={inputCls}
            />
          </Field>

          <Field label="Số năm kinh nghiệm" required hint="0 – 60 năm.">
            <input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="VD: 8"
              className={cn(inputCls, "tabular-nums")}
            />
          </Field>

          <Field
            label="Môn thể thao huấn luyện"
            hint="Chọn các môn bạn huấn luyện (có thể bỏ trống và bổ sung sau)."
          >
            {sportsLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-on-surface-variant py-2">
                <Loader2 size={15} className="animate-spin" />
                Đang tải danh sách môn thể thao…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(sports ?? []).map((s) => {
                  const active = sportIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSport(s.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12.5px] font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-[var(--color-border-soft)] bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:border-primary/30",
                      )}
                    >
                      {active && <CheckCircle2 size={13} />}
                      {s.name}
                    </button>
                  );
                })}
                {(sports ?? []).length === 0 && (
                  <p className="text-[12.5px] text-on-surface-variant italic">
                    Chưa có dữ liệu môn thể thao.
                  </p>
                )}
              </div>
            )}
          </Field>

          <Field label="Giới thiệu" hint="Tùy chọn — tối đa 2000 ký tự.">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Phong cách huấn luyện, thành tích, vì sao học viên nên chọn bạn…"
              className={cn(inputCls, "h-auto py-3 leading-relaxed resize-none")}
            />
          </Field>

          {error && (
            <p
              className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="w-full h-11 rounded-[8px] bg-primary text-on-primary font-medium hover:bg-[#2d20b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting || success ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {success ? "Đang chuyển hướng…" : "Đang tạo hồ sơ…"}
              </>
            ) : (
              <>
                <Award size={16} />
                Đăng ký làm huấn luyện viên
              </>
            )}
          </button>
          <p className="text-[11.5px] text-on-surface-variant text-center">
            Sau khi đăng ký, hệ thống sẽ tự động cập nhật quyền huấn luyện viên
            cho bạn.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full h-11 px-4 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-body-base transition-colors";

function Field({
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
      <label className="block text-body-base font-medium text-on-surface mb-1">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-body-sm text-on-surface-variant mb-2">{hint}</p>
      )}
      {children}
    </div>
  );
}
