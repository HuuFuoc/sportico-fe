import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SessionRow } from "@/components/common/SessionRow";
import { EmptyState } from "@/components/common/EmptyState";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, localDateKey } from "@/lib/utils";
import { NOW } from "@/lib/mock/clock";
import { getSessionsForLearner } from "@/lib/mock/sessions";
import { getInsightsForRole } from "@/lib/mock/insights";
import { getCoachById } from "@/lib/mock/users";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon = 0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export default function LearnerSchedulePage() {
  const learnerId = "learner-1";
  const sessions = getSessionsForLearner(learnerId);
  const insights = getInsightsForRole("learner");

  // Build week grid (current week)
  const weekStart = startOfWeek(new Date(NOW));
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayBuckets = weekDays.map((d) => {
    const day = localDateKey(d);
    return sessions.filter((s) => localDateKey(new Date(s.start)) === day);
  });

  const upcoming = sessions
    .filter((s) => new Date(s.start) >= NOW && s.status !== "cancelled")
    .slice(0, 6);

  return (
    <AppShell role="learner" title="My Schedule">
      <div className="max-w-[1200px] space-y-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1 text-on-surface">My Schedule</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Week of{" "}
              {weekStart.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-[var(--color-border-soft)] rounded-[6px] hover:bg-surface-container-low">
              <MaterialIcon name="chevron_left" size={18} />
            </button>
            <button className="px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low">
              Today
            </button>
            <button className="p-2 border border-[var(--color-border-soft)] rounded-[6px] hover:bg-surface-container-low">
              <MaterialIcon name="chevron_right" size={18} />
            </button>
            <Link
              href="/learner/coaches"
              className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors"
            >
              <MaterialIcon name="add" size={18} />
              Book Session
            </Link>
          </div>
        </header>

        {insights[0] && <AIInsightBanner insight={insights[0]} />}

        {/* Week view */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--color-border-soft)]">
            {weekDays.map((d, i) => {
              const isToday =
                d.toDateString() === NOW.toDateString();
              return (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-3 text-center border-r border-[var(--color-border-soft)] last:border-r-0",
                    isToday && "bg-primary/5",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] uppercase tracking-wider",
                      isToday
                        ? "text-primary font-medium"
                        : "text-on-surface-variant",
                    )}
                  >
                    {WEEKDAYS[i]}
                  </p>
                  <p
                    className={cn(
                      "text-h3 mt-1",
                      isToday ? "text-primary" : "text-on-surface",
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[280px]">
            {dayBuckets.map((items, i) => {
              const isToday =
                weekDays[i].toDateString() === NOW.toDateString();
              return (
                <div
                  key={i}
                  className={cn(
                    "p-2 border-r border-[var(--color-border-soft)] last:border-r-0 space-y-1.5",
                    isToday && "bg-primary/[0.02]",
                  )}
                >
                  {items.map((s) => {
                    const coach = getCoachById(s.coachId);
                    const time = new Date(s.start).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-[6px] p-2 text-left transition-colors cursor-pointer",
                          s.type === "AI-Guided"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container",
                        )}
                      >
                        <p className="text-[11px] font-medium">{time}</p>
                        <p className="text-body-sm truncate">{s.title}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {coach?.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming list */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-soft)]">
            <h3 className="text-h3">Upcoming Sessions</h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="event_busy"
                title="No upcoming sessions"
                description="Book a session to fill your week."
              />
            </div>
          ) : (
            upcoming.map((s) => (
              <SessionRow key={s.id} session={s} viewer="learner" />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
