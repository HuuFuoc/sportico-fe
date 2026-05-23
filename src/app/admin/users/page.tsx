"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  Filter,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn, formatNumber } from "@/lib/utils";
import { mockCoaches, mockLearners } from "@/lib/mock/users";

const EASE = [0.16, 1, 0.3, 1] as const;

type Tab = "all" | "learners" | "coaches";
type Status = "active" | "inactive" | "pending" | "flagged";
type Role = "learner" | "coach";
type SortKey = "name" | "joinedAt" | "activity" | "status";

interface Row {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: Role;
  joinedAt: string;
  activity: number;
  metric: string;
  rating?: number;
  status: Status;
}

const STATUS_META: Record<
  Status,
  { label: string; pill: string; dot: string }
> = {
  active: {
    label: "Active",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
  },
  inactive: {
    label: "Inactive",
    pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
    dot: "bg-on-surface-variant/40",
  },
  pending: {
    label: "Pending",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
  },
  flagged: {
    label: "Flagged",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
    dot: "bg-[#ef4444]",
  },
};

function seedSpark(seed: number, base: number, jitter: number, len = 8) {
  return Array.from({ length: len }, (_, i) => {
    const noise = Math.sin(i * 1.4 + seed) * jitter;
    return { i, v: Math.max(0, base + i * (jitter / 5) + noise) };
  });
}

export default function AdminUsersPage() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Build deterministic rows once
  const allRows: Row[] = useMemo(() => {
    const learners: Row[] = mockLearners.map((l, i) => ({
      id: l.id,
      name: l.name,
      avatar: l.avatarUrl,
      email: l.email,
      role: "learner",
      joinedAt: l.joinedAt,
      activity: l.totalHoursTrained,
      metric: `${l.totalHoursTrained}h trained`,
      status:
        i % 11 === 0
          ? "flagged"
          : i % 7 === 0
            ? "pending"
            : l.streakDays > 0
              ? "active"
              : "inactive",
    }));
    const coaches: Row[] = mockCoaches.map((c, i) => ({
      id: c.id,
      name: c.name,
      avatar: c.avatarUrl,
      email: c.email,
      role: "coach",
      joinedAt: c.joinedAt,
      activity: c.activeLearners,
      metric: `${c.activeLearners} learners`,
      rating: c.rating,
      status: c.verified
        ? "active"
        : i % 5 === 0
          ? "pending"
          : "inactive",
    }));
    return [...learners, ...coaches];
  }, []);

  // Apply tab + role + status + search
  const filtered = useMemo(() => {
    let list = allRows;
    if (tab === "learners") list = list.filter((r) => r.role === "learner");
    if (tab === "coaches") list = list.filter((r) => r.role === "coach");
    if (roleFilter !== "all") list = list.filter((r) => r.role === roleFilter);
    if (statusFilter !== "all")
      list = list.filter((r) => r.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "joinedAt")
        cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      else if (sortKey === "activity") cmp = a.activity - b.activity;
      else cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [allRows, tab, roleFilter, statusFilter, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Summary stats
  const counts = useMemo(() => {
    const total = allRows.length;
    const active = allRows.filter((r) => r.status === "active").length;
    const inactive = allRows.filter((r) => r.status === "inactive").length;
    const pending = allRows.filter(
      (r) => r.status === "pending" || r.status === "flagged",
    ).length;
    return { total, active, inactive, pending };
  }, [allRows]);

  const toggleAll = () => {
    if (paged.every((r) => selected.has(r.id))) {
      const next = new Set(selected);
      paged.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paged.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const allOnPageSelected =
    paged.length > 0 && paged.every((r) => selected.has(r.id));

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <AppShell role="admin" title="User Management">
      <div className="max-w-[1440px] mx-auto pb-24 space-y-6">
        {/* ============ HEADER ============ */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
                <Users size={11} />
                User Administration
              </span>
              <span className="text-[12px] text-on-surface-variant">
                {formatNumber(counts.total)} accounts on the platform
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              Review, manage, and moderate every account on Sportico.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="h-11 px-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13.5px] font-medium transition-colors">
              <Download size={15} />
              Export CSV
            </button>
            <button className="h-11 px-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <UserPlus size={15} strokeWidth={2.5} />
              Invite User
            </button>
          </div>
        </motion.header>

        {/* ============ SUMMARY CARDS ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={Users}
            label="Total Users"
            value={formatNumber(counts.total)}
            trend="+12%"
            trendLabel="vs last month"
            accent="indigo"
            spark={seedSpark(1, counts.total / 5, 8)}
            delay={0.05}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={UserCheck}
            label="Active"
            value={formatNumber(counts.active)}
            trend="+8%"
            trendLabel="this week"
            accent="emerald"
            spark={seedSpark(2, counts.active / 4, 6)}
            delay={0.1}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={UserX}
            label="Inactive"
            value={formatNumber(counts.inactive)}
            trend="−4%"
            trendLabel="re-engage"
            accent="neutral"
            spark={seedSpark(3, counts.inactive / 4, 5)}
            delay={0.15}
            reduce={reduce ?? false}
          />
          <SummaryCard
            icon={ShieldAlert}
            label="Pending Review"
            value={formatNumber(counts.pending)}
            trend={`${counts.pending} open`}
            trendLabel="needs action"
            accent="amber"
            spark={seedSpark(4, counts.pending / 2 || 3, 3)}
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ 2-COLUMN (Table + Sidebar) ============ */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* ============ LEFT: TABLE COLUMN ============ */}
          <div className="space-y-4 min-w-0">
            {/* Tabs + filter bar (sticky) */}
            <div className="sticky top-16 z-20 -mx-2 px-2 pt-2 pb-1 bg-surface/80 backdrop-blur-md">
              <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.06)] space-y-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-[10px] w-fit">
                  {(
                    [
                      {
                        id: "all" as Tab,
                        label: "All Users",
                        count: allRows.length,
                      },
                      {
                        id: "learners" as Tab,
                        label: "Learners",
                        count: mockLearners.length,
                      },
                      {
                        id: "coaches" as Tab,
                        label: "Coaches",
                        count: mockCoaches.length,
                      },
                    ]
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTab(t.id);
                        setPage(1);
                      }}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] font-medium rounded-[7px] transition-colors",
                        tab === t.id
                          ? "text-on-surface"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {tab === t.id && (
                        <motion.span
                          layoutId="usersTabPill"
                          className="absolute inset-0 bg-surface-container-lowest rounded-[7px] shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
                          transition={{
                            type: "spring",
                            duration: reduce ? 0 : 0.4,
                            bounce: 0.2,
                          }}
                        />
                      )}
                      <span className="relative">{t.label}</span>
                      <span
                        className={cn(
                          "relative inline-flex items-center justify-center px-1.5 h-4 rounded-full text-[10px] font-semibold tabular-nums",
                          tab === t.id
                            ? "bg-primary/15 text-primary"
                            : "bg-surface-container-high text-on-surface-variant",
                        )}
                      >
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by name or email…"
                      className="w-full h-10 pl-9 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13px] placeholder:text-on-surface-variant transition-all"
                    />
                  </div>

                  <FilterSelect
                    label="Role"
                    value={roleFilter}
                    onChange={(v) => {
                      setRoleFilter(v as Role | "all");
                      setPage(1);
                    }}
                    options={[
                      { value: "all", label: "All roles" },
                      { value: "learner", label: "Learners" },
                      { value: "coach", label: "Coaches" },
                    ]}
                  />
                  <FilterSelect
                    label="Status"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v as Status | "all");
                      setPage(1);
                    }}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "pending", label: "Pending" },
                      { value: "flagged", label: "Flagged" },
                    ]}
                  />
                  <FilterSelect
                    label="Sort"
                    value={sortKey}
                    onChange={(v) => setSortKey(v as SortKey)}
                    options={[
                      { value: "joinedAt", label: "Join date" },
                      { value: "name", label: "Name" },
                      { value: "activity", label: "Activity" },
                      { value: "status", label: "Status" },
                    ]}
                  />
                  <button
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className={cn(
                      "h-10 px-3 inline-flex items-center gap-1.5 rounded-[10px] border text-[12.5px] font-medium transition-colors",
                      advancedOpen
                        ? "border-primary/40 bg-primary/[0.04] text-primary"
                        : "border-[var(--color-border-soft)] hover:bg-surface-container-low",
                    )}
                  >
                    <Filter size={13} />
                    More
                  </button>
                  <div className="ml-auto text-[11.5px] text-on-surface-variant whitespace-nowrap">
                    {formatNumber(filtered.length)} of{" "}
                    {formatNumber(allRows.length)} shown
                  </div>
                </div>

                {/* Advanced filters */}
                <AnimatePresence>
                  {advancedOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border-soft)]">
                        <ChipFilter
                          icon={Calendar}
                          label="Join date"
                          value="Any"
                        />
                        <ChipFilter
                          icon={Clock}
                          label="Last active"
                          value="Any"
                        />
                        <ChipFilter icon={Star} label="Rating" value="Any" />
                        <ChipFilter
                          icon={Flag}
                          label="Region"
                          value="Worldwide"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Table */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.5, delay: 0.25, ease: EASE }}
              className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="pl-5 sm:pl-6 pr-2 py-3 w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onChange={toggleAll}
                          aria-label="Select all on page"
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader
                          label="User"
                          active={sortKey === "name"}
                          dir={sortDir}
                          onClick={() => handleSort("name")}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Role</th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader
                          label="Joined"
                          active={sortKey === "joinedAt"}
                          dir={sortDir}
                          onClick={() => handleSort("joinedAt")}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader
                          label="Activity"
                          active={sortKey === "activity"}
                          dir={sortDir}
                          onClick={() => handleSort("activity")}
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader
                          label="Status"
                          active={sortKey === "status"}
                          dir={sortDir}
                          onClick={() => handleSort("status")}
                        />
                      </th>
                      <th className="pr-5 sm:pr-6 pl-3 py-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
                            <Search
                              size={16}
                              className="text-on-surface-variant"
                            />
                          </div>
                          <p className="text-[13.5px] font-semibold">
                            No users match your filters
                          </p>
                          <p className="text-[12px] text-on-surface-variant mt-1">
                            Try clearing search or selecting a broader status.
                          </p>
                        </td>
                      </tr>
                    )}
                    {paged.map((r, i) => {
                      const status = STATUS_META[r.status];
                      const isSelected = selected.has(r.id);
                      return (
                        <tr
                          key={r.id}
                          onClick={() => toggleOne(r.id)}
                          className={cn(
                            "border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors cursor-pointer group",
                            i % 2 === 1 && !isSelected && "bg-surface-container-low/15",
                            isSelected
                              ? "bg-primary/[0.05] hover:bg-primary/[0.08]"
                              : "hover:bg-primary/[0.03]",
                          )}
                        >
                          <td
                            className="pl-5 sm:pl-6 pr-2 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleOne(r.id)}
                              aria-label={`Select ${r.name}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={r.avatar}
                                  alt={r.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <span
                                  className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-container-lowest",
                                    status.dot,
                                  )}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold truncate">
                                  {r.name}
                                </p>
                                <p className="text-[11.5px] text-on-surface-variant truncate">
                                  {r.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                                r.role === "coach"
                                  ? "bg-primary/8 text-primary border-primary/20"
                                  : "bg-[#8b5cf6]/8 text-[#7c3aed] border-[#8b5cf6]/20",
                              )}
                            >
                              {r.role === "coach" ? "Coach" : "Learner"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-[12.5px] text-on-surface">
                              {new Date(r.joinedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                            <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                              {relativeJoined(r.joinedAt)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-1 rounded-full bg-surface-container-low overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#7d6dff]"
                                  style={{
                                    width: `${Math.min(100, (r.activity / 100) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="text-[11.5px] text-on-surface-variant truncate">
                                {r.metric}
                              </p>
                            </div>
                            {r.rating && (
                              <p className="text-[10.5px] text-on-surface-variant inline-flex items-center gap-0.5 mt-0.5">
                                <Star
                                  size={9}
                                  className="fill-[#f59e0b] stroke-[#f59e0b]"
                                />
                                {r.rating.toFixed(1)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                                status.pill,
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  status.dot,
                                )}
                              />
                              {status.label}
                            </span>
                          </td>
                          <td
                            className="pr-5 sm:pr-6 pl-3 py-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <RowAction
                                icon={Pencil}
                                label="Edit"
                                tone="default"
                              />
                              <RowAction
                                icon={MessageCircle}
                                label="Message"
                                tone="default"
                              />
                              <RowAction
                                icon={Ban}
                                label="Deactivate"
                                tone="danger"
                              />
                              <RowAction
                                icon={MoreHorizontal}
                                label="More"
                                tone="default"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                setPage={setPage}
                shown={paged.length}
                total={filtered.length}
              />
            </motion.section>
          </div>

          {/* ============ RIGHT: INSIGHTS SIDEBAR ============ */}
          <aside className="space-y-5">
            <InsightsCard rows={allRows} reduce={reduce ?? false} />
            <RecentJoins rows={allRows} reduce={reduce ?? false} />
            <QuickActions reduce={reduce ?? false} />
          </aside>
        </div>
      </div>

      {/* ============ BULK ACTION BAR ============ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkActionBar
            count={selected.size}
            onClear={clearSelection}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ============================================================================
// Summary Card
// ============================================================================

const SUMMARY_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    decor: "from-primary/15 to-primary/0",
    stroke: "#4f46e5",
    trend: "text-primary",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
    stroke: "#10b981",
    trend: "text-[#1f7a4d]",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
    stroke: "#f59e0b",
    trend: "text-[#b45309]",
  },
  neutral: {
    iconBg: "bg-gradient-to-br from-[#64748b] to-[#94a3b8]",
    glow: "shadow-[0_4px_14px_-3px_rgba(100,116,139,0.3)]",
    decor: "from-[#94a3b8]/15 to-[#94a3b8]/0",
    stroke: "#64748b",
    trend: "text-on-surface-variant",
  },
} as const;

function SummaryCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  accent,
  spark,
  delay,
  reduce,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend?: string;
  trendLabel?: string;
  accent: keyof typeof SUMMARY_ACCENTS;
  spark: { i: number; v: number }[];
  delay: number;
  reduce: boolean;
}) {
  const a = SUMMARY_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow cursor-pointer"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
          a.decor,
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[12px] flex items-center justify-center text-white transition-transform group-hover:scale-105",
              a.iconBg,
              a.glow,
            )}
          >
            <Icon size={17} strokeWidth={2.25} />
          </div>
          <ArrowUpRight
            size={15}
            className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
          />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </p>
        <p className="text-[24px] sm:text-[26px] leading-none font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>
        <div className="h-7 mt-2.5 -mx-1">
          <ClientOnly fallback={<div className="h-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={spark}
                margin={{ top: 2, right: 4, bottom: 0, left: 4 }}
              >
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={a.stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!reduce}
                  animationDuration={reduce ? 0 : 1100}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[11px]">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                a.trend,
              )}
            >
              <TrendingUp size={10} />
              {trend}
            </span>
          )}
          {trendLabel && (
            <span className="text-on-surface-variant">{trendLabel}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Filter primitives
// ============================================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-10 pl-3 pr-8 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-[12.5px] font-medium outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/8 cursor-pointer transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
      />
    </div>
  );
}

function ChipFilter({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-dashed border-[var(--color-border-soft)] hover:border-primary/30 hover:bg-primary/[0.04] text-[12px] font-medium text-on-surface-variant transition-colors">
      <Icon size={12} />
      <span className="text-on-surface">{label}:</span>
      <span>{value}</span>
    </button>
  );
}

// ============================================================================
// Table primitives
// ============================================================================

function Checkbox({
  checked,
  onChange,
  ...rest
}: {
  checked: boolean;
  onChange: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
        {...rest}
      />
      <span
        className={cn(
          "w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all",
          checked
            ? "bg-gradient-to-br from-primary to-[#5b4ee8] border-primary shadow-[0_2px_6px_-1px_rgba(53,37,205,0.4)]"
            : "border-[var(--color-outline-variant)] bg-surface-container-lowest hover:border-primary/50",
        )}
      >
        {checked && (
          <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
        )}
      </span>
    </label>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 hover:text-on-surface transition-colors",
        active && "text-primary",
      )}
    >
      {label}
      <span className="inline-flex flex-col items-center">
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={10} />
          ) : (
            <ArrowDown size={10} />
          )
        ) : (
          <span className="w-2.5 h-2.5 opacity-30">
            <ArrowDown size={10} />
          </span>
        )}
      </span>
    </button>
  );
}

function RowAction({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Pencil;
  label: string;
  tone: "default" | "danger";
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "w-8 h-8 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center",
        tone === "danger"
          ? "text-on-surface-variant hover:text-[#ba1a1a]"
          : "text-on-surface-variant hover:text-on-surface",
      )}
    >
      <Icon size={13} />
    </button>
  );
}

// ============================================================================
// Pagination
// ============================================================================

function Pagination({
  page,
  totalPages,
  pageSize,
  setPageSize,
  setPage,
  shown,
  total,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (n: number) => void;
  setPage: (n: number) => void;
  shown: number;
  total: number;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = (page - 1) * pageSize + shown;

  // Build page button list — show first, last, current ±1
  const pageList: (number | "…")[] = [];
  const push = (n: number) => {
    if (!pageList.includes(n) && n >= 1 && n <= totalPages) pageList.push(n);
  };
  push(1);
  if (page - 1 > 2) pageList.push("…");
  push(page - 1);
  push(page);
  push(page + 1);
  if (page + 1 < totalPages - 1) pageList.push("…");
  push(totalPages);

  return (
    <div className="px-5 sm:px-6 py-3 border-t border-[var(--color-border-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]">
      <div className="flex items-center gap-3">
        <span className="text-on-surface-variant">
          Showing{" "}
          <span className="text-on-surface font-semibold tabular-nums">
            {start}–{end}
          </span>{" "}
          of{" "}
          <span className="text-on-surface font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
        </span>
        <span className="text-on-surface-variant/40">·</span>
        <div className="inline-flex items-center gap-1.5">
          <span className="text-on-surface-variant">Rows</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none h-7 pl-2 pr-6 rounded-md border border-[var(--color-border-soft)] bg-surface-container-lowest text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <PageNav
          icon={ChevronsLeft}
          disabled={page === 1}
          onClick={() => setPage(1)}
          label="First"
        />
        <PageNav
          icon={ChevronLeft}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          label="Previous"
        />
        {pageList.map((p, i) =>
          p === "…" ? (
            <span
              key={`e${i}`}
              className="px-1.5 text-[11px] text-on-surface-variant"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "min-w-[28px] h-7 px-2 rounded-md text-[12px] font-semibold tabular-nums transition-colors",
                p === page
                  ? "bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary shadow-[0_3px_8px_-2px_rgba(53,37,205,0.4)]"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              {p}
            </button>
          ),
        )}
        <PageNav
          icon={ChevronRight}
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          label="Next"
        />
        <PageNav
          icon={ChevronsRight}
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
          label="Last"
        />
      </div>
    </div>
  );
}

function PageNav({
  icon: Icon,
  disabled,
  onClick,
  label,
}: {
  icon: typeof ChevronLeft;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-md border border-[var(--color-border-soft)] hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
    >
      <Icon size={12} />
    </button>
  );
}

// ============================================================================
// Bulk action bar
// ============================================================================

function BulkActionBar({
  count,
  onClear,
  reduce,
}: {
  count: number;
  onClear: () => void;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{
        type: "spring",
        duration: reduce ? 0 : 0.4,
        bounce: 0.15,
      }}
      className="fixed bottom-5 left-4 right-4 lg:left-[calc(16rem+1.5rem)] lg:right-6 z-40"
    >
      <div className="max-w-[1340px] mx-auto rounded-[16px] bg-on-surface/95 backdrop-blur-md text-white p-3 pl-5 flex items-center justify-between gap-3 shadow-[0_12px_32px_-8px_rgba(15,15,30,0.4),0_4px_12px_-4px_rgba(15,15,30,0.15)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#7d6dff] text-on-primary text-[12.5px] font-bold tabular-nums shadow-[0_3px_10px_-2px_rgba(53,37,205,0.45)]">
            {count}
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-tight">
              {count} selected
            </p>
            <p className="text-[11px] text-white/60 truncate">
              Apply a bulk action below
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <BulkBtn icon={Ban} label="Deactivate" />
          <BulkBtn icon={Download} label="Export" />
          <BulkBtn icon={MessageCircle} label="Message" />
          <BulkBtn icon={Trash2} label="Delete" danger />
          <button
            onClick={onClear}
            aria-label="Clear selection"
            className="ml-2 w-9 h-9 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function BulkBtn({
  icon: Icon,
  label,
  danger,
}: {
  icon: typeof Ban;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-semibold transition-colors",
        danger
          ? "bg-[#ef4444]/20 text-[#fca5a5] hover:bg-[#ef4444]/30 hover:text-white"
          : "bg-white/10 text-white hover:bg-white/15",
      )}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================================================
// Insights Sidebar
// ============================================================================

function InsightsCard({
  rows,
  reduce,
}: {
  rows: Row[];
  reduce: boolean;
}) {
  const inactive = rows.filter((r) => r.status === "inactive").length;
  const flagged = rows.filter((r) => r.status === "flagged").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.15, ease: EASE }}
      className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_10px_28px_-16px_rgba(53,37,205,0.25)]"
    >
      <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-primary inline-flex items-center gap-1.5">
            <Sparkles size={11} />
            Admin Insights
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>

        <p className="text-[13px] text-on-surface font-medium leading-snug mb-3">
          <span className="text-[#b95000]">{pending + flagged}</span> accounts
          need your attention right now.
        </p>

        <ul className="space-y-2">
          <InsightRow
            icon={UserX}
            label="Inactive 30d+"
            value={inactive}
            tone="neutral"
            action="Re-engage"
          />
          <InsightRow
            icon={Flag}
            label="Flagged accounts"
            value={flagged}
            tone="danger"
            action="Review"
          />
          <InsightRow
            icon={ShieldAlert}
            label="Suspicious activity"
            value={2}
            tone="danger"
            action="Investigate"
          />
          <InsightRow
            icon={Clock}
            label="Pending approval"
            value={pending}
            tone="warn"
            action="Approve"
          />
        </ul>
      </div>
    </motion.div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  tone,
  action,
}: {
  icon: typeof UserX;
  label: string;
  value: number;
  tone: "neutral" | "warn" | "danger";
  action: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#ba1a1a]"
      : tone === "warn"
        ? "text-[#b95000]"
        : "text-on-surface-variant";
  return (
    <li className="group flex items-center gap-3 p-3 rounded-[12px] bg-surface-container-lowest/80 backdrop-blur-sm border border-[var(--color-border-soft)] hover:border-primary/20 transition-colors cursor-pointer">
      <Icon size={14} className={toneClass} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-on-surface truncate">
          {label}
        </p>
      </div>
      <span className={cn("text-[15px] font-bold tabular-nums", toneClass)}>
        {value}
      </span>
      <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        {action}
      </span>
    </li>
  );
}

function RecentJoins({
  rows,
  reduce,
}: {
  rows: Row[];
  reduce: boolean;
}) {
  const recent = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime(),
        )
        .slice(0, 4),
    [rows],
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.22, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold tracking-tight">
          Recent Joins
        </h3>
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant">
          24h
        </span>
      </div>
      <ul className="space-y-2">
        {recent.map((r, i) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduce ? 0 : 0.35,
              delay: reduce ? 0 : 0.27 + i * 0.05,
              ease: EASE,
            }}
            whileHover={reduce ? {} : { x: 2 }}
            className="group flex items-center gap-3 p-2 rounded-[12px] hover:bg-surface-container-low/60 transition-colors cursor-pointer"
          >
            <img
              src={r.avatar}
              alt={r.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate">{r.name}</p>
              <p className="text-[10.5px] text-on-surface-variant truncate">
                {r.role === "coach" ? "Coach" : "Learner"} ·{" "}
                {relativeJoined(r.joinedAt)}
              </p>
            </div>
            <ChevronRight
              size={12}
              className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
            />
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

// ============================================================================
// Quick Actions
// ============================================================================

function QuickActions({ reduce }: { reduce: boolean }) {
  const items = [
    {
      icon: UserPlus,
      label: "Invite User",
      desc: "Send sign-up link",
      accent: "indigo" as const,
    },
    {
      icon: Download,
      label: "Export List",
      desc: "CSV · Excel",
      accent: "violet" as const,
    },
    {
      icon: ShieldAlert,
      label: "Audit Log",
      desc: "Recent actions",
      accent: "amber" as const,
    },
  ];
  const QA = {
    indigo: "from-primary to-[#7d6dff]",
    violet: "from-[#8b5cf6] to-[#c084fc]",
    amber: "from-[#f59e0b] to-[#fb923c]",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.3, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <h3 className="text-[15px] font-semibold tracking-tight mb-3">
        Quick Actions
      </h3>
      <div className="space-y-2">
        {items.map((q, i) => {
          const Icon = q.icon;
          return (
            <motion.button
              key={q.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduce ? 0 : 0.35,
                delay: reduce ? 0 : 0.35 + i * 0.05,
                ease: EASE,
              }}
              whileHover={reduce ? {} : { x: 2 }}
              className="group w-full flex items-center gap-3 p-3 rounded-[14px] border border-[var(--color-border-soft)] hover:border-primary/20 bg-surface-container-lowest hover:bg-gradient-to-br hover:from-primary/[0.03] hover:to-transparent transition-all text-left"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-[10px] bg-gradient-to-br flex items-center justify-center text-white shadow-[0_3px_10px_-2px_rgba(15,15,30,0.18)] shrink-0",
                  QA[q.accent],
                )}
              >
                <Icon size={14} strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold leading-tight">
                  {q.label}
                </p>
                <p className="text-[10.5px] text-on-surface-variant mt-0.5">
                  {q.desc}
                </p>
              </div>
              <ChevronRight
                size={13}
                className="text-on-surface-variant opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
              />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function relativeJoined(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Silence unused imports kept for reserved actions
void Fragment;
void AlertTriangle;
