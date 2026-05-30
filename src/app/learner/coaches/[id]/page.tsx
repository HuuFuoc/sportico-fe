"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { BookSessionButton } from "@/components/common/BookSessionButton";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MOCK_REVIEWS = [
  {
    id: "r1",
    name: "Sarah J.",
    achievement: "PR: 3:02:14",
    rating: 5,
    when: "2 weeks ago",
    text: "Transformed my form in 3 sessions. Technical knowledge is unmatched.",
    avatar: "https://i.pravatar.cc/120?u=review-1",
  },
  {
    id: "r2",
    name: "Marcus T.",
    achievement: "Sub-19 5K",
    rating: 5,
    when: "1 month ago",
    text: "Plans are demanding but smart. Saw measurable gains within 6 weeks.",
    avatar: "https://i.pravatar.cc/120?u=review-2",
  },
  {
    id: "r3",
    name: "Emma L.",
    achievement: "New runner",
    rating: 4,
    when: "1 month ago",
    text: "Patient and detailed. Great at adapting drills to my level.",
    avatar: "https://i.pravatar.cc/120?u=review-3",
  },
];

export default function CoachProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [messaging, setMessaging] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const {
    data: coach,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoach(id), [id]);

  const handleMessage = async () => {
    if (messaging) return;
    setMessaging(true);
    setMessageError(null);
    try {
      const roomId = await api.findChatRoomWith(id);
      if (roomId) {
        router.push(`/learner/messages?thread=${encodeURIComponent(roomId)}`);
      } else {
        setMessageError(
          "Bạn chưa có cuộc trò chuyện với HLV này. Backend hiện chưa hỗ trợ tạo cuộc trò chuyện mới — vui lòng quay lại sau.",
        );
      }
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Không mở được tin nhắn. Vui lòng thử lại.",
      );
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="learner" title="Hồ sơ huấn luyện viên">
        <LoadingState label="Đang tải hồ sơ huấn luyện viên…" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="learner" title="Hồ sơ huấn luyện viên">
        <ErrorState
          title="Không tải được hồ sơ huấn luyện viên"
          message="Máy chủ không phản hồi hoặc đã xảy ra lỗi. Vui lòng thử lại."
          onRetry={refetch}
          className="mx-auto mt-10 max-w-md"
        />
      </AppShell>
    );
  }

  if (!coach) notFound();

  return (
    <AppShell role="learner" title={coach.name}>
      <div className="max-w-[1200px] space-y-6">
        {/* Back nav */}
        <Link
          href="/learner/coaches"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <MaterialIcon name="arrow_back" size={16} />
          Back to coaches
        </Link>

        {/* Header */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6 flex flex-col md:flex-row gap-6">
          <img
            src={coach.avatarUrl}
            alt={coach.name}
            className="w-32 h-32 rounded-[12px] object-cover shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 text-on-surface">{coach.name}</h1>
              {coach.verified && (
                <span className="inline-flex items-center gap-1 text-body-sm text-primary">
                  <MaterialIcon name="verified" filled size={16} />
                  Verified
                </span>
              )}
              <AIBadge label="Elite Pro" />
            </div>
            <p className="text-body-base text-on-surface-variant">
              {coach.headline}
            </p>
            <div className="flex flex-wrap gap-4 text-body-sm text-on-surface-variant">
              {coach.location && (
                <span className="inline-flex items-center gap-1">
                  <MaterialIcon name="location_on" size={16} />
                  {coach.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MaterialIcon
                  name="star"
                  filled
                  size={16}
                  className="text-amber-500"
                />
                {coach.rating.toFixed(1)} ({coach.reviewCount} reviews)
              </span>
              <span className="inline-flex items-center gap-1">
                <MaterialIcon name="timer" size={16} />
                {coach.yearsExperience} yrs experience
              </span>
              <span className="inline-flex items-center gap-1">
                <MaterialIcon name="groups" size={16} />
                {coach.activeLearners} active learners
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:items-end shrink-0 md:min-w-[180px]">
            <button
              type="button"
              onClick={handleMessage}
              disabled={messaging}
              className={cn(
                "px-5 py-2.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-base font-medium hover:bg-surface-container-low transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5",
              )}
            >
              {messaging && (
                <MaterialIcon
                  name="progress_activity"
                  size={16}
                  className="animate-spin"
                />
              )}
              {messaging ? "Đang mở…" : "Message"}
            </button>
            <BookSessionButton coachId={id} packageId={coach.packageId} />
            {messageError && (
              <p
                role="alert"
                className="text-body-sm text-error md:text-right max-w-[260px]"
              >
                {messageError}
              </p>
            )}
          </div>
        </section>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-8 space-y-6">
            {/* Intro video placeholder */}
            <div className="bg-surface-container-low border border-[var(--color-border-soft)] rounded-[12px] aspect-video relative overflow-hidden group cursor-pointer">
              <img
                src={coach.avatarUrl}
                alt=""
                className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MaterialIcon name="play_arrow" filled size={28} />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-on-primary font-medium">
                Why train with me? (2:14)
              </div>
            </div>

            {/* Specialties */}
            {coach.specialties.length > 0 && (
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {coach.specialties.map((sp) => (
                  <div
                    key={sp}
                    className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4"
                  >
                    <MaterialIcon
                      name="fitness_center"
                      size={20}
                      className="text-primary mb-2"
                    />
                    <p className="text-h3 mb-1">{sp}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      Specialized training in {sp.toLowerCase()}.
                    </p>
                  </div>
                ))}
              </section>
            )}

            {/* About */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6">
              <h2 className="text-h2 mb-3">About {coach.name.split(" ")[0]}</h2>
              <p className="text-body-base text-on-surface-variant leading-relaxed mb-4">
                {coach.bio}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Performance Testing",
                  "Periodization",
                  "Recovery Protocols",
                  "Video Analysis",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-surface-container-high text-body-sm rounded-[6px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h2">Client Reviews</h2>
                <button className="text-body-sm text-primary hover:underline">
                  View all {coach.reviewCount}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {MOCK_REVIEWS.map((r) => (
                  <article
                    key={r.id}
                    className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex gap-4"
                  >
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-body-base font-medium">
                          {r.name}{" "}
                          <span className="text-on-surface-variant font-normal">
                            — {r.achievement}
                          </span>
                        </p>
                        <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
                          {r.when}
                        </span>
                      </div>
                      <div className="flex text-amber-500 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <MaterialIcon
                            key={i}
                            name="star"
                            filled={i < r.rating}
                            size={14}
                            className={
                              i < r.rating
                                ? "text-amber-500"
                                : "text-surface-container-highest"
                            }
                          />
                        ))}
                      </div>
                      <p className="text-body-base text-on-surface-variant italic">
                        &quot;{r.text}&quot;
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Right (sticky widgets) */}
          <aside className="lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-20">
              {/* AI compat */}
              <div className="bg-primary/5 border border-primary/15 rounded-[12px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <MaterialIcon name="psychology" filled size={20} />
                    <span className="text-h3">AI Compatibility</span>
                  </div>
                  <span
                    className="text-h1 text-primary"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {coach.matchPercent ?? 87}%
                  </span>
                </div>
                <div className="w-full bg-outline-variant/40 h-1.5 rounded-full mb-3 overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${coach.matchPercent ?? 87}%` }}
                  />
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  <span className="text-primary font-medium">
                    Strong match
                  </span>{" "}
                  — Based on your goals & training style preferences.
                </p>
              </div>

              {/* Real package + booking CTA */}
              <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-5 space-y-4">
                <div>
                  <p className="text-h3 text-on-surface mb-1">
                    {coach.headline}
                  </p>
                  <div className="flex items-baseline gap-1">
                    {coach.hourlyRate > 0 ? (
                      <>
                        <span
                          className="text-h1 text-primary"
                          style={{ letterSpacing: "-0.02em" }}
                        >
                          {formatCurrency(coach.hourlyRate, coach.currency)}
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          / buổi
                        </span>
                      </>
                    ) : (
                      <span className="text-body-base text-on-surface-variant">
                        Liên hệ để biết giá
                      </span>
                    )}
                  </div>
                </div>
                <BookSessionButton
                  coachId={id}
                  packageId={coach.packageId}
                  className="w-full"
                />
                <p className="text-body-sm text-on-surface-variant text-center">
                  Thanh toán an toàn qua PayOS
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
