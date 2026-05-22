import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { AIBadge } from "@/components/common/AIBadge";
import { getSessionById, mockSessions } from "@/lib/mock/sessions";
import { getCoachById, getLearnerById } from "@/lib/mock/users";
import { formatCurrency, relativeDay } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const DATA_POINTS = [
  { label: "Avg HR", value: "152 bpm", icon: "favorite", trend: "+4%" },
  { label: "Peak HR", value: "178 bpm", icon: "trending_up", trend: "Z4" },
  { label: "Calories", value: "612", icon: "local_fire_department" },
  { label: "Pace", value: "5:42 /km", icon: "speed", trend: "PR-likely" },
];

const NOTES_PRE = [
  "Hip flexor mobility — issue raised last session",
  "Wants to test marathon goal pace today",
];

const NOTES_POST = [
  "Strong second-half pacing, controlled breathing through interval 3",
  "Watch for over-striding when fatigued — drills next session",
];

export async function generateStaticParams() {
  return mockSessions.map((s) => ({ id: s.id }));
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = getSessionById(id);
  if (!session) notFound();
  const coach = getCoachById(session.coachId);
  const learner = getLearnerById(session.learnerId);
  const date = new Date(session.start);

  return (
    <AppShell role="coach" title={`${learner?.name ?? ""} — ${session.title}`}>
      <div className="max-w-[1400px] space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Link
            href="/coach/schedule"
            className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
          >
            <MaterialIcon name="chevron_left" size={18} />
            Back to schedule
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {session.type === "AI-Guided" && (
                <AIBadge label="AI-Guided" />
              )}
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                {session.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-h1">{session.title}</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              {learner?.name} • {relativeDay(date)}{" "}
              {date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              • {session.durationMinutes}m • {session.location}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="px-4 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-base hover:bg-surface-container-low">
              Reschedule
            </button>
            <button className="px-5 py-2 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] inline-flex items-center gap-1.5">
              <MaterialIcon name="video_call" size={18} />
              Start Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left — video + data */}
          <div className="lg:col-span-8 space-y-4">
            {/* Video / preview */}
            <div className="bg-on-surface rounded-[12px] aspect-video relative overflow-hidden group">
              <img
                src={`https://i.pravatar.cc/1200?u=session-${session.id}`}
                alt=""
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
                  <MaterialIcon
                    name="play_arrow"
                    filled
                    size={32}
                    className="text-white"
                  />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-body-sm opacity-80">Video review</p>
                <p className="text-h3">{learner?.name} — gait analysis</p>
              </div>
            </div>

            {/* Live data points */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-h3">Live data points</h3>
                <span className="text-body-sm text-on-surface-variant inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#1f7a4d] animate-pulse" />
                  Streaming
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DATA_POINTS.map((dp) => (
                  <div
                    key={dp.label}
                    className="bg-surface-container-low rounded-[8px] p-3"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                      {dp.label}
                    </p>
                    <p
                      className="text-h2 mt-1"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {dp.value}
                    </p>
                    {dp.trend && (
                      <p className="text-body-sm text-primary mt-1 inline-flex items-center gap-1">
                        <MaterialIcon name={dp.icon} size={12} />
                        {dp.trend}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* AI plan */}
            {session.aiPlan && (
              <AIInsightBanner
                insight={{
                  id: "plan",
                  audience: "coach",
                  title: "AI suggested plan",
                  body: session.aiPlan,
                  cta: { label: "Apply to session", href: "#" },
                  severity: "info",
                  createdAt: "2026-05-22",
                }}
              />
            )}

            {/* Notes */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4">
              <h3 className="text-h3 mb-3">Session notes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-2">
                    Pre-session
                  </p>
                  <ul className="space-y-1.5">
                    {NOTES_PRE.map((n, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-body-base"
                      >
                        <MaterialIcon
                          name="bookmark"
                          filled
                          size={14}
                          className="text-primary mt-1 shrink-0"
                        />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-2">
                    Post-session
                  </p>
                  <ul className="space-y-1.5">
                    {NOTES_POST.map((n, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-body-base"
                      >
                        <MaterialIcon
                          name="check_circle"
                          filled
                          size={14}
                          className="text-[#1f7a4d] mt-1 shrink-0"
                        />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <textarea
                placeholder="Add a new note..."
                rows={3}
                className="w-full mt-4 px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors resize-none"
              />
            </section>
          </div>

          {/* Right column — learner card + session info */}
          <aside className="lg:col-span-4 space-y-4">
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={learner?.avatarUrl}
                  alt={learner?.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-h3 truncate">{learner?.name}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {learner?.totalHoursTrained}h trained · {learner?.streakDays}
                    d streak
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <KV label="Goal" value={learner?.goals[0] ?? "—"} />
                <KV
                  label="Sports"
                  value={learner?.preferredSports.join(" · ") ?? "—"}
                />
                <KV
                  label="Joined"
                  value={new Date(learner?.joinedAt ?? "").toLocaleDateString()}
                />
              </div>
              <Link
                href="/coach/messages"
                className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low"
              >
                <MaterialIcon name="mail" size={16} />
                Message {learner?.name.split(" ")[0]}
              </Link>
            </section>

            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 space-y-2">
              <h3 className="text-h3 mb-1">Session info</h3>
              <KV
                label="Coach"
                value={coach?.name ?? "—"}
              />
              <KV label="Type" value={session.type} />
              <KV label="Location" value={session.location ?? "Online"} />
              <KV label="Price" value={formatCurrency(session.price)} />
              <KV
                label="Duration"
                value={`${session.durationMinutes} min`}
              />
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 text-body-sm py-1.5 border-b border-[var(--color-border-soft)] last:border-b-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-on-surface text-right">{value}</span>
    </div>
  );
}
