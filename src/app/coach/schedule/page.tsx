import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { cn } from "@/lib/utils";
import { getSessionsForCoach } from "@/lib/mock/sessions";
import { getLearnerById } from "@/lib/mock/users";
import { getInsightsForRole } from "@/lib/mock/insights";

const HOURS = Array.from({ length: 11 }).map((_, i) => 7 + i); // 7 → 17
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export default function CoachSchedulePage() {
  const coachId = "coach-1";
  const sessions = getSessionsForCoach(coachId);
  const insights = getInsightsForRole("coach");

  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Position each session in the grid by day + hour
  const sessionsByCell = (dayIdx: number, hour: number) => {
    const day = weekDays[dayIdx].toISOString().slice(0, 10);
    return sessions.filter((s) => {
      const d = new Date(s.start);
      return s.start.slice(0, 10) === day && d.getHours() === hour;
    });
  };

  const pending = sessions.filter((s) => s.status === "pending_confirmation");

  return (
    <AppShell role="coach" title="Schedule">
      <div className="space-y-5 max-w-[1400px]">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">Schedule Management</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Week of{" "}
              {weekStart.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
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
            <button className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8]">
              <MaterialIcon name="add" size={18} />
              New Session
            </button>
          </div>
        </header>

        {insights[0] && <AIInsightBanner insight={insights[0]} />}

        {/* Pending confirmations */}
        {pending.length > 0 && (
          <section className="bg-amber-50/60 border border-amber-200 rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-h3 text-on-surface inline-flex items-center gap-2">
                <MaterialIcon
                  name="schedule"
                  size={18}
                  className="text-amber-600"
                />
                {pending.length} session{pending.length > 1 && "s"} waiting
                confirmation
              </h3>
            </div>
            <ul className="space-y-2">
              {pending.map((s) => {
                const learner = getLearnerById(s.learnerId);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 bg-surface-container-lowest rounded-[6px] p-3 border border-amber-200"
                  >
                    <img
                      src={learner?.avatarUrl}
                      alt={learner?.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-base font-medium truncate">
                        {learner?.name} — {s.title}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {new Date(s.start).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button className="px-3 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm">
                      Decline
                    </button>
                    <button className="px-3 py-1.5 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
                      Confirm
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Week grid */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--color-border-soft)]">
            <div className="border-r border-[var(--color-border-soft)]" />
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
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
                      "text-h3",
                      isToday ? "text-primary" : "text-on-surface",
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            {HOURS.map((h) => (
              <div
                key={h}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--color-border-soft)] last:border-b-0 min-h-[64px]"
              >
                <div className="border-r border-[var(--color-border-soft)] px-2 pt-1 text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {h}:00
                </div>
                {weekDays.map((_, dayIdx) => {
                  const items = sessionsByCell(dayIdx, h);
                  return (
                    <div
                      key={dayIdx}
                      className="border-r border-[var(--color-border-soft)] last:border-r-0 p-1 space-y-1 hover:bg-surface-container-low/40 transition-colors"
                    >
                      {items.map((s) => {
                        const learner = getLearnerById(s.learnerId);
                        return (
                          <Link
                            key={s.id}
                            href={`/coach/session/${s.id}`}
                            className={cn(
                              "block rounded-[4px] p-1.5 text-[11px] leading-tight border transition-colors",
                              s.type === "AI-Guided"
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : s.status === "pending_confirmation"
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : "bg-surface-container-low border-[var(--color-border-soft)] hover:border-primary",
                            )}
                          >
                            <p className="font-medium truncate">
                              {learner?.name}
                            </p>
                            <p className="truncate opacity-80">{s.title}</p>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
