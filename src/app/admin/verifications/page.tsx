"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn, relativeDay } from "@/lib/utils";
import { mockVerifications } from "@/lib/mock/insights";
import { getCoachById } from "@/lib/mock/users";

export default function VerificationsPage() {
  const [activeId, setActiveId] = useState(mockVerifications[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">(
    "pending",
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? mockVerifications
        : mockVerifications.filter((v) => v.status === filter),
    [filter],
  );

  const active = filtered.find((v) => v.id === activeId) ?? filtered[0];
  const coach = active ? getCoachById(active.coachId) : null;

  return (
    <AppShell role="admin" title="Coach Verification">
      <div className="max-w-[1500px] space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">Coach Verification</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              Review credentials and approve coaches to publish them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] p-0.5">
              {(["pending", "approved", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-body-sm rounded capitalize",
                    filter === f
                      ? "bg-surface-container-lowest font-medium"
                      : "text-on-surface-variant",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
              <MaterialIcon name="done_all" size={16} />
              Batch Approve
            </button>
          </div>
        </header>

        {filtered.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="No verifications in this view"
            description="The queue is empty. Take a break."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 min-h-[600px]">
            {/* Queue */}
            <aside className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
                <h3 className="text-h3">
                  {filtered.length} request{filtered.length > 1 && "s"}
                </h3>
                <button className="text-body-sm text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1">
                  <MaterialIcon name="filter_list" size={14} />
                  Sort
                </button>
              </div>
              <ul>
                {filtered.map((v) => {
                  const isActive = v.id === active?.id;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => setActiveId(v.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-[var(--color-border-soft)] last:border-b-0 flex items-start gap-3 transition-colors",
                          isActive
                            ? "bg-primary/5"
                            : "hover:bg-surface-container-low",
                        )}
                      >
                        <img
                          src={v.coachAvatar}
                          alt={v.coachName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-body-base font-medium truncate">
                              {v.coachName}
                            </p>
                            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                              {relativeDay(new Date(v.submittedAt))}
                            </span>
                          </div>
                          <p className="text-body-sm text-on-surface-variant truncate">
                            {v.sport} · {v.documents.length} docs
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium",
                                v.status === "approved"
                                  ? "bg-[#d1f4dd] text-[#1f7a4d]"
                                  : v.status === "rejected"
                                    ? "bg-[#ffdad6] text-[#ba1a1a]"
                                    : "bg-amber-50 text-amber-700",
                              )}
                            >
                              {v.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Detail */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5 space-y-5">
              {active && (
                <>
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={active.coachAvatar}
                        alt={active.coachName}
                        className="w-16 h-16 rounded-[10px] object-cover"
                      />
                      <div className="min-w-0">
                        <h2 className="text-h2 truncate">
                          {active.coachName}
                        </h2>
                        <p className="text-body-base text-on-surface-variant">
                          {active.sport} · Submitted{" "}
                          {relativeDay(new Date(active.submittedAt))}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="px-4 py-2 border border-error text-error rounded-[6px] text-body-sm font-medium hover:bg-error/5">
                        Reject
                      </button>
                      <button className="px-5 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] inline-flex items-center gap-1.5">
                        <MaterialIcon name="check" size={16} />
                        Approve
                      </button>
                    </div>
                  </header>

                  {/* AI risk banner */}
                  <div className="bg-primary/5 border border-primary/15 rounded-[10px] p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[8px] bg-primary text-on-primary flex items-center justify-center shrink-0">
                      <MaterialIcon name="psychology" filled size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AIBadge label="Risk Assessment" />
                      </div>
                      <p className="text-body-base">
                        Low risk — Document authenticity score{" "}
                        <span className="text-primary font-medium">92%</span>.
                        No flags raised. Background check passed.
                      </p>
                    </div>
                  </div>

                  {/* Coach summary */}
                  {coach && (
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Mini label="Email" value={coach.email} />
                      <Mini label="Location" value={coach.location} />
                      <Mini
                        label="Experience"
                        value={`${coach.yearsExperience} yrs`}
                      />
                      <Mini
                        label="Hourly rate"
                        value={`$${coach.hourlyRate}`}
                      />
                    </section>
                  )}

                  {/* Documents */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-h3">Documents</h3>
                      <button className="text-body-sm text-primary hover:underline">
                        Download all
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {active.documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-3 p-3 border border-[var(--color-border-soft)] rounded-[6px] hover:border-primary transition-colors"
                        >
                          <div className="w-10 h-10 rounded-[8px] bg-surface-container-high flex items-center justify-center">
                            <MaterialIcon
                              name={
                                d.type === "identity"
                                  ? "badge"
                                  : d.type === "insurance"
                                    ? "shield"
                                    : "description"
                              }
                              size={20}
                              className="text-primary"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-base font-medium truncate">
                              {d.name}
                            </p>
                            <p className="text-body-sm text-on-surface-variant capitalize">
                              {d.type}
                            </p>
                          </div>
                          <button className="text-body-sm text-primary hover:underline">
                            Preview
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Notes */}
                  <section>
                    <h3 className="text-h3 mb-2">Admin notes</h3>
                    <textarea
                      placeholder="Add internal notes about this verification..."
                      rows={3}
                      className="w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors resize-none"
                    />
                  </section>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded-[8px] p-3">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">
        {label}
      </p>
      <p className="text-body-base font-medium truncate mt-0.5">{value}</p>
    </div>
  );
}
