"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import { cn, formatNumber, initials } from "@/lib/utils";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showError } from "@/lib/toast";
import * as adminUserService from "@/lib/admin/adminUserService";
import type { AdminUserItem } from "@/lib/types/admin-user";
import { UserFormModal } from "./_components/UserFormModal";
import { UserDetailModal } from "./_components/UserDetailModal";

const EASE = [0.16, 1, 0.3, 1] as const;

// ---- Status / role meta -----------------------------------------------------

const STATUS_META: Record<string, { label: string; pill: string; dot: string }> = {
  active: {
    label: "Đang hoạt động",
    pill: "bg-success-container text-[#1f7a4d] border-[#bce8c8]",
    dot: "bg-[#10b981]",
  },
  inactive: {
    label: "Không hoạt động",
    pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
    dot: "bg-on-surface-variant/40",
  },
  pending: {
    label: "Đang chờ",
    pill: "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60",
    dot: "bg-[#f59e0b]",
  },
};

/** Normalise the role field — backend may send `role: string` or `roles: string[]`. */
function getPrimaryRole(u: AdminUserItem): string {
  const raw =
    (u.role && u.role.trim()) ||
    (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : "") ||
    "";
  return raw.trim().toLowerCase();
}

function statusMeta(s: string) {
  return (
    STATUS_META[s?.toLowerCase()] ?? {
      label: s,
      pill: "bg-surface-container-low text-on-surface-variant border-[var(--color-border-soft)]",
      dot: "bg-on-surface-variant/40",
    }
  );
}

/** Accepts the already-lowercased result of getPrimaryRole(). */
function rolePill(lower: string) {
  if (lower === "admin")  return "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]";
  if (lower === "coach")  return "bg-primary/8 text-primary border-primary/20";
  return "bg-[#8b5cf6]/8 text-[#7c3aed] border-[#8b5cf6]/20";
}

function roleLabel(lower: string) {
  if (lower === "admin")  return "Quản trị";
  if (lower === "coach")  return "Huấn luyện viên";
  return "Học viên";
}

// ---- Sort -------------------------------------------------------------------

type SortKey = "fullName" | "role" | "status" | "createdAt";

// ============================================================================
// Page
// ============================================================================

export default function AdminUsersPage() {
  const reduce = useReducedMotion();

  // ---- Query state -----------------------------------------------------------
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- Modals ----------------------------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserItem | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUserItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);


  // ---- Debounce search -------------------------------------------------------
  const handleSearchChange = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v.trim());
      setPage(1);
    }, 400);
  };

  // ---- Summary stats (parallel, once on mount) -------------------------------
  const { data: statsData } = useApiResource(
    () =>
      Promise.all([
        adminUserService.getUsers({ pageSize: 1 }),
        adminUserService.getUsers({ status: "active", pageSize: 1 }),
        adminUserService.getUsers({ role: "learner", pageSize: 1 }),
        adminUserService.getUsers({ role: "coach", pageSize: 1 }),
      ]),
    [],
  );
  const [totalAll, totalActive, totalLearners, totalCoaches] = statsData ?? [];

  // ---- Main table data -------------------------------------------------------
  const {
    data,
    loading,
    error,
    refetch,
  } = useApiResource(
    () =>
      adminUserService.getUsers({
        search: debouncedSearch || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        pageNumber: page,
        pageSize,
      }),
    [debouncedSearch, roleFilter, statusFilter, page, pageSize],
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  // Client-side sort of the current page slice
  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "fullName")
      cmp = (a.fullName ?? "").localeCompare(b.fullName ?? "", "vi");
    else if (sortKey === "role")
      cmp = getPrimaryRole(a).localeCompare(getPrimaryRole(b));
    else if (sortKey === "status")
      cmp = (a.status ?? "").localeCompare(b.status ?? "");
    else
      cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  // ---- Deactivate ------------------------------------------------------------
  const confirmDeactivate = async () => {
    if (!deactivateTarget || deactivating) return;
    setDeactivating(true);
    try {
      await adminUserService.deactivateUser(deactivateTarget.id);
      showSuccess(`Đã vô hiệu hóa "${deactivateTarget.fullName}".`);
      refetch();
    } catch {
      showError("Vô hiệu hóa thất bại. Vui lòng thử lại.");
    } finally {
      setDeactivating(false);
      setDeactivateTarget(null);
    }
  };

  // ---- Reset page on filter change -------------------------------------------
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  // ============================================================================
  return (
    <AppShell role="admin" title="Quản lý người dùng">
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
                Quản trị người dùng
              </span>
              <span className="text-[12px] text-on-surface-variant tabular-nums">
                {formatNumber(totalAll?.totalCount ?? 0)} tài khoản trên nền tảng
              </span>
            </div>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
              Quản lý người dùng
            </h1>
            <p className="text-[14px] text-on-surface-variant mt-1.5">
              Xem xét, quản lý và kiểm duyệt mọi tài khoản trên Sportico.
            </p>
          </div>
          <button
            onClick={() => { setEditUser(null); setFormOpen(true); }}
            className="h-11 px-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[14px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
          >
            <UserPlus size={15} strokeWidth={2.5} />
            Tạo người dùng
          </button>
        </motion.header>

        {/* ============ SUMMARY CARDS ============ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Users}
            label="Tổng người dùng"
            value={formatNumber(totalAll?.totalCount ?? 0)}
            accent="indigo"
            delay={0.05}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={UserCheck}
            label="Đang hoạt động"
            value={formatNumber(totalActive?.totalCount ?? 0)}
            accent="emerald"
            delay={0.1}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={UserX}
            label="Học viên"
            value={formatNumber(totalLearners?.totalCount ?? 0)}
            accent="violet"
            delay={0.15}
            reduce={reduce ?? false}
          />
          <KpiCard
            icon={ShieldAlert}
            label="Huấn luyện viên"
            value={formatNumber(totalCoaches?.totalCount ?? 0)}
            accent="amber"
            delay={0.2}
            reduce={reduce ?? false}
          />
        </section>

        {/* ============ FILTER BAR ============ */}
        <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-3 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.06)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm theo tên hoặc email…"
                className="w-full h-10 pl-9 pr-3 bg-surface-container-low border border-transparent hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[10px] outline-none text-[13px] placeholder:text-on-surface-variant transition-all"
              />
            </div>

            {/* Role filter */}
            <FilterSelect
              label="Vai trò"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: "all", label: "Tất cả vai trò" },
                { value: "learner", label: "Học viên" },
                { value: "coach", label: "Huấn luyện viên" },
                { value: "admin", label: "Quản trị" },
              ]}
            />

            {/* Status filter */}
            <FilterSelect
              label="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "active", label: "Đang hoạt động" },
                { value: "inactive", label: "Không hoạt động" },
                { value: "pending", label: "Đang chờ" },
              ]}
            />

            <div className="ml-auto text-[11.5px] text-on-surface-variant whitespace-nowrap tabular-nums">
              {formatNumber(totalCount)} kết quả
            </div>
          </div>
        </div>

        {/* ============ TABLE ============ */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.25, ease: EASE }}
          className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
        >
          {loading ? (
            <LoadingState label="Đang tải người dùng…" />
          ) : error ? (
            <ErrorState onRetry={refetch} className="m-6" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className="bg-surface-container-low/40 border-b border-[var(--color-border-soft)] text-[10.5px] uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="pl-5 sm:pl-6 pr-3 py-3 font-semibold">
                        <SortHeader label="Người dùng" active={sortKey === "fullName"} dir={sortDir} onClick={() => handleSort("fullName")} />
                      </th>
                      <th className="px-3 py-3 font-semibold hidden sm:table-cell">Điện thoại</th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader label="Vai trò" active={sortKey === "role"} dir={sortDir} onClick={() => handleSort("role")} />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <SortHeader label="Trạng thái" active={sortKey === "status"} dir={sortDir} onClick={() => handleSort("status")} />
                      </th>
                      <th className="px-3 py-3 font-semibold hidden lg:table-cell">
                        <SortHeader label="Ngày tạo" active={sortKey === "createdAt"} dir={sortDir} onClick={() => handleSort("createdAt")} />
                      </th>
                      <th className="pr-5 sm:pr-6 pl-3 py-3 font-semibold text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center">
                          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
                            <Search size={16} className="text-on-surface-variant" />
                          </div>
                          <p className="text-[13.5px] font-semibold">Không tìm thấy người dùng</p>
                          <p className="text-[12px] text-on-surface-variant mt-1">
                            Thử xóa tìm kiếm hoặc chọn bộ lọc khác.
                          </p>
                        </td>
                      </tr>
                    )}
                    {sorted.map((u, i) => {
                      const sm = statusMeta(u.status);
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.03 }}
                          className={cn(
                            "border-b border-[var(--color-border-soft)] last:border-b-0 transition-colors group",
                            i % 2 === 1 && "bg-surface-container-low/15",
                            "hover:bg-primary/[0.03]",
                          )}
                        >
                          {/* User */}
                          <td className="pl-5 sm:pl-6 pr-3 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-[#7d6dff]/60 flex items-center justify-center text-on-primary text-[13px] font-semibold">
                                  {initials(u.fullName ?? "?")}
                                </div>
                                <span
                                  className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-container-lowest",
                                    sm.dot,
                                  )}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold truncate">{u.fullName ?? "—"}</p>
                                <p className="text-[11.5px] text-on-surface-variant truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-3 py-3 hidden sm:table-cell">
                            <p className="text-[12.5px] text-on-surface-variant tabular-nums">
                              {u.phoneNumber || "—"}
                            </p>
                          </td>

                          {/* Role */}
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                                rolePill(getPrimaryRole(u)),
                              )}
                            >
                              {roleLabel(getPrimaryRole(u))}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                                sm.pill,
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
                              {sm.label}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <p className="text-[12.5px] text-on-surface tabular-nums">
                              {new Date(u.createdAt).toLocaleDateString("vi-VN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </td>

                          {/* Actions */}
                          <td
                            className="pr-5 sm:pr-6 pl-3 py-3 text-right"
                          >
                            <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <RowAction
                                icon={Eye}
                                label="Xem chi tiết"
                                tone="default"
                                onClick={() => setDetailUser(u)}
                              />
                              <RowAction
                                icon={Pencil}
                                label="Chỉnh sửa"
                                tone="default"
                                onClick={() => { setEditUser(u); setFormOpen(true); }}
                              />
                              <RowAction
                                icon={Ban}
                                label="Vô hiệu hóa"
                                tone="danger"
                                onClick={() => setDeactivateTarget(u)}
                              />
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={(s) => { setPageSize(s); setPage(1); }}
                setPage={setPage}
                shown={sorted.length}
                total={totalCount}
              />
            </>
          )}
        </motion.section>
      </div>

      {/* ============ MODALS ============ */}
      <UserFormModal
        open={formOpen}
        user={editUser}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        onSuccess={(msg) => { showSuccess(msg); refetch(); }}
      />

      <UserDetailModal
        open={detailUser !== null}
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onEdit={(u) => { setEditUser(u); setFormOpen(true); }}
      />

      {/* ============ DEACTIVATE CONFIRM ============ */}
      <AnimatePresence>
        {deactivateTarget && (
          <motion.div
            key="deactivate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
              className="w-full max-w-sm rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_20px_60px_-10px_rgba(15,15,30,0.35)]"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#ffdad6] flex items-center justify-center mb-4">
                <Ban size={20} className="text-[#ba1a1a]" />
              </div>
              <h3 className="text-[16px] font-bold mb-1">Vô hiệu hóa người dùng?</h3>
              <p className="text-[13px] text-on-surface-variant mb-5">
                Tài khoản{" "}
                <span className="font-semibold text-on-surface">
                  {deactivateTarget.fullName}
                </span>{" "}
                sẽ bị vô hiệu hóa. Thao tác này có thể hoàn tác sau.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeactivateTarget(null)}
                  disabled={deactivating}
                  className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeactivate}
                  disabled={deactivating}
                  className="h-9 px-4 rounded-[8px] bg-[#ba1a1a] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#9b1515] transition-colors disabled:opacity-60"
                >
                  {deactivating && <Loader2 size={13} className="animate-spin" />}
                  Vô hiệu hóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Insights fab — only in non-loading state */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.4, delay: 0.5, ease: EASE }}
          className="fixed bottom-5 left-[calc(16rem+1.5rem)] z-30 hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/[0.08] to-[#7d6dff]/[0.08] border border-primary/15 text-[12px] font-medium text-primary shadow-[0_2px_8px_-2px_rgba(53,37,205,0.15)]"
        >
          <Sparkles size={12} />
          {formatNumber(totalAll?.totalCount ?? 0)} người dùng được quản lý
        </motion.div>
      )}
    </AppShell>
  );
}

// ============================================================================
// KPI Card
// ============================================================================

const KPI_ACCENTS = {
  indigo: {
    iconBg: "bg-gradient-to-br from-primary to-[#7d6dff]",
    glow: "shadow-[0_4px_14px_-3px_rgba(53,37,205,0.4)]",
    decor: "from-primary/15 to-primary/0",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    glow: "shadow-[0_4px_14px_-3px_rgba(16,185,129,0.4)]",
    decor: "from-[#34d399]/15 to-[#34d399]/0",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#f59e0b] to-[#fb923c]",
    glow: "shadow-[0_4px_14px_-3px_rgba(245,158,11,0.4)]",
    decor: "from-[#f59e0b]/15 to-[#f59e0b]/0",
  },
  violet: {
    iconBg: "bg-gradient-to-br from-[#8b5cf6] to-[#c084fc]",
    glow: "shadow-[0_4px_14px_-3px_rgba(139,92,246,0.4)]",
    decor: "from-[#8b5cf6]/15 to-[#8b5cf6]/0",
  },
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  delay,
  reduce,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: keyof typeof KPI_ACCENTS;
  delay: number;
  reduce: boolean;
}) {
  const a = KPI_ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      whileHover={reduce ? {} : { y: -3 }}
      className="group relative overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_20px_-12px_rgba(15,15,30,0.08)] hover:shadow-[0_2px_4px_rgba(15,15,30,0.04),0_16px_36px_-12px_rgba(15,15,30,0.14)] transition-shadow"
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-100 transition-opacity",
          a.decor,
        )}
      />
      <div className="relative">
        <div
          className={cn(
            "w-10 h-10 rounded-[12px] flex items-center justify-center text-white mb-3",
            a.iconBg,
            a.glow,
          )}
        >
          <Icon size={17} strokeWidth={2.25} />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-medium text-on-surface-variant">
          {label}
        </p>
        <p className="text-[24px] sm:text-[26px] leading-none font-bold tracking-tight tabular-nums mt-1">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Filter select
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
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">
        ▾
      </span>
    </div>
  );
}

// ============================================================================
// Sort header
// ============================================================================

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
          dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
        ) : (
          <span className="w-2.5 h-2.5 opacity-30">
            <ArrowDown size={10} />
          </span>
        )}
      </span>
    </button>
  );
}

// ============================================================================
// Row action
// ============================================================================

function RowAction({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: typeof Pencil;
  label: string;
  tone: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
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
          Hiển thị{" "}
          <span className="text-on-surface font-semibold tabular-nums">
            {start}–{end}
          </span>{" "}
          trong{" "}
          <span className="text-on-surface font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
        </span>
        <span className="text-on-surface-variant/40">·</span>
        <div className="inline-flex items-center gap-1.5">
          <span className="text-on-surface-variant">Hàng</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none h-7 pl-2 pr-6 rounded-md border border-[var(--color-border-soft)] bg-surface-container-lowest text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">▾</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <PageNav icon={ChevronsLeft} disabled={page === 1} onClick={() => setPage(1)} label="Đầu" />
        <PageNav icon={ChevronLeft} disabled={page === 1} onClick={() => setPage(page - 1)} label="Trước" />
        {pageList.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-[11px] text-on-surface-variant">…</span>
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
        <PageNav icon={ChevronRight} disabled={page === totalPages} onClick={() => setPage(page + 1)} label="Sau" />
        <PageNav icon={ChevronsRight} disabled={page === totalPages} onClick={() => setPage(totalPages)} label="Cuối" />
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

