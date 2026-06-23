"use client";

// ============================================================================
// CoachPublicProfilePreview — presentational view of how a coach's profile
// looks to learners. Receives all data via props (no API calls), so it can be
// reused both inside /coach/profile (live preview of the edit form, including
// unsaved changes) and anywhere a read-only public-style card is needed.
// ============================================================================

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
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Video,
  Wifi,
} from "lucide-react";
import { TiltedCard } from "@/components/ui/TiltedCard";
import {
  trainingPackageStatusLabel,
  trainingPackageStatusBadge,
} from "@/lib/training-package-api";
import { parseFocal, stripFocal, focalToCss } from "@/lib/image-focal";
import { cn } from "@/lib/utils";
import type { CoachProfileMediaResponse } from "@/lib/types/coach";
import type { TrainingPackageResponse } from "@/lib/backend/dto";

const EASE = [0.16, 1, 0.3, 1] as const;

// Public-facing profile fields. Accepts both server data and live form values.
export interface CoachPreviewData {
  coverImageUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  rating?: number;
  totalReviews?: number;
  isOnlineAvailable?: boolean;
  isOfflineAvailable?: boolean;
  teachingCity?: string | null;
  teachingDistrict?: string | null;
  teachingAddress?: string | null;
  specialties?: string | null;
  certificationsSummary?: string | null;
  achievementsSummary?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
}

// ── Type config ────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

export function CoachPublicProfilePreview({
  profile,
  media,
  packages,
  packagesLoading = false,
  displayName,
  avatarUrl,
  email,
  isPreview = false,
}: {
  profile: CoachPreviewData;
  media: CoachProfileMediaResponse[];
  packages: TrainingPackageResponse[];
  packagesLoading?: boolean;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  isPreview?: boolean;
}) {
  const coverPos = focalToCss(parseFocal(profile.coverImageUrl));
  const hasLocation = Boolean(
    profile.teachingCity || profile.teachingDistrict || profile.teachingAddress,
  );
  const specialtyTags = (profile.specialties ?? "")
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[900px]">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative mb-6 overflow-hidden rounded-[20px] shadow-[0_8px_32px_-8px_rgba(15,15,30,0.18)]"
      >
        <div className="relative h-48 sm:h-60">
          {profile.coverImageUrl ? (
            <img
              src={stripFocal(profile.coverImageUrl)}
              alt="Ảnh bìa"
              className="h-full w-full object-cover"
              style={{ objectPosition: coverPos }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary via-[#7d6dff] to-[#c084fc]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* "Bản xem trước" ribbon */}
        {isPreview && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Eye size={12} />
            Bản xem trước
          </span>
        )}

        {/* Avatar + identity */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-6 pb-5">
          <div className="shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
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
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold leading-tight text-white">
                {displayName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Sparkles size={10} />
                Huấn luyện viên
              </span>
            </div>
            {profile.headline ? (
              <p className="mt-0.5 truncate text-[13px] text-white/75">
                {profile.headline}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-[13px] italic text-white/55">
                Chưa cập nhật tiêu đề hồ sơ
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-white/60">
              {(profile.rating ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold tabular-nums text-white/80">
                    {(profile.rating ?? 0).toFixed(1)}
                  </span>
                  <span className="tabular-nums">({profile.totalReviews ?? 0})</span>
                </span>
              )}
              {profile.experienceYears != null && profile.experienceYears > 0 && (
                <span>{profile.experienceYears} năm kinh nghiệm</span>
              )}
              {(profile.isOnlineAvailable || profile.isOfflineAvailable) && (
                <span className="flex items-center gap-1">
                  {profile.isOnlineAvailable && <Wifi size={11} />}
                  {profile.isOfflineAvailable && <MapPin size={11} />}
                  {profile.isOnlineAvailable && profile.isOfflineAvailable
                    ? "Trực tuyến & Trực tiếp"
                    : profile.isOnlineAvailable
                      ? "Trực tuyến"
                      : "Trực tiếp"}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* ── Tổng quan ───────────────────────────────────────────────── */}
        <Section title="Tổng quan" delay={0.06}>
          {profile.bio ? (
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-on-surface-variant">
              {profile.bio}
            </p>
          ) : (
            <Placeholder>Chưa cập nhật giới thiệu.</Placeholder>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {hasLocation ? (
              <InfoChip icon={<MapPin size={13} />}>
                {[profile.teachingDistrict, profile.teachingCity]
                  .filter(Boolean)
                  .join(", ") ||
                  profile.teachingAddress ||
                  "Chưa cập nhật"}
              </InfoChip>
            ) : (
              <InfoChip icon={<MapPin size={13} />} muted>
                Chưa cập nhật địa điểm dạy
              </InfoChip>
            )}
            {profile.isOnlineAvailable && (
              <InfoChip icon={<Wifi size={13} />}>Dạy trực tuyến</InfoChip>
            )}
            {profile.isOfflineAvailable && (
              <InfoChip icon={<Video size={13} />}>Dạy trực tiếp</InfoChip>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <KpiTile
              label="Kinh nghiệm"
              value={
                profile.experienceYears ? `${profile.experienceYears} năm` : "—"
              }
            />
            <KpiTile
              label="Đánh giá"
              value={
                (profile.rating ?? 0) > 0
                  ? (profile.rating ?? 0).toFixed(1)
                  : "—"
              }
            />
            <KpiTile
              label="Lượt đánh giá"
              value={
                (profile.totalReviews ?? 0) > 0
                  ? String(profile.totalReviews)
                  : "—"
              }
            />
          </div>
        </Section>

        {/* ── Chuyên môn ──────────────────────────────────────────────── */}
        <Section title="Chuyên môn" delay={0.1}>
          {specialtyTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {specialtyTags.map((tag, i) => (
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

        {/* ── Chứng chỉ & Thành tích ──────────────────────────────────── */}
        <Section title="Chứng chỉ & Thành tích" delay={0.14}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-indigo-600">
                <BadgeCheck size={14} />
                Chứng chỉ
              </div>
              {profile.certificationsSummary ? (
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-on-surface-variant">
                  {profile.certificationsSummary}
                </p>
              ) : (
                <Placeholder>Chưa có chứng chỉ.</Placeholder>
              )}
            </div>
            <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-amber-600">
                <Trophy size={14} />
                Thành tích
              </div>
              {profile.achievementsSummary ? (
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-on-surface-variant">
                  {profile.achievementsSummary}
                </p>
              ) : (
                <Placeholder>Chưa có thành tích nổi bật.</Placeholder>
              )}
            </div>
          </div>
        </Section>

        {/* ── Media nổi bật ───────────────────────────────────────────── */}
        <Section title="Media nổi bật" delay={0.18}>
          {media.length === 0 ? (
            <Placeholder>
              Chưa có media. Thêm chứng chỉ, giải thưởng hoặc hình ảnh để tăng độ
              tin cậy với học viên.
            </Placeholder>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.slice(0, 8).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.04, ease: EASE }}
                >
                  <TiltedCard maxTilt={8} scaleOnHover={1.03}>
                    <MediaMiniCard item={m} />
                  </TiltedCard>
                </motion.div>
              ))}
            </div>
          )}
          {media.length > 8 && (
            <p className="mt-3 text-[12.5px] text-on-surface-variant">
              + {media.length - 8} media khác
            </p>
          )}
        </Section>

        {/* ── Gói tập ─────────────────────────────────────────────────── */}
        <Section title="Gói tập" delay={0.22}>
          {packagesLoading ? (
            <p className="text-[13px] text-on-surface-variant">Đang tải…</p>
          ) : packages.length === 0 ? (
            <Placeholder>Chưa có gói tập nào.</Placeholder>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14px] font-semibold text-on-surface">
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
                      <span className="font-medium tabular-nums text-on-surface">
                        {pkg.price.toLocaleString("vi-VN")}đ
                      </span>{" "}
                      • {pkg.sessionCount} buổi • {pkg.durationDays} ngày
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Liên kết & Liên hệ ──────────────────────────────────────── */}
        <Section title="Liên kết & Liên hệ" delay={0.26}>
          {email || profile.facebookUrl || profile.instagramUrl || profile.websiteUrl ? (
            <div className="flex flex-wrap gap-2">
              {email && (
                <SocialLink
                  href={`mailto:${email}`}
                  icon={<Globe size={14} />}
                  label={email}
                />
              )}
              {profile.facebookUrl && (
                <SocialLink
                  href={profile.facebookUrl}
                  icon={<LinkIcon size={14} />}
                  label="Facebook"
                />
              )}
              {profile.instagramUrl && (
                <SocialLink
                  href={profile.instagramUrl}
                  icon={<LinkIcon size={14} />}
                  label="Instagram"
                />
              )}
              {profile.websiteUrl && (
                <SocialLink
                  href={profile.websiteUrl}
                  icon={<Globe size={14} />}
                  label="Website"
                />
              )}
            </div>
          ) : (
            <Placeholder>Chưa cập nhật liên kết.</Placeholder>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
      transition={{ duration: 0.4, delay, ease: EASE }}
      className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04)]"
    >
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        {title}
      </h2>
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
  muted,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-1 text-[12.5px]",
        muted ? "italic text-on-surface-variant/60" : "text-on-surface-variant",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low p-3 text-center">
      <p className="text-[20px] font-bold tabular-nums tracking-tight text-on-surface">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-on-surface-variant">{label}</p>
    </div>
  );
}

function MediaMiniCard({ item }: { item: CoachProfileMediaResponse }) {
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
        <p className="absolute bottom-0 left-0 right-0 translate-y-1 px-2 pb-2 text-[10.5px] font-medium text-white opacity-0 transition-all line-clamp-2 group-hover:translate-y-0 group-hover:opacity-100">
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
