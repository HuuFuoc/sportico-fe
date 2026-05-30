"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { BookSessionButton } from "@/components/common/BookSessionButton";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
          title="Không tải được hồ sơ"
          message="Máy chủ không phản hồi hoặc đã xảy ra lỗi. Vui lòng thử lại."
          onRetry={refetch}
          className="mx-auto mt-10 max-w-md"
        />
      </AppShell>
    );
  }

  if (!coach) notFound();

  const hasRating = coach.rating > 0 && coach.reviewCount > 0;
  const hasPrice = coach.hourlyRate > 0;
  const firstName = coach.name.split(" ")[0];

  return (
    <AppShell role="learner" title={coach.name}>
      <div className="max-w-[1200px] space-y-6">
        {/* Back nav */}
        <Link
          href="/learner/coaches"
          className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant transition-colors hover:text-primary"
        >
          <MaterialIcon name="arrow_back" size={16} />
          Quay lại danh sách HLV
        </Link>

        {/* Profile header card */}
        <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6">
          <div className="flex flex-col gap-5 md:flex-row">
            {/* Avatar */}
            <img
              src={coach.avatarUrl}
              alt={coach.name}
              className="h-28 w-28 shrink-0 rounded-[12px] object-cover"
            />

            {/* Identity */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">
                  {coach.name}
                </h1>
                {coach.verified && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                    <MaterialIcon name="verified" filled size={15} />
                    Đã xác minh
                  </span>
                )}
              </div>

              <p className="text-[14px] text-on-surface-variant">
                {coach.headline}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap gap-4 text-[13px] text-on-surface-variant">
                {hasRating && (
                  <span className="inline-flex items-center gap-1">
                    <MaterialIcon
                      name="star"
                      filled
                      size={15}
                      className="text-amber-500"
                    />
                    <span className="font-semibold text-on-surface">
                      {coach.rating.toFixed(1)}
                    </span>
                    ({coach.reviewCount} đánh giá)
                  </span>
                )}
                {coach.yearsExperience > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MaterialIcon name="timer" size={15} />
                    {coach.yearsExperience} năm kinh nghiệm
                  </span>
                )}
                {coach.activeLearners > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MaterialIcon name="groups" size={15} />
                    {coach.activeLearners} học viên đang tập
                  </span>
                )}
                {coach.location?.trim() && (
                  <span className="inline-flex items-center gap-1">
                    <MaterialIcon name="location_on" size={15} />
                    {coach.location}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col md:items-end md:min-w-[170px]">
              <button
                type="button"
                onClick={handleMessage}
                disabled={messaging}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {messaging && (
                  <MaterialIcon
                    name="progress_activity"
                    size={16}
                    className="animate-spin"
                  />
                )}
                {messaging ? "Đang mở…" : "Nhắn tin"}
              </button>
              <BookSessionButton coachId={id} packageId={coach.packageId} />
              {messageError && (
                <p
                  role="alert"
                  className="max-w-[260px] text-[12px] text-error md:text-right"
                >
                  {messageError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-8">
            {/* Media / cover image */}
            <div className="relative aspect-video overflow-hidden rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low">
              <img
                src={coach.avatarUrl}
                alt={coach.name}
                className="h-full w-full object-cover opacity-60 transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-110 cursor-pointer">
                  <MaterialIcon name="play_arrow" filled size={28} />
                </div>
              </div>
            </div>

            {/* Specialties grid */}
            {coach.specialties.length > 0 && (
              <section>
                <h2 className="mb-3 text-[16px] font-semibold text-on-surface">
                  Chuyên môn
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {coach.specialties.map((sp) => (
                    <div
                      key={sp}
                      className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4"
                    >
                      <MaterialIcon
                        name="fitness_center"
                        size={20}
                        className="mb-2 text-primary"
                      />
                      <p className="text-[14px] font-semibold text-on-surface">
                        {sp}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* About */}
            <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6">
              <h2 className="mb-3 text-[16px] font-semibold text-on-surface">
                Giới thiệu về {firstName}
              </h2>
              <p className="text-[14px] leading-relaxed text-on-surface-variant">
                {coach.bio}
              </p>
              {coach.specialties.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {coach.specialties.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[6px] bg-surface-container-high px-2.5 py-1 text-[12px] text-on-surface-variant"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-on-surface">
                  Đánh giá từ học viên
                </h2>
                {hasRating && (
                  <span className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                    <MaterialIcon
                      name="star"
                      filled
                      size={14}
                      className="text-amber-500"
                    />
                    <span className="font-semibold text-on-surface">
                      {coach.rating.toFixed(1)}
                    </span>
                    · {coach.reviewCount} đánh giá
                  </span>
                )}
              </div>

              {hasRating ? (
                <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 text-center">
                  <MaterialIcon
                    name="rate_review"
                    size={28}
                    className="mx-auto text-on-surface-variant/50"
                  />
                  <p className="mt-2 text-[14px] font-medium text-on-surface">
                    {coach.reviewCount} đánh giá
                  </p>
                  <p className="mt-1 text-[13px] text-on-surface-variant">
                    Đánh giá chi tiết sẽ hiển thị sau khi tích hợp backend.
                  </p>
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-8 text-center">
                  <MaterialIcon
                    name="rate_review"
                    size={28}
                    className="mx-auto text-on-surface-variant/40"
                  />
                  <p className="mt-2 text-[14px] text-on-surface-variant">
                    HLV này chưa có đánh giá.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-20">
              {/* AI compatibility */}
              {typeof coach.matchPercent === "number" &&
                coach.matchPercent > 0 && (
                  <div className="rounded-[12px] border border-primary/15 bg-primary/5 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <MaterialIcon name="psychology" filled size={20} />
                        <span className="text-[14px] font-semibold">
                          Độ phù hợp với AI
                        </span>
                      </div>
                      <span
                        className="text-[22px] font-bold text-primary"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {coach.matchPercent}%
                      </span>
                    </div>
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-outline-variant/40">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${coach.matchPercent}%` }}
                      />
                    </div>
                    <p className="text-[12px] text-on-surface-variant">
                      <span className="font-medium text-primary">
                        Phù hợp cao
                      </span>{" "}
                      — dựa trên mục tiêu và phong cách tập luyện của bạn.
                    </p>
                  </div>
                )}

              {/* Booking card */}
              <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 space-y-4">
                <div>
                  <p className="text-[14px] font-semibold text-on-surface">
                    {coach.sport} · {coach.yearsExperience > 0 ? `${coach.yearsExperience} năm kinh nghiệm` : "Huấn luyện cá nhân"}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    {hasPrice ? (
                      <>
                        <span
                          className="text-[22px] font-bold text-primary"
                          style={{ letterSpacing: "-0.02em" }}
                        >
                          {formatCurrency(coach.hourlyRate, coach.currency)}
                        </span>
                        <span className="text-[13px] text-on-surface-variant">
                          / buổi
                        </span>
                      </>
                    ) : (
                      <span className="text-[14px] text-on-surface-variant">
                        Liên hệ để biết học phí
                      </span>
                    )}
                  </div>
                </div>
                <BookSessionButton
                  coachId={id}
                  packageId={coach.packageId}
                  className="w-full"
                />
                <p className="text-center text-[12px] text-on-surface-variant">
                  Thanh toán an toàn qua PayOS
                </p>
              </div>

              {/* Coach quick stats */}
              <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
                <div className="grid grid-cols-2 gap-3">
                  {hasRating && (
                    <div className="text-center">
                      <p className="text-[18px] font-bold text-on-surface tabular-nums">
                        {coach.rating.toFixed(1)}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Đánh giá TB
                      </p>
                    </div>
                  )}
                  {coach.reviewCount > 0 && (
                    <div className="text-center">
                      <p className="text-[18px] font-bold text-on-surface tabular-nums">
                        {coach.reviewCount}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Lượt đánh giá
                      </p>
                    </div>
                  )}
                  {coach.activeLearners > 0 && (
                    <div className="text-center">
                      <p className="text-[18px] font-bold text-on-surface tabular-nums">
                        {coach.activeLearners}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Học viên
                      </p>
                    </div>
                  )}
                  {coach.yearsExperience > 0 && (
                    <div className="text-center">
                      <p className="text-[18px] font-bold text-on-surface tabular-nums">
                        {coach.yearsExperience}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Năm kinh nghiệm
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
