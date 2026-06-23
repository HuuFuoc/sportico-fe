"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Move,
  Pencil,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getMyCoachProfile, getMyCoachMedia, updateMyCoachProfile } from "@/lib/coach-api";
import { getMyTrainingPackages } from "@/lib/training-package-api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess, showApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { parseFocal, stripFocal, withFocal, focalToCss } from "@/lib/image-focal";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { ImageUpload } from "@/components/common/ImageUpload";
import { CoachMediaManager } from "@/components/coach/CoachMediaManager";
import {
  CoachPublicProfilePreview,
  type CoachPreviewData,
} from "@/components/coach/CoachPublicProfilePreview";
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

// The cover focal point is persisted by encoding it into the coverImageUrl as a
// `#pos=x,y` fragment (see lib/image-focal.ts). This is what makes the chosen
// crop show up identically on the public profile and preview, for every viewer.

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
  // useSearchParams() needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <AppShell role="coach" title="Hồ sơ huấn luyện viên">
          <LoadingState label="Đang tải hồ sơ…" />
        </AppShell>
      }
    >
      <CoachProfilePageInner />
    </Suspense>
  );
}

function CoachProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL is the source of truth for the active tab (so reload + back/forward work);
  // any value other than "preview" falls back to the edit tab.
  const tab = searchParams.get("tab") === "preview" ? "preview" : "edit";
  const goTab = useCallback(
    (next: "edit" | "preview") => {
      router.replace(
        next === "preview" ? "/coach/profile?tab=preview" : "/coach/profile",
        { scroll: false },
      );
    },
    [router],
  );

  const authUser = useAuthStore((s) => s.user);

  const { data: profile, loading, error, refetch } = useApiResource(
    () => getMyCoachProfile(),
    [],
  );

  // Training packages — shown in the public preview tab (read-only).
  const { data: pkgResult, loading: pkgLoading } = useApiResource(
    () => getMyTrainingPackages({ pageSize: 12 }),
    [],
  );
  const packages = pkgResult?.items ?? [];

  // Media list is fetched here too (read-only) purely to drive the completion
  // checklist; CoachMediaManager keeps its own copy and calls onChanged so this
  // stays in sync after add/delete.
  const { data: mediaList, refetch: refetchMedia } = useApiResource(
    () => getMyCoachMedia(),
    [],
  );
  const hasMedia = (mediaList?.length ?? 0) > 0;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverPos, setCoverPos] = useState<CoverPosition>(DEFAULT_COVER_POS);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  // Seed the form from the loaded profile.
  useEffect(() => {
    if (!profile) return;
    setCoverPos(parseFocal(profile.coverImageUrl));
    setForm({
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      experienceYears:
        profile.experienceYears != null ? String(profile.experienceYears) : "",
      coverImageUrl: stripFocal(profile.coverImageUrl),
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

  // Adjusting the focal point dirties the form; it's persisted into
  // coverImageUrl on save (no per-browser localStorage anymore).
  const handleCoverPosChange = useCallback((pos: CoverPosition) => {
    setCoverPos(pos);
    setDirty(true);
  }, []);

  const resetCoverPos = () => handleCoverPosChange(DEFAULT_COVER_POS);

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

  // Profile completion — frontend-only estimate for UX (no backend call).
  const completion = useMemo(() => {
    const checks = [
      {
        key: "main",
        label: "Thông tin chính",
        hint: "Tiêu đề & giới thiệu",
        done: !!form.headline.trim() && !!form.bio.trim(),
        weight: 35,
      },
      {
        key: "location",
        label: "Địa điểm dạy",
        hint: "Tỉnh/thành & địa chỉ",
        done: !!(form.teachingCity.trim() || form.teachingAddress.trim()),
        weight: 25,
      },
      {
        key: "expertise",
        label: "Chuyên môn & thành tích",
        hint: "Chuyên môn, chứng chỉ, thành tích",
        done: !!(
          form.specialties.trim() ||
          form.certificationsSummary.trim() ||
          form.achievementsSummary.trim()
        ),
        weight: 25,
      },
      {
        key: "media",
        label: "Bộ sưu tập media",
        hint: "Chứng chỉ, giải thưởng, hình ảnh",
        done: hasMedia,
        weight: 15,
      },
    ];
    const percent = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
    return { percent, checks };
  }, [form, hasMedia]);

  // Live preview data — built from the current form so the public-view tab shows
  // unsaved changes too. Rating/reviews are read-only server values.
  const previewProfile: CoachPreviewData = useMemo(
    () => ({
      coverImageUrl: form.coverImageUrl.trim()
        ? withFocal(form.coverImageUrl.trim(), coverPos)
        : null,
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      experienceYears:
        form.experienceYears === "" ? null : Number(form.experienceYears),
      rating: profile?.rating ?? 0,
      totalReviews: profile?.totalReviews ?? 0,
      // Teaching mode is fixed to in-person (offline).
      isOnlineAvailable: false,
      isOfflineAvailable: true,
      teachingCity: form.teachingCity.trim() || null,
      teachingDistrict: form.teachingDistrict.trim() || null,
      teachingAddress: form.teachingAddress.trim() || null,
      specialties: form.specialties.trim() || null,
      certificationsSummary: form.certificationsSummary.trim() || null,
      achievementsSummary: form.achievementsSummary.trim() || null,
      facebookUrl: form.facebookUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null,
    }),
    [form, coverPos, profile],
  );

  const buildPayload = (): UpdateCoachProfileRequest => ({
    headline: form.headline.trim() || undefined,
    bio: form.bio.trim() || undefined,
    experienceYears:
      form.experienceYears === "" ? undefined : Number(form.experienceYears),
    coverImageUrl: form.coverImageUrl.trim()
      ? withFocal(form.coverImageUrl.trim(), coverPos)
      : undefined,
    teachingAddress: form.teachingAddress.trim() || undefined,
    teachingCity: form.teachingCity.trim() || undefined,
    teachingDistrict: form.teachingDistrict.trim() || undefined,
    teachingLatitude:
      form.teachingLatitude === "" ? undefined : Number(form.teachingLatitude),
    teachingLongitude:
      form.teachingLongitude === "" ? undefined : Number(form.teachingLongitude),
    // Teaching mode is fixed to in-person (offline) — no online option.
    isOnlineAvailable: false,
    isOfflineAvailable: true,
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
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 xl:pb-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary shrink-0 shadow-[0_6px_18px_-6px_rgba(53,37,205,0.5)]">
              <UserRound size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight leading-tight">
                  Hồ sơ huấn luyện viên
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-container/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#1f7a4d]">
                  <Eye size={11} />
                  Hiển thị với học viên
                </span>
              </div>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-on-surface-variant">
                Cập nhật thông tin để học viên hiểu rõ chuyên môn, địa điểm dạy
                và thành tích của bạn.
              </p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0">
            {tab === "edit" ? (
              <button
                type="button"
                onClick={() => goTab("preview")}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <Eye size={15} />
                <span className="hidden sm:inline">Xem trước công khai</span>
                <span className="sm:hidden">Xem trước</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTab("edit")}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <Pencil size={15} />
                <span className="hidden sm:inline">Tiếp tục chỉnh sửa</span>
                <span className="sm:hidden">Chỉnh sửa</span>
              </button>
            )}
            <button
              onClick={() => void onSave()}
              disabled={saving || !dirty}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-5 text-[13px] font-semibold text-on-primary shadow-[0_6px_18px_-6px_rgba(53,37,205,0.5)] transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Đang lưu…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 inline-flex rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low p-1">
          <TabButton active={tab === "edit"} icon={Pencil} onClick={() => goTab("edit")}>
            Chỉnh sửa hồ sơ
          </TabButton>
          <TabButton
            active={tab === "preview"}
            icon={Eye}
            onClick={() => goTab("preview")}
          >
            Xem trước công khai
          </TabButton>
        </div>

        {/* ── Edit tab: 2-column form + sticky helper panel ───────────── */}
        {tab === "edit" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Left: form ─────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-6">
          {/* Thông tin chính */}
          <Section
            icon={UserRound}
            title="Thông tin chính"
            description="Tiêu đề, kinh nghiệm và ảnh bìa hiển thị nổi bật trên hồ sơ."
            delay={0.04}
          >
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
            <Field label="Ảnh bìa" hint="Hiển thị ở đầu trang hồ sơ công khai.">
              <ImageUpload
                variant="cover"
                value={form.coverImageUrl}
                folder="coaches/covers"
                allowRemove
                objectPosition={focalToCss(coverPos)}
                placeholder="Kéo thả hoặc bấm để tải ảnh bìa"
                onChange={(url) => {
                  // A freshly uploaded image starts centered; the coach can then
                  // drag below to set a new focal point.
                  set("coverImageUrl", url);
                  setCoverPos(DEFAULT_COVER_POS);
                }}
              />
              {form.coverImageUrl.trim() && isHttpUrl(form.coverImageUrl.trim()) && (
                <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-3.5 py-2">
                    <span className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                      <Move size={12} />
                      Căn chỉnh vị trí hiển thị
                    </span>
                    <button
                      type="button"
                      onClick={resetCoverPos}
                      title="Đặt lại về giữa"
                      className="flex items-center gap-1 text-[11px] text-on-surface-variant/70 transition-colors hover:text-on-surface"
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
                  <div className="border-t border-[var(--color-border-soft)] px-3.5 py-2 text-[11px] text-on-surface-variant/70">
                    Vị trí: {Math.round(coverPos.x)}% ngang · {Math.round(coverPos.y)}% dọc
                    <span className="ml-1 text-on-surface-variant/50">· áp dụng sau khi lưu</span>
                  </div>
                </div>
              )}
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
          <Section
            icon={MapPin}
            title="Địa điểm dạy"
            description="Nơi bạn nhận dạy trực tiếp, giúp học viên gần bạn dễ tìm hơn."
            delay={0.08}
          >
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

          {/* Chuyên môn / chứng chỉ / thành tích */}
          <Section
            icon={Sparkles}
            title="Chuyên môn · Chứng chỉ · Thành tích"
            description="Những thông tin tạo niềm tin và giúp bạn nổi bật với học viên."
            delay={0.16}
          >
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
          <Section
            icon={Share2}
            title="Liên kết mạng xã hội"
            description="Tùy chọn — giúp học viên tìm hiểu thêm về bạn."
            delay={0.2}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
            <Field label="Website">
              <Input
                value={form.websiteUrl}
                onChange={(e) => set("websiteUrl", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </Section>

          {/* Bộ sưu tập media — gộp từ trang /coach/media cũ */}
          <CoachMediaManager delay={0.05} onChanged={refetchMedia} />
          </div>

          {/* ── Right: sticky completion panel ─────────────────────────── */}
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <ProfileCompletionPanel
                percent={completion.percent}
                checks={completion.checks}
                coverUrl={
                  form.coverImageUrl.trim() && isHttpUrl(form.coverImageUrl.trim())
                    ? form.coverImageUrl.trim()
                    : null
                }
                coverPos={coverPos}
                dirty={dirty}
                saving={saving}
                formError={formError}
                onSave={onSave}
                onPreview={() => goTab("preview")}
              />
            </div>
          </aside>
        </div>
        )}

        {/* ── Preview tab: public-facing view (reflects unsaved changes) ── */}
        {tab === "preview" && (
          <div>
            <div className="mb-5 flex flex-col gap-3 rounded-[14px] border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-on-primary">
                  <Eye size={11} />
                  Bản xem trước
                </span>
                <p className="text-[12.5px] leading-relaxed text-on-surface-variant">
                  Bản xem trước này có thể bao gồm các thay đổi chưa lưu.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTab("edit")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  <Pencil size={14} />
                  Tiếp tục chỉnh sửa
                </button>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Đang lưu…
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <CoachPublicProfilePreview
              profile={previewProfile}
              media={mediaList ?? []}
              packages={packages}
              packagesLoading={pkgLoading}
              displayName={authUser?.fullName?.trim() || "Huấn luyện viên"}
              avatarUrl={authUser?.avatarUrl ?? null}
              email={authUser?.email ?? null}
              isPreview
            />
          </div>
        )}
      </div>

      {/* Mobile / tablet sticky save bar — only on the edit tab */}
      {tab === "edit" && (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border-soft)] bg-surface-container-lowest/95 px-4 py-3 backdrop-blur-md lg:left-64 xl:hidden">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3">
          <p
            className={cn(
              "min-w-0 truncate text-[12.5px]",
              formError ? "font-medium text-rose-600" : "text-on-surface-variant",
            )}
            role={formError ? "alert" : undefined}
          >
            {formError ?? (dirty ? "Có thay đổi chưa lưu." : "Hồ sơ đã được lưu.")}
          </p>
          <button
            onClick={() => void onSave()}
            disabled={saving || !dirty}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-primary px-5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang lưu…
              </>
            ) : (
              <>
                <Save size={15} />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
      )}
    </AppShell>
  );
}

// ---- primitives ------------------------------------------------------------

function TabButton({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: typeof Eye;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors",
        active
          ? "bg-surface-container-lowest text-primary shadow-[0_1px_2px_rgba(15,15,30,0.08)]"
          : "text-on-surface-variant hover:text-on-surface",
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  delay,
}: {
  icon: typeof UserRound;
  title: string;
  description?: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)] sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/15 bg-gradient-to-br from-primary/10 to-primary/[0.04] text-primary">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
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
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-[13.5px] font-semibold text-on-surface">
          {label}
        </label>
        {hint && (
          <span className="text-[11.5px] text-on-surface-variant">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const fieldCls =
  "w-full px-3.5 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 text-[14px] transition-[border-color,box-shadow] placeholder:text-on-surface-variant/50";

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
        "relative w-full aspect-[16/9] max-h-56 select-none overflow-hidden group",
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

// ---- ProfileCompletionPanel (right sticky) ---------------------------------

interface CompletionCheck {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  weight: number;
}

function ProfileCompletionPanel({
  percent,
  checks,
  coverUrl,
  coverPos,
  dirty,
  saving,
  formError,
  onSave,
  onPreview,
}: {
  percent: number;
  checks: CompletionCheck[];
  coverUrl: string | null;
  coverPos: CoverPosition;
  dirty: boolean;
  saving: boolean;
  formError: string | null;
  onSave: () => void;
  onPreview: () => void;
}) {
  const complete = percent >= 100;
  return (
    <>
      <div className="rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]">
        {/* Mini cover preview */}
        <div className="mb-4 aspect-[16/9] overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low">
          {coverUrl ? (
            <img
              src={stripFocal(coverUrl)}
              alt="Ảnh bìa hồ sơ"
              className="h-full w-full object-cover"
              style={{ objectPosition: focalToCss(coverPos) }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant/40">
              <ImageIcon size={22} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-on-surface">
            Mức độ hoàn thiện
          </h3>
          <span className="text-[18px] font-bold tabular-nums text-primary">
            {percent}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant">
          {complete
            ? "Hồ sơ đã hoàn thiện. Tuyệt vời!"
            : "Bổ sung các mục dưới đây để hồ sơ hấp dẫn học viên hơn."}
        </p>

        <ul className="mt-4 space-y-2.5">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2.5">
              {c.done ? (
                <CheckCircle2 size={17} className="mt-px shrink-0 text-[#1f7a4d]" />
              ) : (
                <Circle size={17} className="mt-px shrink-0 text-on-surface-variant/35" />
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[13px] font-medium",
                    c.done ? "text-on-surface" : "text-on-surface-variant",
                  )}
                >
                  {c.label}
                </span>
                <span className="block text-[11.5px] text-on-surface-variant/70">
                  {c.done ? "Đã hoàn thiện" : "Cần bổ sung"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Save / preview actions */}
      <div className="space-y-2 rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(15,15,30,0.04)]">
        {formError && (
          <p
            className="rounded-[8px] bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-600"
            role="alert"
          >
            {formError}
          </p>
        )}
        <button
          onClick={() => void onSave()}
          disabled={saving || !dirty}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Đang lưu…
            </>
          ) : (
            <>
              <Save size={15} />
              Lưu thay đổi
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[var(--color-border-soft)] px-4 py-2.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          <Eye size={15} />
          Xem trước công khai
        </button>
        <p className="pt-1 text-center text-[11px] text-on-surface-variant/70">
          {dirty ? "Có thay đổi chưa lưu" : "Tất cả đã được lưu"}
        </p>
      </div>
    </>
  );
}
