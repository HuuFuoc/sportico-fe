import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AnimatedNumber } from "@/components/landing/AnimatedNumber";
import { CoachShowcaseCard } from "@/components/landing/CoachShowcaseCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { AICoachCard } from "@/components/dashboard/AICoachCard";
import { api } from "@/lib/api";
import { devUserIdForRole } from "@/lib/auth";
import { NOW } from "@/lib/mock/clock";
import { cn, relativeDay } from "@/lib/utils";

const SESSION_ACCENT: Record<string, string> = {
  "1-on-1": "bg-primary/8 text-primary",
  Group: "bg-amber-100 text-amber-700",
  "AI-Guided": "bg-violet-100 text-violet-700",
};

export default async function LearnerDashboardPage() {
  // TODO(auth): hard-coded current learner until real session auth lands.
  const learnerId = devUserIdForRole("learner");
  const [learner, wellness, allCoaches, upcomingAll, trendData, heatmap] =
    await Promise.all([
      api.fetchLearner(learnerId),
      api.fetchWellness(learnerId),
      api.fetchCoaches(),
      api.fetchUpcoming({ learnerId }),
      api.fetchProgressTrend(),
      api.fetchActivityHeatmap(learnerId),
    ]);

  if (!learner) notFound();

  const greetingHour = new Date(NOW).getHours();
  const greeting =
    greetingHour < 12 ? "Chào buổi sáng" : greetingHour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const todayLabel = new Date(NOW).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const coaches = [...allCoaches]
    .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
    .slice(0, 3);
  const coachById = new Map(allCoaches.map((c) => [c.id, c]));
  const upcoming = upcomingAll.slice(0, 3);
  const trend = trendData.map((p) => p.score);

  const weekMinutes = wellness.weeklyTraining.reduce((a, b) => a + b, 0);

  return (
    <AppShell role="learner" title="Dashboard">
      <div className="mx-auto max-w-[1280px] space-y-6 pb-4">
        {/* ---------- Greeting ---------- */}
        <header
          className="animate-rise-in flex flex-wrap items-end justify-between gap-4"
          style={{ animationDelay: "0ms" }}
        >
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-on-surface sm:text-[31px]">
              {greeting}, {learner.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-[14px] text-on-surface-variant">
              {todayLabel} — đây là bản tóm tắt tập luyện hôm nay của bạn.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Link
              href="/learner/progress"
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-3.5 py-2.5 text-[13px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
            >
              <MaterialIcon name="monitoring" size={17} />
              Xem tiến độ
            </Link>
            <Link
              href="/learner/coaches"
              className="inline-flex items-center gap-1.5 rounded-[9px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-on-primary shadow-[0_10px_24px_-12px_rgba(53,37,205,0.7)] transition-colors hover:bg-[#2d20b8]"
            >
              <MaterialIcon name="add" size={17} />
              Đặt buổi tập
            </Link>
          </div>
        </header>

        {/* ---------- AI Readiness hero ---------- */}
        <section
          className="animate-rise-in relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0b0a1e] p-6 sm:p-7"
          style={{ animationDelay: "70ms" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_60%_70%_at_25%_0%,#000,transparent)]" />
            <div className="absolute -left-16 top-1/4 h-72 w-72 rounded-full bg-indigo-600/25 blur-[120px]" />
            <div className="absolute -right-10 -top-12 h-60 w-60 rounded-full bg-violet-600/25 blur-[110px]" />
          </div>

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center">
            {/* readiness ring */}
            <div className="flex items-center gap-5 lg:w-[320px] lg:shrink-0">
              <ProgressRing value={wellness.readiness} size={132}>
                <span className="text-[34px] font-semibold leading-none text-white">
                  <AnimatedNumber value={wellness.readiness} />
                </span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Readiness
                </span>
              </ProgressRing>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Đúng tiến độ
                </span>
                <p className="mt-2 text-[20px] font-semibold leading-tight text-white">
                  {wellness.readinessLabel}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                  {wellness.readinessNote}
                </p>
              </div>
            </div>

            <div className="hidden w-px self-stretch bg-white/10 lg:block" />

            {/* AI rec + recovery metrics */}
            <div className="flex-1 space-y-3">
              {/* AI recommendation */}
              <div className="flex flex-col gap-4 rounded-[16px] border border-indigo-300/20 bg-indigo-400/[0.08] p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-400 to-violet-500 text-white">
                    <MaterialIcon name="auto_awesome" filled size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">
                      AI đề xuất
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold text-white">
                      {wellness.recommendation.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/55">
                      {wellness.recommendation.durationMin} phút ·{" "}
                      {wellness.recommendation.confidence}% độ tin cậy
                    </p>
                  </div>
                </div>
                <Link
                  href="/learner/schedule"
                  className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-white px-4 py-2.5 text-[13px] font-semibold text-primary transition-transform hover:-translate-y-0.5"
                >
                  Bắt đầu
                  <MaterialIcon
                    name="arrow_forward"
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              {/* recovery metrics */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {wellness.recovery.map((m) => (
                  <div
                    key={m.key}
                    className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-white/60">
                        <MaterialIcon name={m.icon} size={15} />
                        {m.label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                          m.deltaGood ? "text-emerald-300" : "text-amber-300",
                        )}
                      >
                        <MaterialIcon
                          name={m.delta > 0 ? "trending_up" : "trending_down"}
                          size={12}
                        />
                        {Math.abs(m.delta)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[20px] font-semibold leading-none text-white">
                      {m.value}
                      <span className="ml-1 text-[12px] font-normal text-white/45">
                        {m.unit}
                      </span>
                    </p>
                    <Sparkline
                      data={m.trend}
                      color="#a5b4fc"
                      fill
                      height={26}
                      className="mt-2 h-7 w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Metric cards ---------- */}
        <section
          className="animate-rise-in grid grid-cols-2 gap-4 lg:grid-cols-4"
          style={{ animationDelay: "140ms" }}
        >
          <MetricCard
            icon="exercise"
            label="Tập luyện tuần này"
            value={weekMinutes}
            unit="phút"
            delta={wellness.weeklyTrainingDelta}
            chart={
              <Sparkline
                data={wellness.weeklyTraining}
                variant="bar"
                color="#4f46e5"
                height={34}
                className="h-9 w-full"
              />
            }
          />
          <MetricCard
            icon="local_fire_department"
            label="Chuỗi ngày"
            value={learner.streakDays ?? 0}
            unit="ngày"
            chart={
              <div className="flex items-center gap-1.5">
                {wellness.weeklyTraining.map((m, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full",
                      m > 0 ? "bg-primary" : "bg-surface-container-high",
                    )}
                  />
                ))}
              </div>
            }
          />
          <MetricCard
            icon="timer"
            label="Tổng giờ"
            value={learner.totalHoursTrained ?? 0}
            unit="giờ"
            delta={12}
            chart={
              <Sparkline
                data={trend}
                color="#4f46e5"
                fill
                height={34}
                className="h-9 w-full"
              />
            }
          />
          <MetricCard
            icon="cognition"
            label="Tỷ lệ khớp AI"
            value={learner.matchRate ?? 0}
            unit="%"
            right={
              <ProgressRing
                value={learner.matchRate ?? 0}
                size={56}
                stroke={6}
                trackColor="rgba(53,37,205,0.12)"
              >
                <MaterialIcon
                  name="auto_awesome"
                  filled
                  size={16}
                  className="text-primary"
                />
              </ProgressRing>
            }
          />
        </section>

        {/* ---------- AI Coach + Activity ---------- */}
        <section
          className="animate-rise-in grid gap-5 lg:grid-cols-12"
          style={{ animationDelay: "210ms" }}
        >
          <div className="lg:col-span-7">
            <AICoachCard recommendation={wellness.recommendation} />
          </div>
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(16,16,16,0.03)]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold text-on-surface">
                    Hoạt động tập luyện
                  </h2>
                  <p className="mt-0.5 text-[13px] text-on-surface-variant">
                    Mức độ đều đặn trong 12 tuần qua
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[12px] font-semibold text-primary">
                  <MaterialIcon name="bolt" filled size={12} />
                  {learner.streakDays} ngày liên tiếp
                </span>
              </div>
              <div className="mt-5 flex flex-1 items-center">
                <ActivityHeatmap weeks={heatmap} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Recommended coaches ---------- */}
        <section
          className="animate-rise-in space-y-4"
          style={{ animationDelay: "280ms" }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-on-surface">
                Đề xuất cho bạn
              </h2>
              <p className="mt-0.5 text-[13px] text-on-surface-variant">
                HLV được AI xếp hạng cao nhất cho mục tiêu của bạn
              </p>
            </div>
            <Link
              href="/learner/coaches"
              className="group inline-flex items-center gap-1 text-[13px] font-semibold text-primary"
            >
              Xem tất cả
              <MaterialIcon
                name="arrow_forward"
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => (
              <CoachShowcaseCard key={coach.id} coach={coach} />
            ))}
          </div>
        </section>

        {/* ---------- Upcoming sessions ---------- */}
        <section
          className="animate-rise-in overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest"
          style={{ animationDelay: "350ms" }}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-on-surface">
                Buổi tập sắp tới
              </h2>
              <p className="mt-0.5 text-[13px] text-on-surface-variant">
                {upcoming.length} buổi trong tuần này
              </p>
            </div>
            <Link
              href="/learner/schedule"
              className="group inline-flex items-center gap-1 text-[13px] font-semibold text-primary"
            >
              Xem lịch
              <MaterialIcon
                name="arrow_forward"
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                <MaterialIcon
                  name="event_busy"
                  size={22}
                  className="text-on-surface-variant"
                />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-on-surface">
                Chưa có buổi tập nào
              </p>
              <p className="mt-1 text-[13px] text-on-surface-variant">
                Đặt buổi tập để duy trì chuỗi ngày.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {upcoming.map((s) => {
                const coach = coachById.get(s.coachId);
                const d = new Date(s.start);
                const time = d.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low/60"
                  >
                    <img
                      src={coach?.avatarUrl}
                      alt={coach?.name ?? ""}
                      className="h-11 w-11 rounded-[12px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-on-surface">
                        {s.title}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
                        {coach?.name} · {relativeDay(d)} {time} ·{" "}
                        {s.durationMinutes}m
                      </p>
                    </div>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block",
                        SESSION_ACCENT[s.type] ??
                          "bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      {s.type}
                    </span>
                    <Link
                      href={`/learner/schedule`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border border-[var(--color-border-soft)] px-3 py-2 text-[12.5px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      Chi tiết
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------ sub-components ----------------------------- */

function MetricCard({
  icon,
  label,
  value,
  unit,
  delta,
  chart,
  right,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  delta?: number;
  chart?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(53,37,205,0.35)]">
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/8 text-primary">
          <MaterialIcon name={icon} filled size={18} />
        </span>
        {delta !== undefined && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#e7f6ed] px-1.5 py-0.5 text-[11px] font-semibold text-[#1f7a4d]">
            <MaterialIcon name="trending_up" size={12} />
            {delta}%
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium text-on-surface-variant">
            {label}
          </p>
          <p
            className="mt-0.5 text-[26px] font-semibold leading-none text-on-surface"
            style={{ letterSpacing: "-0.02em" }}
          >
            <AnimatedNumber value={value} />
            <span className="ml-1 text-[13px] font-normal text-on-surface-variant">
              {unit}
            </span>
          </p>
        </div>
        {right}
      </div>
      {chart && <div className="mt-3">{chart}</div>}
    </div>
  );
}
