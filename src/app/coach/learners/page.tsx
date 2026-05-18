"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { cn } from "@/lib/utils";
import { mockLearners } from "@/lib/mock/users";
import { getInsightsForRole } from "@/lib/mock/insights";

type SortKey = "name" | "hours" | "streak" | "match";

export default function CoachLearnersPage() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("hours");
  const [view, setView] = useState<"grid" | "table">("table");
  const insights = getInsightsForRole("coach");

  const learners = useMemo(() => {
    let list = mockLearners.filter((l) =>
      query
        ? l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.goals.join(" ").toLowerCase().includes(query.toLowerCase())
        : true,
    );
    list = list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "hours") return b.totalHoursTrained - a.totalHoursTrained;
      if (sortKey === "streak") return b.streakDays - a.streakDays;
      return (b.matchRate ?? 0) - (a.matchRate ?? 0);
    });
    return list;
  }, [query, sortKey]);

  return (
    <AppShell role="coach" title="My Learners">
      <div className="max-w-[1400px] space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">My Learners</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              {mockLearners.length} active learners under your guidance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low">
              <MaterialIcon name="file_download" size={16} />
              Export
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
              <MaterialIcon name="person_add" size={16} />
              Invite Learner
            </button>
          </div>
        </header>

        {insights[1] && <AIInsightBanner insight={insights[1]} />}

        {/* Filters / view toggle */}
        <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-9 flex-1">
            <MaterialIcon
              name="search"
              size={16}
              className="text-on-surface-variant"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or goal..."
              className="flex-1 ml-2 bg-transparent outline-none text-body-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-body-sm text-on-surface-variant">
              Sort:
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-2 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm bg-surface-container-lowest outline-none focus:border-primary"
            >
              <option value="hours">Hours trained</option>
              <option value="streak">Streak</option>
              <option value="match">Match %</option>
              <option value="name">Name</option>
            </select>
            <div className="inline-flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "p-1.5 rounded",
                  view === "table"
                    ? "bg-surface-container-lowest"
                    : "text-on-surface-variant",
                )}
              >
                <MaterialIcon name="view_list" size={16} />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 rounded",
                  view === "grid"
                    ? "bg-surface-container-lowest"
                    : "text-on-surface-variant",
                )}
              >
                <MaterialIcon name="grid_view" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {view === "table" ? (
          <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-[var(--color-border-soft)]">
                  <tr className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                    <Th>Learner</Th>
                    <Th>Goal</Th>
                    <Th align="right">Hours</Th>
                    <Th align="right">Streak</Th>
                    <Th align="right">Match</Th>
                    <Th align="right">Next Session</Th>
                    <Th align="right" />
                  </tr>
                </thead>
                <tbody>
                  {learners.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={l.avatarUrl}
                            alt={l.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-body-base font-medium truncate">
                              {l.name}
                            </p>
                            <p className="text-body-sm text-on-surface-variant truncate">
                              {l.preferredSports.join(" · ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant max-w-[240px] truncate">
                        {l.goals[0] ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-body-base font-medium">
                        {l.totalHoursTrained}h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
                          <MaterialIcon
                            name="local_fire_department"
                            filled
                            size={14}
                            className="text-amber-500"
                          />
                          {l.streakDays}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-body-sm font-medium text-primary">
                          {l.matchRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-body-sm text-on-surface-variant">
                        {l.upcomingSessions > 0
                          ? `${l.upcomingSessions} scheduled`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href="/coach/messages"
                          className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                        >
                          Message
                          <MaterialIcon name="arrow_forward" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {learners.map((l) => (
              <article
                key={l.id}
                className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={l.avatarUrl}
                    alt={l.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-body-base font-medium truncate">
                      {l.name}
                    </p>
                    <p className="text-body-sm text-on-surface-variant truncate">
                      Joined {new Date(l.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Mini label="Hours" value={l.totalHoursTrained} />
                  <Mini label="Streak" value={`${l.streakDays}d`} />
                  <Mini label="Match" value={`${l.matchRate}%`} accent />
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/coach/messages"
                    className="flex-1 text-center py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low"
                  >
                    Message
                  </Link>
                  <button className="flex-1 text-center py-1.5 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
                    Plan
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="text-center bg-surface-container-low rounded-[6px] py-1.5">
      <p
        className={cn(
          "text-body-base font-medium",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
    </div>
  );
}
