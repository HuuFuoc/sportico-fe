"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getSports } from "@/lib/sports-api";
import { registerCoachAndElevate } from "@/lib/coach-onboarding";
import { messageForApiError } from "@/lib/errors-vi";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { cn } from "@/lib/utils";
import type { SportOption } from "@/lib/types/coach";

const RELOGIN_MESSAGE =
  "Bạn đã đăng ký huấn luyện viên thành công. Vui lòng đăng nhập lại để cập nhật quyền huấn luyện viên.";

const BENEFITS = [
  { icon: Users, title: "Tiếp cận học viên", text: "Hiển thị gói tập tới học viên đang tìm HLV." },
  { icon: Wallet, title: "Thu nhập linh hoạt", text: "Tự định giá gói tập và rút tiền về tài khoản." },
  { icon: TrendingUp, title: "Phát triển thương hiệu", text: "Hồ sơ, media và đánh giá giúp bạn nổi bật." },
];

const NEXT_STEPS = [
  { icon: Users, text: "Học viên có thể tìm thấy và xem hồ sơ của bạn." },
  { icon: Award, text: "Bạn có thể tạo gói tập và đăng tải nội dung." },
  { icon: CalendarDays, text: "Quản lý lịch tập và xác nhận từng buổi." },
  { icon: CheckCircle2, text: "Mọi thông tin đều có thể chỉnh sửa sau." },
];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const user = useAuthStore((s) => s.user);
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

  const selectedSports = (sports ?? []).filter((s) => sportIds.includes(s.id));

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
        setSuccess(true);
        setTimeout(() => router.replace("/coach/profile"), 900);
      } else {
        setError(RELOGIN_MESSAGE);
        setSubmitting(false);
        setTimeout(() => router.replace("/login"), 2600);
      }
    } catch (e) {
      setError(messageForApiError(e));
      setSubmitting(false);
    }
  };

  // Keep initial/animate constant across server + client so the SSR-ed inline
  // styles always match on hydration. `useReducedMotion()` only resolves on the
  // client, so branching the rendered props on it (e.g. returning {}) caused a
  // hydration mismatch for users with "prefers-reduced-motion" enabled. Instead
  // we only shorten the transition to instant — that never touches the HTML.
  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduce
      ? { duration: 0 }
      : { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay },
  });

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* Soft background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      <PublicNavbar variant="solid" />

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6">
        {/* Hero card */}
        <motion.div
          {...fadeUp(0)}
          className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-[#7d6dff]/[0.06] p-6 mb-5"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary shadow-[0_4px_12px_-2px_rgba(53,37,205,0.45)] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary mb-1.5">
                <Clock3 size={12} />
                Mất khoảng 2 phút
              </span>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                Trở thành huấn luyện viên
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 max-w-lg">
                Tạo hồ sơ huấn luyện viên để bắt đầu cung cấp gói tập và nhận học
                viên trên Sportico.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-[12px] border border-slate-200/80 bg-white/70 p-3"
              >
                <b.icon size={16} className="text-primary mb-1.5" />
                <p className="text-[12.5px] font-semibold leading-tight text-slate-800">
                  {b.title}
                </p>
                <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Success banner */}
        {success && (
          <div
            role="status"
            className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700"
          >
            <CheckCircle2 size={17} />
            Đăng ký huấn luyện viên thành công. Đang cập nhật quyền truy cập của bạn…
          </div>
        )}

        {/* 2-column: form (left) + preview/checklist (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
          {/* LEFT — form */}
          <motion.div
            {...fadeUp(0.05)}
            className="rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)] p-6 space-y-5"
          >
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900">
                Thông tin hồ sơ
              </h2>
              <p className="text-[12.5px] text-slate-400 mt-0.5">
                Thông tin này sẽ hiển thị trên hồ sơ huấn luyện viên của bạn.
              </p>
            </div>

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
                className={cn(inputCls, "max-w-[180px] tabular-nums")}
              />
            </Field>

            <Field
              label="Môn thể thao huấn luyện"
              hint="Chọn các môn bạn huấn luyện (có thể bỏ trống và bổ sung sau)."
            >
              {sportsLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-slate-400 py-2">
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
                        aria-pressed={active}
                        onClick={() => toggleSport(s.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-primary/30",
                        )}
                      >
                        {active && <CheckCircle2 size={13} />}
                        {s.name}
                      </button>
                    );
                  })}
                  {(sports ?? []).length === 0 && (
                    <p className="text-[12.5px] text-slate-400 italic">
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
              <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">
                {bio.length} / 2000
              </p>
            </Field>

            {error && (
              <p
                className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-600"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="w-full h-11 rounded-[8px] bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold hover:-translate-y-px hover:shadow-[0_4px_16px_-4px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none inline-flex items-center justify-center gap-2"
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

            <p className="text-[11.5px] text-slate-400 text-center">
              Sau khi đăng ký, hệ thống sẽ tự động cập nhật quyền huấn luyện viên cho bạn.
            </p>
          </motion.div>

          {/* RIGHT — live preview + checklist */}
          <motion.aside
            {...fadeUp(0.1)}
            className="space-y-5 lg:sticky lg:top-20"
          >
            <div>
              <SidebarHeading>Xem trước hồ sơ</SidebarHeading>
              <ProfilePreview
                fullName={user?.fullName ?? ""}
                avatarUrl={user?.avatarUrl ?? null}
                email={user?.email ?? null}
                headline={headline.trim()}
                experienceYears={experienceYears !== "" ? yearsNum : null}
                sports={selectedSports}
                bio={bio.trim()}
              />
            </div>

            <div>
              <SidebarHeading>Sau khi đăng ký</SidebarHeading>
              <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,15,30,0.04)]">
                <ul className="space-y-0.5">
                  {NEXT_STEPS.map((step) => (
                    <li
                      key={step.text}
                      className="flex items-start gap-2.5 py-1.5 text-[12.5px] text-slate-600"
                    >
                      <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                        <step.icon size={11} />
                      </span>
                      <span className="leading-snug">{step.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full h-11 px-4 bg-white border border-slate-200 rounded-[8px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 text-[13.5px] text-slate-800 placeholder:text-slate-400 transition-all";

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
      <label className="block text-[13px] font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-violet-600 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[12px] text-slate-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
      {children}
    </p>
  );
}

function ProfilePreview({
  fullName,
  avatarUrl,
  email,
  headline,
  experienceYears,
  sports,
  bio,
}: {
  fullName: string;
  avatarUrl: string | null;
  email?: string | null;
  headline: string;
  experienceYears: number | null;
  sports: SportOption[];
  bio: string;
}) {
  const bioPreview = bio.length > 120 ? `${bio.slice(0, 120)}…` : bio;

  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_-10px_rgba(0,0,0,0.09)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-br from-primary/[0.06] to-[#7d6dff]/[0.06] px-4 py-4">
        <UserAvatar
          avatarUrl={avatarUrl}
          name={fullName}
          email={email}
          size="lg"
          className="h-11 w-11 text-[15px] shrink-0 ring-2 ring-white"
        />
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[14.5px] font-bold",
              fullName ? "text-slate-900" : "text-slate-400",
            )}
          >
            {fullName || "Tên của bạn"}
          </p>
          <p
            className={cn(
              "truncate text-[12px] font-medium",
              headline ? "text-primary" : "text-slate-400",
            )}
          >
            {headline || "Tiêu đề hồ sơ của bạn"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2.5 px-4 py-4">
        {experienceYears !== null && (
          <PreviewRow icon={<CalendarDays size={14} />}>
            {experienceYears} năm kinh nghiệm
          </PreviewRow>
        )}

        {sports.length > 0 && (
          <PreviewRow icon={<Target size={14} />}>
            <span className="flex flex-wrap gap-1.5">
              {sports.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[11px] font-semibold text-primary"
                >
                  {s.name}
                </span>
              ))}
            </span>
          </PreviewRow>
        )}

        {bioPreview && (
          <PreviewRow icon={<Sparkles size={14} />}>
            <span className="text-[12px] leading-snug text-slate-500">
              {bioPreview}
            </span>
          </PreviewRow>
        )}

        {experienceYears === null && sports.length === 0 && !bioPreview && (
          <p className="text-[12px] italic text-slate-400">
            Điền form để xem trước hồ sơ của bạn tại đây.
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-[12.5px] text-slate-600">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
