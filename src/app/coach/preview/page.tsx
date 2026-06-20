"use client";

// ============================================================================
// /coach/preview — Professional profile preview
//
// Shows the coach exactly how their profile looks to the public. All data from:
//   GET /api/coaches/me              → CoachProfileResponse (profile + media)
//   GET /api/training-packages/me   → PagedResult<TrainingPackageResponse>
//   useAuthStore.user                → CurrentUserResponse (name, avatar, email)
//
// Read-only: no forms. Edit buttons link to /coach/profile, /coach/media,
// /coach/training-packages.
//
// TODO(api): basic user info update (fullName, avatarUrl, phone, dateOfBirth)
// is not implemented because no confirmed PUT /api/users/me endpoint exists in
// the current backend. See CurrentUserResponse in dto.ts for the fields when
// the backend adds it.
// ============================================================================

import Link from "next/link";
import { motion } from "motion/react";
import {
  BadgeCheck,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Video,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TiltedCard } from "@/components/ui/TiltedCard";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getMyCoachProfile } from "@/lib/coach-api";
import { getMyTrainingPackages } from "@/lib/training-package-api";
import {
  trainingPackageStatusLabel,
  trainingPackageStatusBadge,
} from "@/lib/training-package-api";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { messageForApiError } from "@/lib/errors-vi";
import { parseFocal, stripFocal, focalToCss } from "@/lib/image-focal";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { CoachProfileMediaResponse } from "@/lib/types/coach";

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Type config (mirrors coach/media page) ────────────────────────────────────

const TYPE_CONFIG: Record<
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
  return TYPE_CONFIG[(mediaType ?? "other").toLowerCase()] ?? TYPE_CONFIG.other;
}

function looksLikeImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url.trim());
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CoachPreviewPage() {
  const authUser = useAuthStore((s) => s.user);

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useApiResource(() => getMyCoachProfile(), []);

  const {
    data: packagesResult,
    loading: packagesLoading,
  } = useApiResource(() => getMyTrainingPackages({ pageSize: 12 }), []);

  const packages = packagesResult?.items ?? [];
  const media: CoachProfileMediaResponse[] = profile?.media ?? [];

  // The cover focal point travels with the coverImageUrl (#pos=x,y fragment),
  // so this preview shows the exact same crop learners see on the public page.
  const coverPos = focalToCss(parseFocal(profile?.coverImageUrl));

  const loading = profileLoading;
  const error = profileError;

  const displayName = authUser?.fullName ?? "Chưa cập nhật";
  const displayAvatar = authUser?.avatarUrl ?? null;
  const displayEmail = authUser?.email ?? null;

  const hasLocation =
    profile?.teachingCity || profile?.teachingDistrict || profile?.teachingAddress;

  if (loading) {
    return (
      <AppShell role="coach" title="Xem hồ sơ">
        <LoadingState label="Đang tải hồ sơ…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="coach" title="Xem hồ sơ">
        <ErrorState
          message={messageForApiError(error)}
          onRetry={refetchProfile}
          className="mx-auto mt-16 max-w-md"
        />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="Xem hồ sơ">
      <div className="mx-auto max-w-[900px] pb-20">
        {/* ── Hero section ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="relative mb-6 overflow-hidden rounded-[20px] shadow-[0_8px_32px_-8px_rgba(15,15,30,0.18)]"
        >
          {/* Cover image */}
          <div className="relative h-48 sm:h-60">
            {profile?.coverImageUrl ? (
              <img
                src={stripFocal(profile.coverImageUrl)}
                alt="Ảnh bìa"
                className="h-full w-full object-cover"
                style={{ objectPosition: coverPos }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary via-[#7d6dff] to-[#c084fc]" />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>

          {/* Avatar + identity */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-6 pb-5">
            <div className="shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="h-[96px] w-[96px] rounded-full border-4 border-white/20 object-cover object-center shadow-lg ring-2 ring-white/10"
                />
              ) : (
                <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-white/70 shadow-lg backdrop-blur-sm ring-2 ring-white/10">
                  <span className="text-3xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-bold text-white leading-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  <Sparkles size={10} />
                  Huấn luyện viên
                </span>
              </div>
              {profile?.headline && (
                <p className="mt-0.5 text-[13px] text-white/75 truncate">
                  {profile.headline}
                </p>
              )}
              {profile && (
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-white/60">
                  {profile.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-white/80 tabular-nums">
                        {profile.rating.toFixed(1)}
                      </span>
                      <span className="tabular-nums">
                        ({profile.totalReviews})
                      </span>
                    </span>
                  )}
                  {profile.experienceYears != null &&
                    profile.experienceYears > 0 && (
                      <span>{profile.experienceYears} năm kinh nghiệm</span>
                    )}
                  {(profile.isOnlineAvailable || profile.isOfflineAvailable) && (
                    <span className="flex items-center gap-1">
                      {profile.isOnlineAvailable && <Wifi size={11} />}
                      {profile.isOfflineAvailable && <MapPin size={11} />}
                      {profile.isOnlineAvailable && profile.isOfflineAvailable
                        ? "Online & Offline"
                        : profile.isOnlineAvailable
                          ? "Online"
                          : "Offline"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Edit button */}
          <Link
            href="/coach/profile"
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-[8px] bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <Pencil size={12} />
            Chỉnh sửa
          </Link>
        </motion.div>

        {/* ── Quick actions strip ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
          className="mb-8 flex flex-wrap gap-2"
        >
          <Link
            href="/coach/profile"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Pencil size={13} />
            Chỉnh sửa hồ sơ
          </Link>
          <Link
            href="/coach/media"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <ImageIcon size={13} />
            Quản lý media
          </Link>
          <Link
            href="/coach/training-packages"
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2 text-[12.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Eye size={13} />
            Quản lý gói tập
          </Link>
        </motion.div>

        <div className="space-y-6">
          {/* ── Tổng quan ─────────────────────────────────────────────── */}
          <Section title="Tổng quan" delay={0.12}>
            {profile?.bio ? (
              <p className="text-[14px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                {profile.bio}
              </p>
            ) : (
              <Placeholder>Chưa cập nhật tiểu sử.</Placeholder>
            )}

            {/* Location + availability */}
            {(hasLocation ||
              profile?.isOnlineAvailable ||
              profile?.isOfflineAvailable) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {hasLocation && (
                  <InfoChip icon={<MapPin size={13} />}>
                    {[
                      profile?.teachingDistrict,
                      profile?.teachingCity,
                    ]
                      .filter(Boolean)
                      .join(", ") || profile?.teachingAddress || "Chưa cập nhật"}
                  </InfoChip>
                )}
                {profile?.isOnlineAvailable && (
                  <InfoChip icon={<Wifi size={13} />}>Dạy Online</InfoChip>
                )}
                {profile?.isOfflineAvailable && (
                  <InfoChip icon={<Video size={13} />}>Dạy Offline</InfoChip>
                )}
              </div>
            )}

            {/* KPI strip */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <KpiTile
                label="Kinh nghiệm"
                value={
                  profile?.experienceYears
                    ? `${profile.experienceYears} năm`
                    : "—"
                }
              />
              <KpiTile
                label="Đánh giá"
                value={
                  profile && profile.rating > 0
                    ? profile.rating.toFixed(1)
                    : "—"
                }
              />
              <KpiTile
                label="Lượt đánh giá"
                value={
                  profile && profile.totalReviews > 0
                    ? String(profile.totalReviews)
                    : "—"
                }
              />
            </div>
          </Section>

          {/* ── Chuyên môn ────────────────────────────────────────────── */}
          <Section title="Chuyên môn" delay={0.16}>
            {profile?.specialties ? (
              <div className="flex flex-wrap gap-2">
                {profile.specialties
                  .split(/[,;|\n]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-[12.5px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            ) : (
              <Placeholder>Chưa cập nhật chuyên môn.</Placeholder>
            )}
          </Section>

          {/* ── Chứng chỉ & Thành tích ────────────────────────────────── */}
          <Section title="Chứng chỉ & Thành tích" delay={0.2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-indigo-600">
                  <BadgeCheck size={14} />
                  Chứng chỉ
                </div>
                {profile?.certificationsSummary ? (
                  <p className="text-[13.5px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                    {profile.certificationsSummary}
                  </p>
                ) : (
                  <Placeholder>Chưa cập nhật.</Placeholder>
                )}
              </div>
              <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-600">
                  <Trophy size={14} />
                  Thành tích
                </div>
                {profile?.achievementsSummary ? (
                  <p className="text-[13.5px] leading-relaxed text-on-surface-variant whitespace-pre-line">
                    {profile.achievementsSummary}
                  </p>
                ) : (
                  <Placeholder>Chưa cập nhật.</Placeholder>
                )}
              </div>
            </div>
          </Section>

          {/* ── Media nổi bật ─────────────────────────────────────────── */}
          <Section
            title="Media nổi bật"
            action={
              <Link
                href="/coach/media"
                className="text-[12px] font-medium text-primary hover:underline"
              >
                Quản lý media
              </Link>
            }
            delay={0.24}
          >
            {media.length === 0 ? (
              <Placeholder>
                Chưa có media. Hãy thêm chứng chỉ, giải thưởng hoặc hình ảnh.
              </Placeholder>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.slice(0, 8).map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26 + i * 0.04, ease: EASE }}
                  >
                    <TiltedCard maxTilt={8} scaleOnHover={1.03}>
                      <MediaMiniCard item={m} />
                    </TiltedCard>
                  </motion.div>
                ))}
              </div>
            )}
            {media.length > 8 && (
              <Link
                href="/coach/media"
                className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-on-surface-variant hover:text-primary"
              >
                <ExternalLink size={12} />
                Xem tất cả {media.length} media
              </Link>
            )}
          </Section>

          {/* ── Gói tập ───────────────────────────────────────────────── */}
          <Section
            title="Gói tập đang quản lý"
            action={
              <Link
                href="/coach/training-packages"
                className="text-[12px] font-medium text-primary hover:underline"
              >
                Quản lý gói tập
              </Link>
            }
            delay={0.28}
          >
            {packagesLoading ? (
              <p className="text-[13px] text-on-surface-variant">Đang tải…</p>
            ) : packages.length === 0 ? (
              <Placeholder>
                Chưa có gói tập nào. Tạo gói tập đầu tiên của bạn.
              </Placeholder>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-on-surface truncate">
                          {pkg.title ?? "Gói tập"}
                        </p>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
                            trainingPackageStatusBadge(pkg.status),
                          )}
                        >
                          {trainingPackageStatusLabel(pkg.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-on-surface-variant">
                        {pkg.sportName ?? "—"} •{" "}
                        <span className="tabular-nums font-medium text-on-surface">
                          {pkg.price.toLocaleString("vi-VN")}đ
                        </span>{" "}
                        • {pkg.sessionCount} buổi • {pkg.durationDays} ngày
                      </p>
                      {pkg.rejectionReason && (
                        <p className="mt-1 text-[11.5px] text-rose-600">
                          Lý do từ chối: {pkg.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Liên kết mạng xã hội ──────────────────────────────────── */}
          {(profile?.facebookUrl ||
            profile?.instagramUrl ||
            profile?.websiteUrl ||
            displayEmail) && (
            <Section title="Liên kết & Liên hệ" delay={0.32}>
              <div className="flex flex-wrap gap-2">
                {displayEmail && (
                  <SocialLink
                    href={`mailto:${displayEmail}`}
                    icon={<Globe size={14} />}
                    label={displayEmail}
                  />
                )}
                {profile?.facebookUrl && (
                  <SocialLink
                    href={profile.facebookUrl}
                    icon={<LinkIcon size={14} />}
                    label="Facebook"
                  />
                )}
                {profile?.instagramUrl && (
                  <SocialLink
                    href={profile.instagramUrl}
                    icon={<LinkIcon size={14} />}
                    label="Instagram"
                  />
                )}
                {profile?.websiteUrl && (
                  <SocialLink
                    href={profile.websiteUrl}
                    icon={<Globe size={14} />}
                    label="Website"
                  />
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  action,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

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

function MediaMiniCard({ item }: { item: CoachProfileMediaResponse }) {
  const url = item.mediaUrl ?? "";
  const isImage = looksLikeImage(url);
  const cfg = mediaTypeCfg(item.mediaType);
  const Icon = cfg.icon;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square overflow-hidden rounded-[12px] border border-[var(--color-border-soft)]"
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

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-1.5 text-[12.5px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
    >
      {icon}
      {label}
      <ExternalLink size={11} className="opacity-50" />
    </a>
  );
}
