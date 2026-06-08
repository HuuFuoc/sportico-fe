"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Globe2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Move,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getMyCoachProfile, updateMyCoachProfile } from "@/lib/coach-api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess, showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { ImageUpload } from "@/components/common/ImageUpload";
import type { UpdateCoachProfileRequest } from "@/lib/types/coach";

const EASE = [0.16, 1, 0.3, 1] as const;

// Vietnam Provinces 2025 API (post-reform: province → ward, no district level)
const VN_PROVINCES_API = "https://provinces.open-api.vn/api";

interface VnProvince {
  code: number;
  name: string;
  division_type: string;
}

interface VnWard {
  code: number;
  name: string;
  division_type: string;
  province_code: number;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

interface CoverPosition {
  x: number; // 0-100  (objectPosition X %)
  y: number; // 0-100  (objectPosition Y %)
}

const DEFAULT_COVER_POS: CoverPosition = { x: 50, y: 50 };

const COVER_POS_KEY = (id: string | number) => `sportico_cover_pos_${id}`;
const AVATAR_POS_KEY = (id: string | number) => `sportico_avatar_pos_${id}`;

function loadPos(key: string): CoverPosition {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_COVER_POS;
    const p = JSON.parse(raw) as CoverPosition;
    if (typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return DEFAULT_COVER_POS;
}

function savePos(key: string, pos: CoverPosition) {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {}
}

const loadCoverPos = (id: string | number) => loadPos(COVER_POS_KEY(id));
const saveCoverPos = (id: string | number, pos: CoverPosition) => savePos(COVER_POS_KEY(id), pos);
const loadAvatarPos = (id: string | number) => loadPos(AVATAR_POS_KEY(id));
const saveAvatarPos = (id: string | number, pos: CoverPosition) => savePos(AVATAR_POS_KEY(id), pos);

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
  const authUser = useAuthStore((s) => s.user);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverPos, setCoverPos] = useState<CoverPosition>(DEFAULT_COVER_POS);
  const [avatarPos, setAvatarPos] = useState<CoverPosition>(DEFAULT_COVER_POS);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  // Seed the form from the loaded profile.
  useEffect(() => {
    if (!profile) return;
    setCoverPos(loadCoverPos(profile.userId));
    setAvatarPos(loadAvatarPos(profile.userId));
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
    setProvinceCode(null);
  }, [profile]);

  useEffect(() => {
    setProvincesLoading(true);
    fetch(`${VN_PROVINCES_API}/p/`)
      .then((r) => r.json() as Promise<VnProvince[]>)
      .then(setProvinces)
      .catch(() => {})
      .finally(() => setProvincesLoading(false));
  }, []);

  useEffect(() => {
    if (provinceCode === null) { setWards([]); return; }
    setWardsLoading(true);
    setWards([]);
    fetch(`${VN_PROVINCES_API}/w/?province=${provinceCode}`)
      .then((r) => r.json() as Promise<VnWard[]>)
      .then(setWards)
      .catch(() => {})
      .finally(() => setWardsLoading(false));
  }, [provinceCode]);

  // When provinces load, try to match the stored teachingCity → province code
  // so the ward dropdown works even on an already-saved profile.
  useEffect(() => {
    if (!form.teachingCity || provinces.length === 0 || provinceCode !== null) return;
    const normalize = (s: string) =>
      s.replace(/^(Thành phố |Tỉnh )/i, "").trim().toLowerCase();
    const needle = normalize(form.teachingCity);
    const match =
      provinces.find((p) => p.name === form.teachingCity) ??
      provinces.find((p) => normalize(p.name) === needle) ??
      provinces.find((p) => normalize(p.name).includes(needle) || needle.includes(normalize(p.name)));
    if (match) setProvinceCode(match.code);
  }, [form.teachingCity, provinces, provinceCode]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const profileUserId = profile?.userId;

  const handleCoverPosChange = useCallback((pos: CoverPosition) => {
    setCoverPos(pos);
    if (profileUserId) saveCoverPos(profileUserId, pos);
  }, [profileUserId]);

  const resetCoverPos = () => handleCoverPosChange(DEFAULT_COVER_POS);

  const handleAvatarPosChange = useCallback((pos: CoverPosition) => {
    setAvatarPos(pos);
    if (profileUserId) saveAvatarPos(profileUserId, pos);
  }, [profileUserId]);

  const resetAvatarPos = () => handleAvatarPosChange(DEFAULT_COVER_POS);

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
      showSuccess("Đã cập nhật hồ sơ huấn luyện viên.");
      setDirty(false);
      refetch();
    } catch (e) {
      showApiError(e);
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
            <Field label="Ảnh bìa" hint="Tải ảnh từ máy của bạn.">
              <ImageUpload
                variant="cover"
                value={form.coverImageUrl}
                folder="coaches/covers"
                allowRemove
                placeholder="Kéo thả ảnh bìa hoặc bấm để chọn"
                onChange={(url) => set("coverImageUrl", url)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tỉnh / Thành phố">
                <SearchableSelect
                  options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                  value={form.teachingCity}
                  loading={provincesLoading}
                  placeholder="Chọn tỉnh / thành phố"
                  onChange={(label, code) => {
                    set("teachingCity", label);
                    setProvinceCode(code as number);
                    set("teachingDistrict", "");
                    setWards([]);
                  }}
                />
              </Field>
              <Field label="Phường / Xã">
                <SearchableSelect
                  options={wards.map((w) => ({ label: w.name, value: w.code }))}
                  value={form.teachingDistrict}
                  loading={wardsLoading}
                  disabled={provinceCode === null && !form.teachingDistrict}
                  placeholder={provinceCode === null ? "Chọn tỉnh/thành trước" : "Chọn phường / xã"}
                  onChange={(label) => set("teachingDistrict", label)}
                />
              </Field>
            </div>
            <Field label="Địa chỉ cụ thể" hint="Số nhà, tên đường…">
              <Input
                value={form.teachingAddress}
                onChange={(e) => set("teachingAddress", e.target.value)}
                placeholder="VD: 123 Nguyễn Văn Cừ"
              />
            </Field>
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

          {/* Avatar repositioner — only shown when user has an avatar */}
          {authUser?.avatarUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="rounded-[16px] border border-[var(--color-border-soft)] overflow-hidden bg-surface-container-lowest"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-soft)]">
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <UserRound size={13} />
                  <span>Căn chỉnh ảnh đại diện</span>
                  <span className="text-[11px] text-on-surface-variant/60">
                    · Kéo để đặt điểm lấy nét
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetAvatarPos}
                  title="Đặt lại về giữa"
                  className="flex items-center gap-1 text-[11px] text-on-surface-variant/70 hover:text-on-surface transition-colors"
                >
                  <RotateCcw size={11} />
                  Đặt lại
                </button>
              </div>
              <AvatarRepositioner
                src={authUser.avatarUrl}
                position={avatarPos}
                onPositionChange={handleAvatarPosChange}
              />
              <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] text-on-surface-variant/60 border-t border-[var(--color-border-soft)]">
                <Move size={10} />
                Vị trí: {Math.round(avatarPos.x)}% ngang · {Math.round(avatarPos.y)}% dọc
                <span className="ml-auto text-[10px]">Lưu tự động trong trình duyệt</span>
              </div>
            </motion.div>
          )}

          {/* Cover preview with drag-to-reposition */}
          {form.coverImageUrl.trim() && isHttpUrl(form.coverImageUrl.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="rounded-[16px] border border-[var(--color-border-soft)] overflow-hidden bg-surface-container-lowest"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-soft)]">
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                  <ImageIcon size={13} />
                  <span>Xem trước ảnh bìa</span>
                  <span className="text-[11px] text-on-surface-variant/60">
                    · Kéo để căn chỉnh vị trí hiển thị
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetCoverPos}
                  title="Đặt lại về giữa"
                  className="flex items-center gap-1 text-[11px] text-on-surface-variant/70 hover:text-on-surface transition-colors"
                >
                  <RotateCcw size={11} />
                  Đặt lại
                </button>
              </div>
              <CoverImageRepositioner
                src={form.coverImageUrl.trim()}
                position={coverPos}
                onPositionChange={handleCoverPosChange}
              />
              <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] text-on-surface-variant/60 border-t border-[var(--color-border-soft)]">
                <Move size={10} />
                Vị trí: {Math.round(coverPos.x)}% ngang · {Math.round(coverPos.y)}% dọc
                <span className="ml-auto text-[10px]">Lưu tự động trong trình duyệt</span>
              </div>
            </motion.div>
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

// ---- CoverImageRepositioner -------------------------------------------------
// Lets the coach drag to set the focal point of their cover image.
// The position is stored as CSS objectPosition percentages (0-100 each axis).
// Wherever the pointer is within the container becomes the new focal center.

function CoverImageRepositioner({
  src,
  position,
  onPositionChange,
}: {
  src: string;
  position: CoverPosition;
  onPositionChange: (pos: CoverPosition) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [active, setActive] = useState(false);
  const [hinted, setHinted] = useState(false);

  const toPercent = useCallback(
    (clientX: number, clientY: number): CoverPosition => {
      if (!containerRef.current) return position;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
      return { x, y };
    },
    [position],
  );

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setActive(true);
    setHinted(true);
    onPositionChange(toPercent(e.clientX, e.clientY));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      onPositionChange(toPercent(e.clientX, e.clientY));
    };
    const onUp = () => {
      isDragging.current = false;
      setActive(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onPositionChange, toPercent]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    setActive(true);
    setHinted(true);
    const t = e.touches[0];
    onPositionChange(toPercent(t.clientX, t.clientY));
  };

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const t = e.touches[0];
      onPositionChange(toPercent(t.clientX, t.clientY));
    };
    const onEnd = () => {
      isDragging.current = false;
      setActive(false);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onPositionChange, toPercent]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-64 sm:h-80 select-none overflow-hidden group",
        active ? "cursor-grabbing" : "cursor-grab",
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* The cover image */}
      <img
        src={src}
        alt="Ảnh bìa"
        draggable={false}
        className="w-full h-full object-cover pointer-events-none transition-[object-position] duration-75"
        style={{ objectPosition: `${position.x}% ${position.y}%` }}
      />

      {/* Focal point crosshair */}
      <div
        className="absolute w-8 h-8 pointer-events-none transition-[left,top] duration-75"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] scale-75 group-hover:scale-100 transition-transform duration-200" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2 shadow-[1px_0_2px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Drag hint overlay — fades after first interaction */}
      <AnimatePresence>
        {!hinted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-black/50 text-white text-[12px] font-medium px-4 py-2 rounded-full backdrop-blur-sm shadow-lg">
              <Move size={13} />
              Nhấn và kéo để căn chỉnh ảnh
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active drag indicator */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 ring-2 ring-primary/60 ring-inset pointer-events-none rounded-[0px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- AvatarRepositioner -------------------------------------------------------
// Lets the coach set the focal point of their avatar (circular crop).
// Same drag mechanics as CoverImageRepositioner; uses an SVG spotlight overlay
// to show the final circular crop area.

function AvatarRepositioner({
  src,
  position,
  onPositionChange,
}: {
  src: string;
  position: CoverPosition;
  onPositionChange: (pos: CoverPosition) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [active, setActive] = useState(false);
  const [hinted, setHinted] = useState(false);

  const toPercent = useCallback(
    (clientX: number, clientY: number): CoverPosition => {
      if (!containerRef.current) return position;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
      return { x, y };
    },
    [position],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setActive(true);
    setHinted(true);
    onPositionChange(toPercent(e.clientX, e.clientY));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      onPositionChange(toPercent(e.clientX, e.clientY));
    };
    const onUp = () => {
      isDragging.current = false;
      setActive(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onPositionChange, toPercent]);

  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    setActive(true);
    setHinted(true);
    const t = e.touches[0];
    onPositionChange(toPercent(t.clientX, t.clientY));
  };

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const t = e.touches[0];
      onPositionChange(toPercent(t.clientX, t.clientY));
    };
    const onEnd = () => {
      isDragging.current = false;
      setActive(false);
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onPositionChange, toPercent]);

  return (
    <div className="flex justify-center py-6 bg-surface-container-low/40">
      <div
        ref={containerRef}
        className={cn(
          "relative w-52 h-52 select-none overflow-hidden group rounded-full",
          active ? "cursor-grabbing" : "cursor-grab",
        )}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Avatar image */}
        <img
          src={src}
          alt="Ảnh đại diện"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none transition-[object-position] duration-75"
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
        />

        {/* Focal point crosshair */}
        <div
          className="absolute w-7 h-7 pointer-events-none transition-[left,top] duration-75"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] scale-75 group-hover:scale-100 transition-transform duration-200" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2 shadow-[1px_0_2px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Drag hint overlay */}
        <AnimatePresence>
          {!hinted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="flex items-center gap-2 bg-black/55 text-white text-[11px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
                <Move size={12} />
                Kéo để căn chỉnh
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active ring */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 ring-2 ring-primary/70 ring-inset pointer-events-none rounded-full"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---- SearchableSelect -------------------------------------------------------

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  loading,
  disabled,
}: {
  options: { label: string; value: string | number }[];
  value: string;
  onChange: (label: string, rawValue: string | number) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (disabled || loading) return;
    setOpen((v) => !v);
    if (open) setSearch("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          fieldCls,
          "h-11 flex items-center justify-between gap-2 text-left",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-primary",
          !value && "text-on-surface-variant/60",
        )}
      >
        <span className="truncate flex-1 min-w-0">
          {loading ? "Đang tải…" : value || placeholder || "Chọn…"}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-on-surface-variant transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] shadow-[0_8px_24px_-6px_rgba(15,15,30,0.18)] overflow-hidden"
          >
            <div className="p-2 border-b border-[var(--color-border-soft)]">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm…"
                className="w-full px-3 h-8 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] outline-none focus:border-primary text-[13px] transition-colors"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-on-surface-variant">
                  Không tìm thấy kết quả
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.label, opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full px-3.5 py-2.5 text-left text-[13.5px] transition-colors hover:bg-surface-container-low",
                      opt.label === value &&
                        "text-primary font-medium bg-primary/5",
                    )}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
