"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn, formatNumber } from "@/lib/utils";
import { mockCoaches, mockLearners } from "@/lib/mock/users";

type Tab = "all" | "learners" | "coaches";

interface Row {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: "learner" | "coach";
  joinedAt: string;
  metric: string;
  status: "active" | "inactive" | "suspended";
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const rows = useMemo<Row[]>(() => {
    const learners: Row[] = mockLearners.map((l) => ({
      id: l.id,
      name: l.name,
      avatar: l.avatarUrl,
      email: l.email,
      role: "learner",
      joinedAt: l.joinedAt,
      metric: `${l.totalHoursTrained}h trained`,
      status: l.streakDays > 0 ? "active" : "inactive",
    }));
    const coaches: Row[] = mockCoaches.map((c) => ({
      id: c.id,
      name: c.name,
      avatar: c.avatarUrl,
      email: c.email,
      role: "coach",
      joinedAt: c.joinedAt,
      metric: `${c.activeLearners} learners · ${c.rating}★`,
      status: c.verified ? "active" : "inactive",
    }));

    let merged: Row[] =
      tab === "learners" ? learners : tab === "coaches" ? coaches : [...learners, ...coaches];

    if (query) {
      const q = query.toLowerCase();
      merged = merged.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      merged = merged.filter((r) => r.status === statusFilter);
    }
    return merged.sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
    );
  }, [tab, query, statusFilter]);

  return (
    <AppShell role="admin" title="User Management">
      <div className="max-w-[1500px] space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">User Management</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              {formatNumber(mockLearners.length + mockCoaches.length)} accounts on
              the platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low">
              <MaterialIcon name="file_download" size={16} />
              Export CSV
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
              <MaterialIcon name="person_add" size={16} />
              Invite
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--color-border-soft)]">
          {(
            [
              { id: "all", label: "All Users", count: mockLearners.length + mockCoaches.length },
              { id: "learners", label: "Learners", count: mockLearners.length },
              { id: "coaches", label: "Coaches", count: mockCoaches.length },
            ] as { id: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative py-3 text-body-base transition-colors",
                tab === t.id
                  ? "text-primary font-medium"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "ml-2 inline-flex items-center justify-center px-1.5 h-5 rounded-full text-[11px] font-medium",
                  tab === t.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {t.count}
              </span>
              {tab === t.id && (
                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-9 flex-1">
            <MaterialIcon
              name="search"
              size={16}
              className="text-on-surface-variant"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1 ml-2 bg-transparent outline-none text-body-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm bg-surface-container-lowest outline-none focus:border-primary"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <p className="text-body-sm text-on-surface-variant whitespace-nowrap">
            {rows.length} shown
          </p>
        </div>

        {/* Table */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-[var(--color-border-soft)] text-[11px] uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-medium w-8">
                    <input type="checkbox" className="accent-primary" />
                  </th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Join Date</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-primary" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.avatar}
                          alt={r.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-body-base font-medium truncate">
                            {r.name}
                          </p>
                          <p className="text-body-sm text-on-surface-variant truncate">
                            {r.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-medium",
                          r.role === "coach"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container-high text-on-surface-variant",
                        )}
                      >
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {new Date(r.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-body-sm">{r.metric}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-body-sm",
                          r.status === "active"
                            ? "text-[#1f7a4d]"
                            : r.status === "suspended"
                              ? "text-error"
                              : "text-on-surface-variant",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            r.status === "active"
                              ? "bg-[#1f7a4d]"
                              : r.status === "suspended"
                                ? "bg-error"
                                : "bg-on-surface-variant/40",
                          )}
                        />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant">
                        <MaterialIcon name="more_vert" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[var(--color-border-soft)] flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>
              Showing 1–{rows.length} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-[var(--color-border-soft)] rounded hover:bg-surface-container-low disabled:opacity-50" disabled>
                <MaterialIcon name="chevron_left" size={16} />
              </button>
              <button className="p-1.5 border border-[var(--color-border-soft)] rounded hover:bg-surface-container-low disabled:opacity-50" disabled>
                <MaterialIcon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
