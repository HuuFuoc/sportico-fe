"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Flag,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Wifi,
  X,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { TiltedCard } from "@/components/ui/TiltedCard";
import { LoadingState, ErrorState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { savePendingPayos } from "@/lib/payos-pending";
import { backend } from "@/lib/backend/client";
import { isMockMode, ApiError } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import { getCurrentRole } from "@/lib/auth-session";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess, showError } from "@/lib/toast";
import { parseFocal, stripFocal, focalToCss } from "@/lib/image-focal";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/useAuthStore";
import type { CurrentUserResponse, PublicCoachDetailResponse } from "@/lib/backend/dto";
import type { CreateReviewRequest, UpdateReviewRequest, CreateReviewReportRequest } from "@/lib/backend/dto";
import type { Review, ReviewSummary } from "@/types";
import { CoachPackageCard } from "@/components/coach-packages/CoachPackageCard";
import { PackageDetailModal } from "@/components/coach-packages/PackageDetailModal";
import { CalendarPlus } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Currency ──────────────────────────────────────────────────────────────────

function fmtVND(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

/** ISO date → "dd/MM/yyyy" (Vietnamese). */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** ISO datetime → "dd/MM HH:mm" for the fixed-schedule list. */
function fmtScheduleTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Conservative "sold out" check for a fixed-schedule package: only treat it as
 * full when EVERY session reports zero remaining spots (or status "full"). The
 * backend remains the source of truth and will reject an unfillable purchase —
 * this only hides the buy button when the data is unambiguous.
 */
function packageSoldOut(pkg: PublicPackage): boolean {
  const sessions = pkg.sessions ?? [];
  if (sessions.length === 0) return false;
  return sessions.every((s) => {
    const status = (s.status ?? "").toLowerCase();
    if (status === "full" || status === "cancelled") return true;
    return s.remainingParticipants != null && s.remainingParticipants <= 0;
  });
}

// ── Vietnamese label helpers ────────────────────────────────────────────────────
// Only the *display label* is localized. The sport id / isOnline flag sent to the
// backend is never touched — these helpers run at render time only.

const SPORT_VI: Record<string, string> = {
  badminton: "Cầu lông",
  tennis: "Quần vợt",
  "table tennis": "Bóng bàn",
  pickleball: "Pickleball",
  football: "Bóng đá",
  soccer: "Bóng đá",
  basketball: "Bóng rổ",
  swimming: "Bơi lội",
  volleyball: "Bóng chuyền",
  yoga: "Yoga",
  gym: "Gym",
};

function viSport(name?: string | null): string {
  if (!name) return "—";
  return SPORT_VI[name.trim().toLowerCase()] ?? name;
}

/** "Trực tuyến" (online) vs "Trực tiếp" (in-person). */
function viMode(isOnline?: boolean | null): string {
  return isOnline ? "Trực tuyến" : "Trực tiếp";
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
  const authUser = useAuthStore((s) => s.user);

  // The cover's focal point is encoded in the coverImage URL as a `#pos=x,y`
  // fragment (see lib/image-focal.ts), so the crop the coach chose is rendered
  // identically here for every learner on every device. The avatar has no
  // server-side position (no user-update endpoint), so it stays centered.

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

  // The public coach endpoint returns only a SUMMARY of each training package
  // (price, sessionCount, durationDays…) and omits the fixed schedule
  // (startDate/endDate + sessions[]). Fetch the full public detail per package
  // so the cards, the booking sidebar and the detail modal can show the real
  // lessons, dates and remaining slots instead of "Chưa cập nhật". Any package
  // whose detail fetch fails falls back to its summary.
  const packageIdsKey = (richData?.trainingPackages ?? [])
    .map((p) => p.id)
    .join(",");
  const { data: fullPackages } = useApiResource<PublicPackage[] | null>(
    async () => {
      if (isMockMode()) return null;
      const summaries = richData?.trainingPackages ?? [];
      if (summaries.length === 0) return [];
      const results = await Promise.allSettled(
        summaries.map((p) => backend.publicTrainingPackage(p.id)),
      );
      return results.map((r, i) =>
        r.status === "fulfilled" ? (r.value as PublicPackage) : summaries[i],
      );
    },
    [packageIdsKey],
  );

  // ── Learner existing booking check (determines CTA state) ───────────────────
  // Load learner's bookings to determine if they already have a package with
  // this coach — so the CTA can show "Xem lịch học" instead of "Mua gói".
  const isAuthed = !isMockMode() && !!getAccessToken();
  const { data: myBookingsData } = useApiResource<import("@/types").Booking[]>(
    () => isAuthed ? api.fetchMyBookings() : Promise.resolve([]),
    [isAuthed],
  );

  // Find the most relevant booking for this coach (prefer active, then pending_payment).
  const coachBooking = (myBookingsData ?? [])
    .filter((b) => b.coachId === id)
    .sort((a, b) => {
      const rank = (s: string) =>
        s === "active" ? 0 : s === "pending_payment" ? 1 : 2;
      return rank(a.status?.toLowerCase()) - rank(b.status?.toLowerCase());
    })[0] ?? null;

  // Package detail modal — opened from a card's "Xem chi tiết".
  const [detailPackageId, setDetailPackageId] = useState<string | null>(null);

  // Media lightbox — index into `media`, or null when closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ── Booking ─────────────────────────────────────────────────────────────────

  const handleBook = async (packageId: string) => {
    if (booking) return;
    setBooking(true);
    setBookingError(null);
    try {
      const result = await api.purchasePackage(packageId);
      if ("checkoutUrl" in result) {
        // Save payment identifiers so /payment/success can reconcile even if
        // PayOS does not pass orderCode back in the redirect URL, and so the
        // "Đồng bộ thanh toán" button works when the learner returns later.
        savePendingPayos({
          bookingId: result.bookingId,
          paymentId: result.paymentId,
          orderCode: result.orderCode,
          createdAt: new Date().toISOString(),
        });
        window.location.href = result.checkoutUrl;
        return;
      }
      router.push("/learner/bookings");
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

  // Adaptive media grid: a 2-image gallery should show two larger tiles rather
  // than two tiny squares lost in a 4-column grid.
  const mediaCols =
    media.length <= 1
      ? "grid-cols-1 sm:grid-cols-2"
      : media.length === 2
        ? "grid-cols-2"
        : media.length === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  // Prefer the fully-detailed package (with schedule + dates) when its detail
  // fetch has resolved; otherwise show the summary so cards render immediately.
  const enrichedById = new Map(
    (fullPackages ?? []).map((p) => [p.id, p] as const),
  );
  const publicPackages: PublicPackage[] = (richData?.trainingPackages ?? [])
    .filter((p) => {
      const s = (p.status ?? "").toLowerCase();
      return !s || s === "published" || s === "approved" || s === "active";
    })
    .map((p) => enrichedById.get(p.id) ?? p);

  // Auto-select: first package by default, or the one the user clicked
  const selectedPackage: PublicPackage | null =
    publicPackages.find((p) => p.id === selectedPackageId) ??
    publicPackages[0] ??
    null;

  // Booking matching the currently-selected package (drives per-package CTA state).
  const selectedPackageBooking = selectedPackage
    ? ((myBookingsData ?? []).find(
        (b) =>
          b.coachId === id &&
          !!b.trainingPackageId &&
          b.trainingPackageId === selectedPackage.id,
      ) ?? null)
    : null;

  // Fixed-schedule package can be "full" — gate the purchase button accordingly.
  const selectedPackageSoldOut = selectedPackage
    ? packageSoldOut(selectedPackage)
    : false;

  // Package whose detail modal is open + whether the learner already owns it.
  const detailPackage =
    detailPackageId != null
      ? (publicPackages.find((p) => p.id === detailPackageId) ?? null)
      : null;
  const detailPackageActive =
    detailPackage != null &&
    (myBookingsData ?? []).some(
      (b) =>
        b.coachId === id &&
        b.trainingPackageId === detailPackage.id &&
        b.status?.toLowerCase() === "active",
    );

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
        <div className="mx-auto max-w-[1200px] pb-20">
          {/* Breadcrumb nav */}
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            aria-label="Điều hướng"
            className="mb-6 flex items-center gap-1"
          >
            <Link
              href="/"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-on-surface-variant/50 transition-all hover:bg-surface-container-low hover:text-on-surface-variant"
            >
              <Home size={14} />
            </Link>
            <ChevronRight size={13} className="text-on-surface-variant/30 shrink-0" />
            <Link
              href="/coaches"
              className="inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[12.5px] text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
            >
              <ArrowLeft size={12} />
              Huấn luyện viên
            </Link>
            <ChevronRight size={13} className="text-on-surface-variant/30 shrink-0" />
            <span className="inline-flex items-center rounded-[7px] bg-surface-container-low px-2.5 py-1 text-[12.5px] font-semibold text-on-surface truncate max-w-[220px]">
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
            {/* Cover — avatar + identity are overlaid inside via absolute positioning */}
            <div className="relative h-[349px] sm:h-[413px] overflow-hidden rounded-[20px] shadow-[0_8px_32px_-8px_rgba(15,15,30,0.18)]">
              {coach.coverImage ? (
                <img
                  src={stripFocal(coach.coverImage)}
                  alt="Ảnh bìa"
                  draggable={false}
                  className="h-full w-full object-cover pointer-events-none"
                  style={{ objectPosition: focalToCss(parseFocal(coach.coverImage)) }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary via-[#7d6dff] to-[#c084fc]" />
              )}

              {/* Dark gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

              {/* Avatar + identity — overlaid at the bottom of the cover */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end gap-4 px-5 pb-5 sm:px-7 sm:pb-6">
                {/* Avatar */}
                <div
                  className="shrink-0 overflow-hidden rounded-full border-4 border-white/25 bg-surface
                              h-[88px] w-[88px] sm:h-[108px] sm:w-[108px]
                              shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-2 ring-white/10"
                >
                  {coach.avatarUrl ? (
                    <img
                      src={coach.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-[#7d6dff] text-white">
                      <span className="text-3xl sm:text-[34px] font-bold leading-none">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div className="min-w-0 flex-1 pb-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[22px] sm:text-[30px] font-bold text-white leading-tight drop-shadow-sm">
                        {displayName}
                      </h1>
                      {coach.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary shadow-sm">
                          <BadgeCheck size={12} />
                          Đã xác minh
                        </span>
                      )}
                    </div>
                    {coach.headline && (
                      <p className="text-[13px] sm:text-[14px] text-white/85 line-clamp-1">
                        {coach.headline}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-[12.5px] text-white/75">
                      {hasRating && (
                        <span className="flex items-center gap-1">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-white/95 tabular-nums">
                            {coach.rating.toFixed(1)}
                          </span>
                          <span className="tabular-nums">({coach.reviewCount})</span>
                        </span>
                      )}
                      {coach.yearsExperience > 0 && (
                        <span className="flex items-center gap-1">
                          <Trophy size={12} />
                          {coach.yearsExperience} năm kinh nghiệm
                        </span>
                      )}
                      {(richData?.isOnlineAvailable || richData?.isOfflineAvailable) && (
                        <span className="flex items-center gap-1">
                          {richData.isOnlineAvailable ? <Wifi size={12} /> : <MapPin size={12} />}
                          {richData.isOnlineAvailable && richData.isOfflineAvailable
                            ? "Trực tuyến & trực tiếp"
                            : richData.isOnlineAvailable
                              ? "Dạy trực tuyến"
                              : "Dạy trực tiếp"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </motion.div>

          {/* ── 2-column layout ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-7">
            {/* ── Left column ─────────────────────────────────────────────── */}
            <div className="min-w-0 space-y-6">

              {/* Tổng quan */}
              <Section title="Tổng quan" icon={<Info size={17} />} delay={0.08}>
                {coach.bio ? (
                  <p className="text-[14px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                    {coach.bio}
                  </p>
                ) : (
                  <Placeholder>Huấn luyện viên chưa cập nhật phần giới thiệu.</Placeholder>
                )}

                {(hasLocation || richData?.isOnlineAvailable || richData?.isOfflineAvailable) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <InfoChip icon={<MapPin size={14} />}>
                      {[richData?.teachingDistrict, richData?.teachingCity]
                        .filter(Boolean)
                        .join(", ") ||
                        richData?.teachingAddress ||
                        coach.location ||
                        "Chưa cập nhật địa điểm dạy"}
                    </InfoChip>
                    {richData?.isOnlineAvailable && (
                      <InfoChip icon={<Wifi size={14} />}>Dạy trực tuyến</InfoChip>
                    )}
                    {richData?.isOfflineAvailable && (
                      <InfoChip icon={<MapPin size={14} />}>Dạy trực tiếp</InfoChip>
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

              {/* Gói tập — selectable cards */}
              <PackageSection
                packages={publicPackages}
                loading={richLoading}
                isMock={isMockMode()}
                coachName={displayName}
                selectedPackageId={selectedPackage?.id ?? null}
                onSelect={setSelectedPackageId}
                onViewDetail={(pkgId) => setDetailPackageId(pkgId)}
                delay={0.16}
              />

              {/* Chuyên môn & phong cách huấn luyện */}
              {coach.specialties.length > 0 && (
                <Section
                  title="Chuyên môn & phong cách huấn luyện"
                  subtitle="Thế mạnh và lĩnh vực huấn luyện viên tập trung đào tạo"
                  icon={<Sparkles size={16} />}
                  delay={0.2}
                >
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[13px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Chứng chỉ & Thành tích */}
              {(richData?.certificationsSummary || richData?.achievementsSummary) && (
                <Section title="Chứng chỉ & thành tích" icon={<BadgeCheck size={17} />} delay={0.24}>
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
                <Section title="Media nổi bật" icon={<ImageIcon size={17} />} delay={0.28}>
                  <div className={cn("grid gap-3", mediaCols)}>
                    {media.slice(0, 8).map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.29 + i * 0.04, ease: EASE }}
                      >
                        <TiltedCard maxTilt={8} scaleOnHover={1.03}>
                          <MediaMiniCard item={m} onOpen={() => setLightboxIndex(i)} />
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
              {/* Đánh giá */}
              <ReviewsSection
                coachId={id}
                isAuthed={isAuthed}
                authUser={authUser}
              />
            </div>

            {/* ── Right sidebar — Booking Summary ───────────────────────── */}
            <aside className="min-w-0">
              <div className="lg:sticky lg:top-[92px] space-y-4">

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
                              value={viSport(selectedPackage.sportName)}
                            />
                            <SummaryRow
                              label="Hình thức"
                              value={viMode(selectedPackage.isOnline)}
                            />
                            <SummaryRow
                              label="Số buổi"
                              value={`${selectedPackage.sessionCount} buổi`}
                            />
                            <SummaryRow
                              label="Thời gian"
                              value={
                                selectedPackage.startDate || selectedPackage.endDate
                                  ? `${fmtDate(selectedPackage.startDate)} – ${fmtDate(selectedPackage.endDate)}`
                                  : `${selectedPackage.durationDays} ngày`
                              }
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

                        {/* Fixed schedule — learner sees the exact lessons before buying */}
                        {selectedPackage.sessions && selectedPackage.sessions.length > 0 && (
                          <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low">
                            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--color-border-soft)] text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
                              <CalendarPlus size={12} />
                              Lịch học cố định
                            </div>
                            <ul className="max-h-[200px] overflow-y-auto divide-y divide-[var(--color-border-soft)]">
                              {selectedPackage.sessions.map((s) => {
                                const status = (s.status ?? "").toLowerCase();
                                const full =
                                  status === "full" ||
                                  (s.remainingParticipants != null &&
                                    s.remainingParticipants <= 0);
                                return (
                                  <li
                                    key={s.sessionNumber}
                                    className="px-3 py-2 text-[12px]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-on-surface">
                                        Buổi {s.sessionNumber}
                                      </span>
                                      <span className="tabular-nums text-on-surface-variant">
                                        {fmtScheduleTime(s.startTime)}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-on-surface-variant">
                                      <span className="inline-flex items-center gap-1">
                                        {s.isOnline ? (
                                          <Wifi size={10} />
                                        ) : (
                                          <MapPin size={10} />
                                        )}
                                        {s.isOnline
                                          ? "Trực tuyến"
                                          : s.location || "Trực tiếp"}
                                      </span>
                                      {s.remainingParticipants != null && (
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                            full
                                              ? "bg-red-50 text-red-600"
                                              : "bg-emerald-50 text-emerald-700",
                                          )}
                                        >
                                          {full
                                            ? "Hết chỗ"
                                            : `Còn ${s.remainingParticipants} chỗ`}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* CTA — active booking / pending_payment / sold out / unauthenticated / no booking */}
                        {selectedPackageBooking?.status?.toLowerCase() === "active" ? (
                          /* Learner already owns this package — lịch học đã được tạo tự động.
                             Calendar is read-only, so route to the schedule instead of booking. */
                          <Link
                            href="/learner/schedule"
                            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#10b981] to-[#34d399] px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-2px_rgba(16,185,129,0.55)] active:translate-y-0"
                          >
                            <CalendarPlus size={16} />
                            Xem lịch học của bạn
                          </Link>
                        ) : selectedPackageBooking?.status?.toLowerCase() === "pending_payment" ? (
                          /* An earlier payment attempt for THIS package is still pending. */
                          <button
                            type="button"
                            onClick={() => void handleBook(selectedPackage.id)}
                            disabled={booking}
                            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-2px_rgba(53,37,205,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                          >
                            {booking && <Loader2 size={15} className="animate-spin" />}
                            {booking ? "Đang xử lý…" : "Mua gói tập"}
                          </button>
                        ) : selectedPackageSoldOut ? (
                          /* Every fixed session is full — purchase disabled. */
                          <button
                            type="button"
                            disabled
                            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[12px] bg-on-surface/8 px-4 py-3.5 text-[14px] font-bold text-on-surface-variant/50"
                          >
                            Gói đã hết chỗ
                          </button>
                        ) : !isAuthed ? (
                          /* Not logged in: redirect to login with returnUrl */
                          <Link
                            href={`/login?returnUrl=${encodeURIComponent(`/coaches/${id}`)}`}
                            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-2px_rgba(53,37,205,0.55)] active:translate-y-0"
                          >
                            Đăng nhập để mua gói
                          </Link>
                        ) : (
                          /* Authenticated, no booking yet: purchase */
                          <button
                            type="button"
                            onClick={() => void handleBook(selectedPackage.id)}
                            disabled={booking}
                            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#3525cd] to-[#7d6dff] px-4 py-3.5 text-[14px] font-bold text-white shadow-[0_4px_16px_-2px_rgba(53,37,205,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-2px_rgba(53,37,205,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                          >
                            {booking && <Loader2 size={15} className="animate-spin" />}
                            {booking ? "Đang xử lý…" : "Mua gói tập"}
                          </button>
                        )}

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
                  <div className="space-y-1.5 border-t border-[var(--color-border-soft)] bg-surface-container-low px-5 py-3.5">
                    <TrustRow icon={<ShieldCheck size={13} className="text-emerald-600" />}>
                      Thanh toán an toàn qua PayOS
                    </TrustRow>
                    {coach.verified && (
                      <TrustRow icon={<BadgeCheck size={13} className="text-emerald-600" />}>
                        Huấn luyện viên đã xác minh
                      </TrustRow>
                    )}
                    <TrustRow icon={<MessageCircle size={13} className="text-emerald-600" />}>
                      Có thể trao đổi trước khi mua
                    </TrustRow>
                  </div>
                </motion.div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Media lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && media[lightboxIndex] && (
          <MediaLightbox
            items={media}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>

      {/* ── Package detail modal (full info + purchase confirmation) ────────── */}
      <AnimatePresence>
        {detailPackage && (
          <PackageDetailModal
            pkg={detailPackage}
            coachName={displayName}
            onClose={() => setDetailPackageId(null)}
            isAuthed={isAuthed}
            alreadyActive={detailPackageActive}
            purchasing={booking}
            purchaseError={bookingError}
            loginHref={`/login?returnUrl=${encodeURIComponent(`/coaches/${id}`)}`}
            onConfirmPurchase={() => void handleBook(detailPackage.id)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── ReviewsSection ────────────────────────────────────────────────────────────

const REVIEW_SORT_OPTIONS = [
  { key: "latest" as const, label: "Mới nhất" },
  { key: "highest" as const, label: "Cao nhất" },
  { key: "lowest" as const, label: "Thấp nhất" },
];

// Preset report reasons. Each is ≥10 chars so the backend's minimum-length
// rule always passes — picking from a list avoids "reason too short" errors.
const REPORT_REASONS = [
  "Nội dung xúc phạm, phản cảm",
  "Thông tin sai sự thật",
  "Spam hoặc nội dung quảng cáo",
  "Đánh giá giả mạo, không trung thực",
  "Ngôn từ thù ghét, quấy rối",
  "Lý do khác (mô tả bên dưới)",
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5"
        >
          <Star
            size={22}
            className={cn(
              "transition-colors",
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-on-surface-variant/20",
            )}
          />
        </button>
      ))}
    </span>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-on-surface-variant/20"}
        />
      ))}
    </span>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-right text-[12px] text-on-surface-variant">{label}</span>
      <Star size={10} className="shrink-0 fill-amber-400 text-amber-400" />
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-on-surface-variant/[0.08]">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-[11px] tabular-nums text-on-surface-variant">{count}</span>
    </div>
  );
}

function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
  onReport,
  showReport,
}: {
  review: Review;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReport: (id: string) => void;
  showReport: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[10px] border p-4 space-y-2 transition-colors",
      isOwn
        ? "border-primary/20 bg-primary/[0.03]"
        : "border-[var(--color-border-soft)] bg-surface-container-lowest",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {review.learnerAvatarUrl ? (
            <img
              src={review.learnerAvatarUrl}
              alt={review.learnerName ?? ""}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
              {(review.learnerName ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface truncate">
              {review.learnerName ?? `Học viên`}
              {isOwn && (
                <span className="ml-1.5 text-[11px] font-normal text-primary">(Bạn)</span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              <StarRow rating={review.rating} />
              <span className="text-[11px] text-on-surface-variant tabular-nums">
                {new Date(review.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOwn && review.canEdit && (
            <>
              <button
                onClick={onEdit}
                className="rounded p-1.5 text-on-surface-variant/60 hover:bg-surface-container-high hover:text-primary transition-colors"
                title="Chỉnh sửa"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onDelete}
                className="rounded p-1.5 text-on-surface-variant/60 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Xoá"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {isOwn && !review.canEdit && (
            <span className="text-[11px] italic text-on-surface-variant/60">Đã hết hạn chỉnh sửa</span>
          )}
          {showReport && !isOwn && (
            <button
              onClick={() => onReport(review.id)}
              className="rounded p-1.5 text-on-surface-variant/40 hover:bg-surface-container-high hover:text-red-500 transition-colors"
              title="Báo cáo đánh giá"
            >
              <Flag size={13} />
            </button>
          )}
        </div>
      </div>
      {review.comment && (
        <p className="text-[13px] leading-relaxed text-on-surface-variant">{review.comment}</p>
      )}
    </div>
  );
}

function ReviewsSection({
  coachId,
  isAuthed,
  authUser,
}: {
  coachId: string;
  isAuthed: boolean;
  authUser: CurrentUserResponse | null;
}) {
  const [sortBy, setSortBy] = useState<"latest" | "highest" | "lowest">("latest");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const PAGE_SIZE = 10;

  const isLearner = authUser?.roles?.some((r) => r.toLowerCase() === "learner");
  const isCoach = authUser?.roles?.some((r) => r.toLowerCase() === "coach");
  const isOwnCoachProfile = isCoach && authUser?.id === coachId;

  // Summary
  const { data: summary, loading: summaryLoading } = useApiResource<ReviewSummary>(
    () => api.fetchReviewSummary(coachId),
    [coachId, refreshKey],
  );

  // Review list
  const { data: reviewsData, loading: listLoading } = useApiResource(
    () => api.fetchReviews(coachId, { pageNumber: page, pageSize: PAGE_SIZE, rating: ratingFilter, sortBy }),
    [coachId, page, ratingFilter, sortBy, refreshKey],
  );

  const reviews = reviewsData?.items ?? [];
  const hasNext = reviewsData?.hasNext ?? false;
  // Only surface the sort/filter controls once the coach actually has reviews —
  // an empty profile shouldn't be cluttered with rating filters that do nothing.
  const hasAnyReviews = (summary?.totalReviews ?? 0) > 0;

  // Enrich reviews where the backend omitted reviewer info
  const [profileMap, setProfileMap] = useState<Map<string, { name: string; avatarUrl?: string }>>(new Map());
  useEffect(() => {
    if (isMockMode()) return;
    const missing = reviews.filter((r) => !r.learnerName && r.learnerId);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.allSettled(
      missing.map((r) => api.fetchUserProfile(r.learnerId).then((p) => ({ id: r.learnerId, profile: p })))
    ).then((results) => {
      if (cancelled) return;
      setProfileMap((prev) => {
        const next = new Map(prev);
        results.forEach((res) => {
          if (res.status === "fulfilled" && res.value.profile) next.set(res.value.id, res.value.profile);
        });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [reviews]);

  const enrichReview = (r: Review): Review => {
    if (r.learnerName) return r;
    const p = profileMap.get(r.learnerId);
    if (!p) return r;
    return { ...r, learnerName: p.name, learnerAvatarUrl: p.avatarUrl };
  };

  // My review (learner only)
  const [myReview, setMyReview] = useState<Review | null | undefined>(undefined);
  const [myReviewLoading, setMyReviewLoading] = useState(false);

  useEffect(() => {
    if (!isAuthed || !isLearner) { setMyReview(null); return; }
    setMyReviewLoading(true);
    api.fetchMyReviewForCoach(coachId)
      .then((r) => setMyReview(r))
      .catch(() => setMyReview(null))
      .finally(() => setMyReviewLoading(false));
  }, [coachId, isAuthed, isLearner]);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setPage(1);
  }, []);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditMode(false);
    setFormRating(5);
    setFormComment("");
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (r: Review) => {
    setEditMode(true);
    setFormRating(r.rating);
    setFormComment(r.comment ?? "");
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmitReview = async () => {
    if (formRating < 1 || formRating > 5) { setFormError("Vui lòng chọn từ 1 đến 5 sao."); return; }
    if (formComment.length > 1000) { setFormError("Nhận xét tối đa 1000 ký tự."); return; }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const body: CreateReviewRequest | UpdateReviewRequest = { rating: formRating, comment: formComment || undefined };
      let updated: Review;
      if (editMode && myReview) {
        updated = await api.updateReview(myReview.id, body as UpdateReviewRequest);
      } else {
        updated = await api.createReview(coachId, body as CreateReviewRequest);
      }
      setMyReview(updated);
      setShowForm(false);
      bumpRefresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("REVIEW_ALREADY_EXISTS")) {
        const mine = await api.fetchMyReviewForCoach(coachId);
        setMyReview(mine);
        if (mine) { openEdit(mine); }
        setFormError("Bạn đã đánh giá coach này. Hãy chỉnh sửa đánh giá hiện tại.");
      } else if (msg.includes("REVIEW_NOT_ALLOWED")) {
        setFormError("Bạn cần có gói tập đã thanh toán với coach này để đánh giá.");
      } else if (msg.includes("REVIEW_EDIT_EXPIRED")) {
        setFormError("Gói tập đã hết hạn. Không thể chỉnh sửa đánh giá.");
        if (myReview) setMyReview({ ...myReview, canEdit: false });
      } else {
        setFormError(msg || "Gửi đánh giá thất bại.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteReview = async () => {
    if (!myReview || deleting) return;
    setDeleting(true);
    try {
      await api.deleteReview(myReview.id);
      setMyReview(null);
      setShowDeleteConfirm(false);
      bumpRefresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Xoá đánh giá thất bại.");
    } finally {
      setDeleting(false);
    }
  };

  // Report
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Reason must be at least 10 characters (mirrors the backend rule so the user
  // gets immediate feedback instead of a 400 Bad Request).
  const REPORT_REASON_MIN = 10;
  const reportReasonValid = reportReason.trim().length >= REPORT_REASON_MIN;

  const openReport = (id: string) => {
    setReportTarget(id);
    setReportReason("");
    setReportDesc("");
  };

  const handleReportSubmit = async () => {
    if (!reportTarget || !reportReasonValid) return;
    setReportSubmitting(true);
    try {
      const body: CreateReviewReportRequest = {
        reason: reportReason.trim(),
        description: reportDesc.trim() || undefined,
      };
      await api.reportReview(reportTarget, body);
      showSuccess("Đã gửi báo cáo đánh giá.");
      setReportTarget(null);
    } catch (e) {
      showError(messageForApiError(e));
    } finally {
      setReportSubmitting(false);
    }
  };

  const EASE_LOCAL = [0.16, 1, 0.3, 1] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.32, ease: EASE_LOCAL }}
      className="rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 space-y-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-amber-50 text-amber-500">
          <Star size={16} />
        </span>
        <h2 className="text-[15px] font-semibold text-on-surface leading-tight">
          Đánh giá từ học viên
        </h2>
      </div>

      {/* Summary */}
      {!summaryLoading && summary && summary.totalReviews > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center justify-center rounded-[12px] bg-surface-container-low px-6 py-4 shrink-0">
            <span className="text-[40px] font-bold tabular-nums leading-none text-on-surface">
              {summary.averageRating.toFixed(1)}
            </span>
            <StarRow rating={Math.round(summary.averageRating)} />
            <span className="mt-1 text-[12px] text-on-surface-variant tabular-nums">
              {summary.totalReviews} đánh giá
            </span>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => (
              <RatingBar
                key={s}
                label={String(s)}
                count={summary.ratingBreakdown[String(s)] ?? 0}
                total={summary.totalReviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Learner own review section */}
      {isAuthed && isLearner && (
        <div>
          {myReviewLoading && (
            <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Loader2 size={13} className="animate-spin" />
              Đang tải đánh giá của bạn…
            </div>
          )}
          {!myReviewLoading && myReview && !showForm && (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">
                Đánh giá của bạn
              </p>
              <ReviewCard
                review={{
                  ...myReview,
                  learnerName: myReview.learnerName ?? authUser?.fullName ?? undefined,
                  learnerAvatarUrl: myReview.learnerAvatarUrl ?? authUser?.avatarUrl ?? undefined,
                }}
                isOwn
                onEdit={() => openEdit(myReview)}
                onDelete={() => setShowDeleteConfirm(true)}
                onReport={() => {}}
                showReport={false}
              />
            </div>
          )}
          {!myReviewLoading && !myReview && !showForm && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-primary/25 bg-primary/[0.06] px-4 py-2.5 text-[13px] font-semibold text-primary hover:bg-primary/[0.1] transition-colors"
            >
              <Star size={14} />
              Viết đánh giá
            </button>
          )}

          {/* Create / Edit form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-[10px] border border-primary/20 bg-primary/[0.03] p-4 space-y-3"
            >
              <p className="text-[13px] font-semibold text-on-surface">
                {editMode ? "Chỉnh sửa đánh giá" : "Viết đánh giá"}
              </p>
              <div className="space-y-1">
                <p className="text-[11px] text-on-surface-variant">Số sao *</p>
                <StarPicker value={formRating} onChange={setFormRating} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-on-surface-variant">Nhận xét (tuỳ chọn)</p>
                  <span className={cn(
                    "text-[11px] tabular-nums",
                    formComment.length > 950 ? "text-red-500" : "text-on-surface-variant/60",
                  )}>
                    {formComment.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[13px] outline-none focus:border-primary"
                  placeholder="Chia sẻ trải nghiệm của bạn…"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  <AlertCircle size={12} className="shrink-0" />
                  {formError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReview}
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary disabled:opacity-60"
                >
                  {formSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {editMode ? "Lưu thay đổi" : "Gửi đánh giá"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-[8px] px-4 py-2 text-[13px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Huỷ
                </button>
              </div>
            </motion.div>
          )}

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-[13px] font-semibold text-red-800">Xoá đánh giá?</p>
              <p className="text-[12px] text-red-700">Hành động này không thể hoàn tác.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteReview}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-[8px] bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  {deleting && <Loader2 size={12} className="animate-spin" />}
                  Xoá
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-[8px] px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-red-100 transition-colors"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort + filter controls — only when the coach has reviews to sort */}
      {hasAnyReviews && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-on-surface-variant">Sắp xếp:</span>
        <div className="flex gap-1">
          {REVIEW_SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => { setSortBy(o.key); setPage(1); }}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                sortBy === o.key
                  ? "border-primary/30 bg-primary/[0.08] text-primary"
                  : "border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="ml-2 text-[12px] text-on-surface-variant">Lọc:</span>
        <div className="flex gap-1">
          {[undefined, 5, 4, 3, 2, 1].map((r) => (
            <button
              key={r ?? "all"}
              onClick={() => { setRatingFilter(r); setPage(1); }}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                ratingFilter === r
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low",
              )}
            >
              {r == null ? "Tất cả" : `${r}★`}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Review list */}
      {listLoading && (
        <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
          <Loader2 size={14} className="animate-spin" />
          Đang tải…
        </div>
      )}
      {!listLoading && reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[var(--color-border-soft)] px-4 py-7 text-center">
          <MessageSquare size={22} className="mb-1 text-on-surface-variant/30" />
          <p className="text-[13px] font-medium text-on-surface">Chưa có đánh giá nào.</p>
          <p className="max-w-[320px] text-[12px] text-on-surface-variant">
            Các đánh giá sẽ xuất hiện sau khi học viên hoàn thành buổi học với huấn luyện viên.
          </p>
        </div>
      )}
      {!listLoading && reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map((r) => {
            const enriched = enrichReview(r);
            const isOwn = !!authUser && r.learnerId === authUser.id;
            return (
              <ReviewCard
                key={r.id}
                review={enriched}
                isOwn={isOwn}
                onEdit={() => openEdit(r)}
                onDelete={() => setShowDeleteConfirm(true)}
                onReport={openReport}
                showReport={!!isOwnCoachProfile}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(hasNext || page > 1) && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              ← Trước
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-1.5 text-[12px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Tiếp <ChevronDown size={12} className="-rotate-90" />
            </button>
          )}
        </div>
      )}

      {/* Report modal */}
      <AnimatePresence>
        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setReportTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: EASE_LOCAL }}
              className="relative z-10 w-full max-w-[440px] rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_20px_60px_-12px_rgba(15,15,30,0.25)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-red-50">
                    <Flag size={15} className="text-red-500" />
                  </div>
                  <p className="text-[14px] font-semibold text-on-surface">Báo cáo đánh giá</p>
                </div>
                <button
                  onClick={() => setReportTarget(null)}
                  className="rounded-[7px] p-1.5 text-on-surface-variant hover:bg-surface-container-low"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-on-surface-variant">
                  Lý do báo cáo *
                </label>
                <div className="relative">
                  <select
                    className="w-full cursor-pointer appearance-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 pr-9 text-[13px] outline-none focus:border-primary"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="" disabled>
                      Chọn lý do báo cáo…
                    </option>
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-on-surface-variant">
                  Mô tả thêm (tuỳ chọn)
                </label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3 py-2 text-[13px] outline-none focus:border-primary"
                  placeholder="Chi tiết thêm về vấn đề…"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReportSubmit}
                  disabled={reportSubmitting || !reportReasonValid}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-red-600 px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reportSubmitting && <Loader2 size={12} className="animate-spin" />}
                  Gửi báo cáo
                </button>
                <button
                  onClick={() => setReportTarget(null)}
                  className="rounded-[8px] px-4 py-2 text-[13px] text-on-surface-variant hover:bg-surface-container-low"
                >
                  Huỷ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
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
  onViewDetail,
  delay,
}: {
  packages: PublicPackage[];
  loading: boolean;
  isMock: boolean;
  coachName: string;
  selectedPackageId: string | null;
  onSelect: (id: string) => void;
  onViewDetail: (id: string) => void;
  delay: number;
}) {
  const firstName = coachName.split(" ")[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)] sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary">
          <Package size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-on-surface leading-tight">
            Gói tập của {firstName}
          </h2>
          <p className="text-[12px] text-on-surface-variant">
            Chọn gói phù hợp với mục tiêu luyện tập của bạn
          </p>
        </div>
      </div>

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
          {packages.map((pkg, index) => (
            <CoachPackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={pkg.id === selectedPackageId}
              isRecommended={index === 0}
              onSelect={() => onSelect(pkg.id)}
              onViewDetail={() => onViewDetail(pkg.id)}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)] sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-on-surface leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12px] text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
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

function TrustRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0">{icon}</span>
      <span className="text-[11.5px] text-on-surface-variant">{children}</span>
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

function MediaMiniCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const url = item.mediaUrl ?? "";
  const isImage = url ? looksLikeImage(url) : false;
  const cfg = mediaTypeCfg(item.mediaType);
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-[12px] border border-[var(--color-border-soft)]"
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
    </button>
  );
}

// ── MediaLightbox ───────────────────────────────────────────────────────────
// Full-screen popup viewer for a coach's media. Browse with ←/→ or the on-screen
// arrows; close with Esc, the ✕, or a backdrop click. Non-image media (e.g. PDF)
// falls back to an "open link" button.

function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const item = items[index];
  const url = item?.mediaUrl ?? "";
  const isImage = url ? looksLikeImage(url) : false;
  const cfg = mediaTypeCfg(item?.mediaType);
  const Icon = cfg.icon;
  const hasMultiple = items.length > 1;

  const goPrev = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate],
  );
  const goNext = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasMultiple) goPrev();
      else if (e.key === "ArrowRight" && hasMultiple) goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext, hasMultiple]);

  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {/* Prev */}
      {hasMultiple && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Trước"
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Content */}
      <motion.div
        key={index}
        className="relative z-[1] flex max-h-full max-w-full flex-col items-center"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {isImage ? (
          <img
            src={url}
            alt={item.title ?? cfg.label}
            className="max-h-[82vh] max-w-[90vw] rounded-[12px] object-contain shadow-2xl"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-[16px] bg-surface-container-lowest p-10">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-[16px] bg-gradient-to-br",
                cfg.gradient,
              )}
            >
              <Icon size={36} className="text-white/90" />
            </div>
            <p className="text-[14px] font-medium text-on-surface">
              {item.title ?? cfg.label}
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-[#2d20b8]"
              >
                <ExternalLink size={14} />
                Mở liên kết
              </a>
            )}
          </div>
        )}

        {/* Caption */}
        {(item.title || hasMultiple) && (
          <div className="mt-3 flex items-center gap-2 text-white/90">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
              {cfg.label}
            </span>
            {item.title && <span className="text-[13px]">{item.title}</span>}
            {hasMultiple && (
              <span className="text-[12px] tabular-nums text-white/60">
                {index + 1}/{items.length}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Next */}
      {hasMultiple && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Sau"
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </motion.div>
  );
}
