import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AskAIPanel } from "@/components/layout/AskAIPanel";
import { AIBadge } from "@/components/common/AIBadge";
import { StatCard } from "@/components/common/StatCard";
import { CoachCard } from "@/components/common/CoachCard";
import { SessionRow } from "@/components/common/SessionRow";
import { EmptyState } from "@/components/common/EmptyState";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { getLearnerById, getCoaches } from "@/lib/mock/users";
import { getUpcomingSessions } from "@/lib/mock/sessions";

export default function LearnerDashboardPage() {
  const learner = getLearnerById("learner-1")!;
  const coaches = getCoaches()
    .slice()
    .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
    .slice(0, 3);
  const upcoming = getUpcomingSessions({ learnerId: learner.id }).slice(0, 4);

  return (
    <AppShell
      role="learner"
      title="Dashboard"
      rightRail={<AskAIPanel />}
    >
      <div className="space-y-6 max-w-[1200px]">
        {/* Welcome banner */}
        <section className="bg-surface-container-low border border-[var(--color-border-soft)] rounded-[12px] p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-h1 text-on-surface mb-1">
              Welcome back, {learner.name.split(" ")[0]}
            </h1>
            <div className="flex items-start gap-3 mt-3">
              <AIBadge label="AI Insight" />
              <p className="text-body-base text-on-surface-variant italic">
                "Consistency is key! AI suggests a 15-minute mobility flow today."
              </p>
            </div>
          </div>
          <Link
            href="/learner/schedule"
            className="shrink-0 inline-flex items-center justify-center bg-primary text-on-primary px-5 py-2.5 rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors whitespace-nowrap"
          >
            Start Mobility Flow
          </Link>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Upcoming Sessions"
            value={learner.upcomingSessions}
            icon="event_repeat"
          />
          <StatCard
            label="Total Hours"
            value={learner.totalHoursTrained}
            icon="timer"
          />
          <StatCard
            label="AI Match Rate"
            value={`${learner.matchRate}%`}
            icon="cognition"
          />
        </section>

        {/* Recommended */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h2 text-on-surface">Recommended for you</h2>
            <Link
              href="/learner/ai-match"
              className="text-primary text-[11px] uppercase tracking-wider font-medium hover:underline"
            >
              View All Matches
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((c) => (
              <CoachCard key={c.id} coach={c} />
            ))}
          </div>
        </section>

        {/* Upcoming sessions list */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
            <h3 className="text-h3">Upcoming Sessions</h3>
            <Link
              href="/learner/schedule"
              className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View calendar
              <MaterialIcon name="arrow_forward" size={14} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="event_busy"
                title="No upcoming sessions"
                description="Book your next session to keep your streak going."
              />
            </div>
          ) : (
            <div>
              {upcoming.map((s) => (
                <SessionRow key={s.id} session={s} viewer="learner" />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
