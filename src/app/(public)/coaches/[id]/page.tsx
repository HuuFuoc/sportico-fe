"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Video,
  Wifi,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { TiltedCard } from "@/components/ui/TiltedCard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { backend } from "@/lib/backend/client";
import { isMockMode, ApiError } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { getCurrentRole } from "@/lib/auth-session";
import { messageForApiError } from "@/lib/errors-vi";
import { cn } from "@/lib/utils";
import type { PublicCoachDetailResponse } from "@/lib/backend/dto";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Currency ──────────────────────────────────────────────────────────────────

function fmtVND(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

// ── Media helpers ─────────────────────────────────────────────────────────────

const MEDIA_TYPE_CONFIG: Record<
  string,
  { gradient: string; icon: React.ElementType; label: string }
> = {
  certificate: {
    gradient: "from-indigo-500 via-violet-500 to-purple-600",
    icon: BadgeCheck,
    label: "Chứng chỉ",
  },
  award: {
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    icon: Trophy,
    label: "Giải thưởng",
  },
  gallery: {
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    icon: ImageIcon,
    label: "Thư viện",
  },
  identity: {
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
    icon: ShieldCheck,
    label: "Xác minh",
  },
  other: {
    gradient: "from-slate-400 via-slate-500 to-slate-600",
    icon: FileText,
    label: "Khác",
  },
};

function mediaTypeCfg(mediaType: string | null | undefined) {
  return (
    MEDIA_TYPE_CONFIG[(mediaType ?? "other").toLowerCase()] ??
    MEDIA_TYPE_CONFIG.other
  );
}

function looksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url.trim());
}

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Package type alias ────────────────────────────────────────────────────────

type PublicPackage = NonNullable<
  PublicCoachDetailResponse["trainingPackages"]
>[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicCoachDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  // selectedPackageId = null means "auto-select first available"
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [messageNote, setMessageNote] = useState<string | null>(null);

  const {
    data: coach,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoach(id), [id]);

  const { data: richData, loading: richLoading } =
    useApiResource<PublicCoachDetailResponse | null>(
      async () => {
        if (isMockMode()) return null;
        try {
          return await backend.publicCoach(id);
        } catch {
          return null;
        }
      },
      [id],
    );

  // ── Booking ─────────────────────────────────────────────────────────────────

  const handleBook = async (packageId: string) => {
    if (booking) return;
    setBooking(true);
    setBookingError(null);
    try {
      const result = await api.purchasePackage(packageId);
      if ("checkoutUrl" in result) {
        window.location.href = result.checkoutUrl;
        return;
      }
      router.push("/learner/schedule");
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Đặt lịch thất bại. Vui lòng thử lại.",
      );
      setBooking(false);
    }
  };

  // ── Messaging ────────────────────────────────────────────────────────────────

  const handleMessage = async () => {
    if (messaging) return;

    // Unauthenticated: redirect to login with return URL.
    if (!isMockMode() && !getAccessToken()) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/coaches/${id}`)}`);
      return;
    }

    setMessaging(true);
    setMessageNote(null);
    try {
      // POST /api/chat/rooms is idempotent — creates or returns the existing room.
      const roomId = await api.createOrGetChatRoom(id);
      const role = isMockMode() ? "learner" : getCurrentRole();
      const base = role === "coach" ? "/coach/messages" : "/learner/messages";
      router.push(`${base}?thread=${encodeURIComponent(roomId)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setMessageNote("Bạn không thể tự nhắn tin với chính mình.");
        } else if (err.status === 404) {
          setMessageNote("Không tìm thấy hồ sơ huấn luyện viên.");
        } else {
          setMessageNote("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
        }
      } else {
        setMessageNote("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
      }
    } finally {
      setMessaging(false);
    }
  };

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <PublicNavbar variant="solid" />
        <main className="flex-1 flex items-center justify-center py-24">
          <LoadingState label="Đang tải hồ sơ huấn luyện viên…" />
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PublicNavbar variant="solid" />
        <main className="flex-1 flex items-center justify-center py-24 px-4">
          <ErrorState
            message={messageForApiError(error)}
            onRetry={refetch}
            className="max-w-md"
          />
        </main>
        <Footer />
      </>
    );
  }

  if (!coach) notFound();

  // ── Derived data ─────────────────────────────────────────────────────────────

  const displayName = coach.name;
  const hasRating = coach.rating > 0 && coach.reviewCount > 0;
  const media = richData?.media ?? [];

  const publicPackages: PublicPackage[] = (
    richData?.trainingPackages ?? []
  ).filter((p) => {
    const s = (p.status ?? "").toLowerCase();
    return !s || s === "published" || s === "approved" || s === "active";
  });

  // Auto-select: first package by default, or the one the user clicked
  const selectedPackage: PublicPackage | null =
    publicPackages.find((p) => p.id === selectedPackageId) ??
    publicPackages[0] ??
    null;

  const hasLocation =
    richData?.teachingCity ||
    richData?.teachingDistrict ||
    richData?.teachingAddress ||
    coach.location;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PublicNavbar variant="solid" />

      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1120px] pb-20">
          {/* Breadcrumb nav */}
          <motion.nav
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-1.5 text-[12.5px]"
          >
            <Link
              href="/coaches"
              className="inline-flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
            >
              <ArrowLeft size={13} />
              Huấn luyện viên
            </Link>
            <span className="text-on-surface-variant/40 select-none">/</span>
            <span className="text-on-surface font-medium truncate max-w-[200px]">
              {displayName}
            </span>
          </motion.nav>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="relative mb-8"
          >
            {/* Cover — own overflow-hidden; avatar protrudes via absolute positioning */}
            <div className="relative h-44 sm:h-56 overflow-hidden rounded-[20px] shadow-[0_4px_24px_-8px_rgba(15,15,30,0.12)]">
              {coach.coverImage ? (
                <img
                  src={coach.coverImage}
                  alt="Ảnh bìa"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary via-[#7d6dff] to-[#c084fc]" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/15 to-transparent" />
            </div>

            {/* Avatar + identity row — avatar is absolute so text height doesn't affect it */}
            <div className="relative px-5 sm:px-7">
              {/* Avatar — bleeds upward into cover */}
              <div
                className="absolute left-0 z-10 overflow-hidden rounded-full border-4 border-white bg-surface
                            h-[88px] w-[88px] sm:h-[108px] sm:w-[108px]
                            -top-[44px] sm:-top-[54px]
                            shadow-[0_4px_20px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
              >
                {coach.avatarUrl ? (
                  <img
                    src={coach.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-[#7d6dff] text-white">
                    <span className="text-3xl sm:text-[34px] font-bold leading-none">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity — always on page background, left-indented past avatar */}
              <div className="pl-[104px] sm:pl-[128px] pt-2 sm:pt-3 pb-3 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-[20px] sm:text-[22px] font-bold text-on-surface leading-tight">
                    {displayName}
                  </h1>
                  {coach.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      <Sparkles size={10} />
                      Đã xác minh
                    </span>
                  )}
                </div>
                {coach.headline && (
                  <p className="text-[13px] text-on-surface-variant">
                    {coach.headline}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-on-surface-variant">
                  {hasRating && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-on-surface tabular-nums">
                        {coach.rating.toFixed(1)}
                      </span>
                      <span className="tabular-nums">({coach.reviewCount})</span>
                    </span>
                  )}
                  {coach.yearsExperience > 0 && (
                    <span>{coach.yearsExperience} năm kinh nghiệm</span>
                  )}
                  {(richData?.isOnlineAvailable || richData?.isOfflineAvailable) && (
                    <span className="flex items-center gap-1">
                      {richData.isOnlineAvailable && <Wifi size={11} />}
                      {richData.isOfflineAvailable && <MapPin size={11} />}
                      {richData.isOnlineAvailable && richData.isOfflineAvailable
                        ? "Online & Offline"
                        : richData.isOnlineAvailable
                          ? "Online"
                          : "Offline"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── 2-column layout ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ── Left column ─────────────────────────────────────────────── */}
            <div className="space-y-5 lg:col-span-8">

              {/* Tổng quan */}
              <Section title="Tổng quan" delay={0.08}>
                {coach.bio ? (
                  <p className="text-[14px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                    {coach.bio}
                  </p>
                ) : (
                  <Placeholder>Chưa có tiểu sử.</Placeholder>
                )}

                {(hasLocation || richData?.isOnlineAvailable || richData?.isOfflineAvailable) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasLocation && (
                      <InfoChip icon={<MapPin size={13} />}>
                        {[richData?.teachingDistrict, richData?.teachingCity]
                          .filter(Boolean)
                          .join(", ") ||
                          richData?.teachingAddress ||
                          coach.location ||
                          "Chưa cập nhật"}
                      </InfoChip>
                    )}
                    {richData?.isOnlineAvailable && (
                      <InfoChip icon={<Wifi size={13} />}>Dạy Online</InfoChip>
                    )}
                    {richData?.isOfflineAvailable && (
                      <InfoChip icon={<Video size={13} />}>Dạy Offline</InfoChip>
                    )}
                  </div>
                )}

                {/* KPI strip — chỉ render khi có đủ ít nhất 2 chỉ số */}
                {[
                  coach.yearsExperience > 0,
                  coach.rating > 0,
                  coach.reviewCount > 0,
                  coach.activeLearners > 0,
                ].filter(Boolean).length >= 2 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {coach.yearsExperience > 0 && (
                      <KpiTile label="Kinh nghiệm" value={`${coach.yearsExperience} năm`} />
                    )}
                    {coach.rating > 0 && (
                      <KpiTile label="Đánh giá TB" value={coach.rating.toFixed(1)} />
                    )}
                    {coach.reviewCount > 0 && (
                      <KpiTile label="Lượt đánh giá" value={String(coach.reviewCount)} />
                    )}
                    {coach.activeLearners > 0 && (
                      <KpiTile label="Học viên" value={String(coach.activeLearners)} />
                    )}
                  </div>
                )}
              </Section>

              {/* Chuyên môn */}
              {coach.specialties.length > 0 && (
                <Section title="Chuyên môn" delay={0.12}>
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[12.5px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Gói tập — selectable cards */}
              <PackageSection
                packages={publicPackages}
                loading={richLoading}
                isMock={isMockMode()}
                coachName={displayName}
                selectedPackageId={selectedPackage?.id ?? null}
                onSelect={setSelectedPackageId}
                delay={0.16}
              />

              {/* Chứng chỉ & Thành tích */}
              {(richData?.certificationsSummary || richData?.achievementsSummary) && (
                <Section title="Chứng chỉ & Thành tích" delay={0.22}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {richData.certificationsSummary && (
                      <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-indigo-600">
                          <BadgeCheck size={14} />
                          Chứng chỉ
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                          {richData.certificationsSummary}
                        </p>
                      </div>
                    )}
                    {richData.achievementsSummary && (
                      <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-600">
                          <Trophy size={14} />
                          Thành tích
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                          {richData.achievementsSummary}
                        </p>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Media nổi bật */}
              {media.length > 0 && (
                <Section title="Media nổi bật" delay={0.27}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {media.slice(0, 8).map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.29 + i * 0.04, ease: EASE }}
                      >
                        <TiltedCard maxTilt={8} scaleOnHover={1.03}>
                          <MediaMiniCard item={m} />
                        </TiltedCard>
                      </motion.div>
                    ))}
                  </div>
                  {media.length > 8 && (
                    <p className="mt-3 text-[12.5px] text-on-surface-variant">
                      + {media.length - 8} media khác
                    </p>
                  )}
                </Section>
              )}
            </div>

            {/* ── Right sidebar — Booking Summary ───────────────────────── */}
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-[80px] space-y-4">

                {/* AI match */}
                {typeof coach.matchPercent === "number" && coach.matchPercent > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
                    className="rounded-[16px] border border-primary/15 bg-primary/[0.05] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                        <Sparkles size={14} />
                        Độ phù hợp AI
                      </span>
                      <span className="text-[22px] font-bold text-primary tabular-nums leading-none">
                        {coach.matchPercent}%
                      </span>
                    </div>
                    <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/40">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${coach.matchPercent}%` }}
                      />
                    </div>
                    <p className="text-[11.5px] text-on-surface-variant">
                      Phù hợp với mục tiêu và phong cách tập luyện của bạn.
                    </p>
                  </motion.div>
                )}

                {/* Booking summary card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.12, ease: EASE }}
                  className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.07)] overflow-hidden"
                >
                  {/* Coach context strip */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-soft)]">
                    {coach.avatarUrl ? (
                      <img
                        src={coach.avatarUrl}
                        alt={displayName}
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[15px]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-on-surface truncate">
                        {displayName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {hasRating && (
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            <span className="tabular-nums">{coach.rating.toFixed(1)}</span>
                          </span>
                        )}
                        {coach.yearsExperience > 0 && (
                          <span className="text-[11px] text-on-surface-variant">
                            {coach.yearsExperience} năm kinh nghiệm
                          </span>
                        )}
                        {coach.activeLearners > 0 && (
                          <span className="text-[11px] text-on-surface-variant">
                            · {coach.activeLearners} học viên
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Summary header */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
                      Tóm tắt đặt lịch
                    </p>

                    {/* Package summary — nếu có gói đang chọn */}
                    {selectedPackage ? (
                      <>
                        <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low divide-y divide-[var(--color-border-soft)]">
                          {/* Package name */}
                          <div className="px-3 py-2.5">
                            <p className="text-[13px] font-semibold text-on-surface leading-snug">
                              {selectedPackage.title ?? "Gói tập"}
                            </p>
                          </div>
                          {/* Package details */}
                          <div className="px-3 py-2.5 space-y-1.5 text-[12px]">
                            <SummaryRow
                              label="Môn thể thao"
                              value={selectedPackage.sportName ?? "—"}
                            />
                            <SummaryRow
                              label="Hình thức"
                              value={selectedPackage.isOnline ? "Online" : "Offline"}
                            />
                            <SummaryRow
                              label="Số buổi"
                              value={`${selectedPackage.sessionCount} buổi`}
                            />
                            <SummaryRow
                              label="Thời hạn"
                              value={`${selectedPackage.durationDays} ngày`}
                            />
                          </div>
                          {/* Price summary */}
                          <div className="px-3 py-2.5 space-y-1.5 text-[12px]">
                            <div className="flex items-center justify-between">
                              <span className="text-on-surface-variant">Tổng tiền</span>
                              <span className="text-[16px] font-bold text-primary tabular-nums">
                                {fmtVND(selectedPackage.price)}
                              </span>
                            </div>
                            {selectedPackage.sessionCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-on-surface-variant">Mỗi buổi</span>
                                <span className="text-on-surface-variant tabular-nums">
                                  {fmtVND(
                                    Math.round(
                                      selectedPackage.price / selectedPackage.sessionCount,
                                    ),
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          type="button"
                          onClick={() => void handleBook(selectedPackage.id)}
                          disabled={booking}
                          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-2px_rgba(53,37,205,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                        >
                          {booking && <Loader2 size={15} className="animate-spin" />}
                          {booking ? "Đang xử lý…" : "Đặt lịch với gói này"}
                        </button>

                        {bookingError && (
                          <div className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-2.5">
                            <Info size={14} className="mt-0.5 shrink-0 text-red-500" />
                            <p className="text-[12px] text-red-700 leading-snug">
                              {bookingError}
                            </p>
                          </div>
                        )}
                      </>
                    ) : richLoading ? (
                      /* Đang tải packages */
                      <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low p-4 text-center">
                        <Loader2 size={18} className="mx-auto animate-spin text-on-surface-variant/40" />
                        <p className="mt-2 text-[12px] text-on-surface-variant/60">
                          Đang tải gói tập…
                        </p>
                      </div>
                    ) : (
                      /* Không có packages */
                      <div className="rounded-[10px] border border-dashed border-[var(--color-border-soft)] p-4 text-center">
                        <p className="text-[13px] font-medium text-on-surface-variant">
                          Chưa có gói tập
                        </p>
                        <p className="mt-1 text-[12px] text-on-surface-variant/60">
                          HLV này chưa mở gói tập. Bạn có thể nhắn tin để hỏi thêm.
                        </p>
                        <button
                          type="button"
                          disabled
                          className="mt-3 w-full cursor-not-allowed rounded-[12px] bg-on-surface/8 px-4 py-3 text-[13px] font-semibold text-on-surface-variant/40"
                        >
                          Vui lòng chọn gói tập
                        </button>
                      </div>
                    )}

                    {/* Messaging */}
                    <button
                      type="button"
                      onClick={() => void handleMessage()}
                      disabled={messaging}
                      className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[13.5px] font-semibold text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.04] hover:text-primary hover:shadow-[0_4px_12px_-2px_rgba(53,37,205,0.15)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
                    >
                      <MessageCircle size={15} />
                      {messaging ? "Đang mở…" : "Nhắn tin với HLV"}
                    </button>

                    {messageNote && (
                      <div className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-2.5">
                        <Info size={14} className="mt-0.5 shrink-0 text-red-500" />
                        <p className="text-[12px] text-red-700 leading-snug">
                          {messageNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trust footer */}
                  <div className="flex items-center justify-center gap-1.5 border-t border-[var(--color-border-soft)] bg-surface-container-low px-5 py-3">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span className="text-[11px] text-on-surface-variant">
                      Thanh toán an toàn qua PayOS
                    </span>
                  </div>
                </motion.div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

// ── PackageSection ─────────────────────────────────────────────────────────────

function PackageSection({
  packages,
  loading,
  isMock,
  coachName,
  selectedPackageId,
  onSelect,
  delay,
}: {
  packages: PublicPackage[];
  loading: boolean;
  isMock: boolean;
  coachName: string;
  selectedPackageId: string | null;
  onSelect: (id: string) => void;
  delay: number;
}) {
  const firstName = coachName.split(" ")[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
    >
      <h2 className="mb-4 text-[15px] font-semibold text-on-surface">
        Gói tập của {firstName}
      </h2>

      {isMock || (!loading && packages.length === 0) ? (
        /* Empty state */
        <div className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-on-surface-variant">
            HLV này chưa mở gói tập.
          </p>
          <p className="mt-1 text-[12.5px] text-on-surface-variant/60">
            Bạn có thể quay lại sau hoặc chọn huấn luyện viên khác.
          </p>
          <Link
            href="/coaches"
            className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <ArrowLeft size={13} />
            Xem HLV khác
          </Link>
        </div>
      ) : loading ? (
        /* Loading */
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[12px] bg-surface-container-low"
            />
          ))}
        </div>
      ) : (
        /* Package list */
        <div className="space-y-3">
          {packages.map((pkg, index) => {
            const isSelected = pkg.id === selectedPackageId;
            const perSession =
              pkg.sessionCount > 0
                ? Math.round(pkg.price / pkg.sessionCount)
                : null;
            const levels = (pkg.level ?? "")
              .split(/[,;]+/)
              .map((l) => l.trim())
              .filter(Boolean);
            const isFirst = index === 0;

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelect(pkg.id)}
                className={cn(
                  "w-full text-left rounded-[14px] border p-4 transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1.5px_var(--color-primary)]"
                    : "border-[var(--color-border-soft)] bg-surface-container-lowest hover:border-primary/40 hover:shadow-sm",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {isFirst && (
                        <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                          Đề xuất
                        </span>
                      )}
                      <p className="text-[14px] font-semibold text-on-surface leading-snug">
                        {pkg.title ?? "Gói tập"}
                      </p>
                    </div>
                    <p className="text-[12px] text-on-surface-variant mb-2">
                      {[
                        pkg.sportName,
                        pkg.sessionCount > 0 && `${pkg.sessionCount} buổi`,
                        pkg.durationDays > 0 && `${pkg.durationDays} ngày`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {levels.map((l, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-2.5 py-0.5 text-[11px] text-on-surface-variant"
                        >
                          {l}
                        </span>
                      ))}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px]",
                          pkg.isOnline
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-amber-200 bg-amber-50 text-amber-700",
                        )}
                      >
                        {pkg.isOnline ? (
                          <Wifi size={10} />
                        ) : (
                          <MapPin size={10} />
                        )}
                        {pkg.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>

                  {/* Price + radio */}
                  <div className="shrink-0 flex flex-col items-end gap-2.5">
                    <div className="text-right">
                      <p className="text-[17px] font-bold text-primary tabular-nums leading-none">
                        {fmtVND(pkg.price)}
                      </p>
                      {perSession != null && (
                        <p className="mt-0.5 text-[11px] text-on-surface-variant tabular-nums">
                          {fmtVND(perSession)} / buổi
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-[var(--color-border-soft)]",
                      )}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
    >
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

// ── Sidebar summary row ───────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface text-right">{value}</span>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] italic text-on-surface-variant/60">{children}</p>
  );
}

function InfoChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-1 text-[12.5px] text-on-surface-variant">
      {icon}
      {children}
    </span>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low p-3 text-center">
      <p className="tabular-nums text-[20px] font-bold tracking-tight text-on-surface">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-on-surface-variant">{label}</p>
    </div>
  );
}

// ── Media card ────────────────────────────────────────────────────────────────

type MediaItem = NonNullable<PublicCoachDetailResponse["media"]>[number];

function MediaMiniCard({ item }: { item: MediaItem }) {
  const url = item.mediaUrl ?? "";
  const isImage = url ? looksLikeImage(url) : false;
  const cfg = mediaTypeCfg(item.mediaType);
  const Icon = cfg.icon;

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square overflow-hidden rounded-[12px] border border-[var(--color-border-soft)]"
      onClick={!url ? (e) => e.preventDefault() : undefined}
    >
      {isImage ? (
        <img
          src={url}
          alt={item.title ?? cfg.label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br",
            cfg.gradient,
          )}
        >
          <Icon size={28} className="text-white/80" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {item.title && (
        <p className="absolute bottom-0 left-0 right-0 translate-y-1 px-2 pb-2 text-[10.5px] font-medium text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 line-clamp-2">
          {item.title}
        </p>
      )}
    </a>
  );
}
