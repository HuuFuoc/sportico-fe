import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { getCoachById, getLearnerById, mockLearners } from "@/lib/mock/users";
import { getUpcomingSessions } from "@/lib/mock/sessions";
import { NOW } from "@/lib/mock/clock";
import { getInsightsForRole } from "@/lib/mock/insights";
import { formatCurrency, initials } from "@/lib/utils";

export default function CoachDashboardPage() {
  const coach = getCoachById("coach-1")!;
  const todaySessions = getUpcomingSessions({ coachId: coach.id }).filter(
    (s) => {
      const d = new Date(s.start);
      return d.toDateString() === NOW.toDateString();
    },
  );
  const upcoming = getUpcomingSessions({ coachId: coach.id }).slice(0, 5);
  const recentLearners = mockLearners.slice(0, 5);
  const insights = getInsightsForRole("coach");

  return (
    <AppShell role="coach" title="Dashboard">
      <div className="space-y-6 max-w-[1300px]">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">Good morning, {coach.name.split(" ")[0]}</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Here's what's happening with your coaching today.
            </p>
          </div>
          <Link
            href="/coach/schedule"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors"
          >
            <MaterialIcon name="add" size={18} />
            New Session
          </Link>
        </header>

        {insights[0] && <AIInsightBanner insight={insights[0]} />}

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="compact"
            label="Active Learners"
            value={coach.activeLearners}
            trend={{ value: "+12%", direction: "up" }}
            hint="vs last month"
          />
          <StatCard
            variant="compact"
            label="Sessions This Week"
            value={upcoming.length}
            trend={{ value: "Steady", direction: "neutral" }}
          />
          <StatCard
            variant="compact"
            label="Avg Rating"
            value={coach.rating.toFixed(1)}
            hint={`${coach.reviewCount} reviews`}
          />
          <StatCard
            variant="compact"
            label="Monthly Earnings"
            value={formatCurrency(coach.totalEarningsThisMonth ?? 0)}
            trend={{ value: "+8%", direction: "up" }}
          />
        </section>

        {/* Bento: Today's schedule (8) + Learners (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h2">Today's Schedule</h2>
              <Link
                href="/coach/schedule"
                className="text-body-sm text-primary hover:underline"
              >
                View calendar →
              </Link>
            </div>
            <div className="space-y-2">
              {todaySessions.length === 0 ? (
                <EmptyState
                  icon="event_busy"
                  title="No sessions today"
                  description="Enjoy the rest day — or use it to draft plans."
                />
              ) : (
                todaySessions.map((s) => {
                  const learner = getLearnerById(s.learnerId);
                  const time = new Date(s.start).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <article
                      key={s.id}
                      className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex items-center gap-4 hover:border-primary/40 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-[10px] bg-surface-container-high overflow-hidden shrink-0">
                        {learner?.avatarUrl ? (
                          <img
                            src={learner.avatarUrl}
                            alt={learner.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-primary font-medium">
                            {initials(learner?.name ?? "?")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-h3 truncate">{learner?.name}</p>
                        <div className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface-variant mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <MaterialIcon name="schedule" size={14} />
                            {time}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MaterialIcon name="exercise" size={14} />
                            {s.title}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm font-medium hover:bg-surface-container-low">
                          Prepare
                        </button>
                        <Link
                          href={`/coach/session/${s.id}`}
                          className="px-3 py-1.5 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] inline-flex items-center gap-1"
                        >
                          Join
                          <MaterialIcon name="video_call" size={16} />
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Recent learners */}
          <section className="lg:col-span-4 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]">
            <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
              <h3 className="text-h3">Recent Learners</h3>
              <Link
                href="/coach/learners"
                className="text-body-sm text-primary hover:underline"
              >
                All →
              </Link>
            </div>
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {recentLearners.map((l) => (
                <li
                  key={l.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                >
                  <img
                    src={l.avatarUrl}
                    alt={l.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-medium truncate">
                      {l.name}
                    </p>
                    <p className="text-body-sm text-on-surface-variant truncate">
                      {l.totalHoursTrained}h trained • {l.streakDays}d streak
                    </p>
                  </div>
                  <Link
                    href="/coach/messages"
                    className="text-on-surface-variant hover:text-primary"
                  >
                    <MaterialIcon name="mail" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Upcoming sessions */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
            <h3 className="text-h3">Upcoming This Week</h3>
            <Link
              href="/coach/schedule"
              className="text-body-sm text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {upcoming.map((s) => {
              const learner = getLearnerById(s.learnerId);
              const date = new Date(s.start);
              return (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                >
                  <div className="text-center w-12 shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">
                      {date.toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-h3">{date.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-base font-medium truncate">
                      {s.title}
                    </p>
                    <p className="text-body-sm text-on-surface-variant truncate">
                      {learner?.name} •{" "}
                      {date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      • {s.durationMinutes}m
                    </p>
                  </div>
                  <Link
                    href={`/coach/session/${s.id}`}
                    className="text-body-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
