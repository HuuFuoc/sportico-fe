"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Loader2,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, relativeDay } from "@/lib/utils";
import { api, type VerificationKind } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { showSuccess, showError } from "@/lib/toast";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { VerificationRequest } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type Filter = "all" | "pending" | "approved" | "rejected";

const STATUS_META: Record<
  "pending" | "approved" | "rejected",
  { label: string; pill: string; dot: string }
> = {
  pending: {
    label: "Chờ duyệt",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Đã duyệt",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Từ chối",
    pill: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
  },
};

const FILTER_TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
];

// ---------------------------------------------------------------------------
// Reject Modal
// ---------------------------------------------------------------------------

function RejectModal({
  item,
  onClose,
  onConfirm,
  loading,
}: {
  item: VerificationRequest;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.15, ease: EASE }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-2xl"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.2, ease: EASE }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-on-surface">
              Từ chối tài khoản ngân hàng
            </h3>
            <p className="mt-0.5 text-[13px] text-on-surface-variant">
              {item.coachName} — {item.title ?? "Không có tên ngân hàng"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[12px] font-medium text-on-surface-variant">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Thông tin tài khoản không khớp với CMND/Hộ chiếu đã đăng ký…"
            rows={3}
            className="w-full rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 rounded-[8px] bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Xác nhận từ chối
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function BankVerificationRow({
  item,
  index,
  coachProfile,
  onApproved,
  onRejected,
}: {
  item: VerificationRequest;
  index: number;
  coachProfile?: { name: string; avatarUrl?: string } | null;
  onApproved: (id: string) => void;
  onRejected: (id: string) => void;
}) {
  const prefersReduced = useReducedMotion();
  const coachName = coachProfile?.name ?? item.coachName;
  const coachAvatar = coachProfile?.avatarUrl ?? item.coachAvatar;
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const meta = STATUS_META[item.status];

  const handleApprove = async () => {
    setActionLoading("approve");
    try {
      await api.approveVerification(item.id, "payout-account" as VerificationKind);
      showSuccess("Đã duyệt tài khoản ngân hàng.");
      onApproved(item.id);
    } catch {
      showError("Không thể duyệt. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    setActionLoading("reject");
    try {
      await api.rejectVerification(item.id, "payout-account" as VerificationKind, reason);
      showSuccess("Đã từ chối tài khoản ngân hàng.");
      setRejectOpen(false);
      onRejected(item.id);
    } catch {
      showError("Không thể từ chối. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {rejectOpen && (
          <RejectModal
            item={item}
            onClose={() => setRejectOpen(false)}
            onConfirm={handleReject}
            loading={actionLoading === "reject"}
          />
        )}
      </AnimatePresence>

      <motion.tr
        className="group border-b border-[var(--color-border-soft)] last:border-0 hover:bg-surface-container-low/40 transition-colors"
        initial={prefersReduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 + index * 0.04, duration: 0.3, ease: EASE }}
      >
        {/* Coach */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={coachAvatar}
              alt={coachName}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = item.coachAvatar;
              }}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {coachName}
              </p>
              <p className="text-[11px] text-on-surface-variant font-mono truncate">
                ID: {item.coachId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </td>

        {/* Bank account */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Building2 className="h-3.5 w-3.5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {item.title ?? item.documents[0]?.name ?? "—"}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-on-surface-variant shrink-0" />
                <p className="text-[11px] text-on-surface-variant truncate">
                  {item.notes ?? "Không có tên chủ TK"}
                </p>
              </div>
            </div>
          </div>
        </td>

        {/* Submitted */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-[13px] text-on-surface-variant">
            {relativeDay(new Date(item.submittedAt))}
          </p>
          <p className="text-[11px] text-on-surface-variant/60 tabular-nums">
            {new Date(item.submittedAt).toLocaleDateString("vi-VN")}
          </p>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
              meta.pill,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          {item.status === "pending" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-[7px] bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "approve" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Duyệt
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-[7px] border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <X className="h-3 w-3" />
                Từ chối
              </button>
            </div>
          ) : item.status === "approved" ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <BadgeCheck className="h-4 w-4" />
              <span className="text-[12px] font-medium">Đã duyệt</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-on-surface-variant/60">
              <XCircle className="h-4 w-4" />
              <span className="text-[12px]">Từ chối</span>
            </div>
          )}
        </td>
      </motion.tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BankVerificationsPage() {
  const prefersReduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");

  const {
    data: allVerifications,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchVerifications(), []);

  const bankItems = useMemo<VerificationRequest[]>(() => {
    if (!allVerifications) return [];
    return allVerifications.filter((v) => {
      const k = v.kind ?? v.documents[0]?.type;
      return k === "payout-account";
    });
  }, [allVerifications]);

  // Batch-fetch coach display names + avatars once bank items are loaded.
  // CoachPayoutAccountResponse only has coachId; the real name requires a profile lookup.
  const [coachProfiles, setCoachProfiles] = useState<Map<string, { name: string; avatarUrl?: string }>>(new Map());

  useEffect(() => {
    if (!bankItems.length) return;
    const uniqueIds = [...new Set(bankItems.map((v) => v.coachId).filter(Boolean))];
    Promise.allSettled(
      uniqueIds.map((id) =>
        api.fetchUserProfile(id).then((profile) => ({ id, profile })),
      ),
    ).then((results) => {
      const m = new Map<string, { name: string; avatarUrl?: string }>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.profile) {
          m.set(r.value.id, {
            name: r.value.profile.name,
            avatarUrl: r.value.profile.avatarUrl,
          });
        }
      }
      if (m.size) setCoachProfiles(m);
    });
  }, [bankItems]);

  const [localStatuses, setLocalStatuses] = useState<Record<string, "approved" | "rejected">>({});

  const itemsWithLocal = useMemo<VerificationRequest[]>(() => {
    return bankItems.map((v) => {
      const override = localStatuses[v.id];
      return override ? { ...v, status: override } : v;
    });
  }, [bankItems, localStatuses]);

  const filtered = useMemo<VerificationRequest[]>(() => {
    let list = itemsWithLocal;
    if (filter !== "all") list = list.filter((v) => v.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.coachName.toLowerCase().includes(q) ||
          (v.title ?? "").toLowerCase().includes(q) ||
          (v.notes ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [itemsWithLocal, filter, search]);

  const counts = useMemo(() => {
    return {
      all: itemsWithLocal.length,
      pending: itemsWithLocal.filter((v) => v.status === "pending").length,
      approved: itemsWithLocal.filter((v) => v.status === "approved").length,
      rejected: itemsWithLocal.filter((v) => v.status === "rejected").length,
    };
  }, [itemsWithLocal]);

  const handleApproved = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "approved" }));
  };
  const handleRejected = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "rejected" }));
  };

  return (
    <AppShell role="admin" title="Duyệt tài khoản NH">
      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <Building2 className="h-4.5 w-4.5 text-white" />
                </div>
                <h1 className="text-[24px] font-bold tracking-tight text-on-surface">
                  Duyệt tài khoản ngân hàng
                </h1>
              </div>
              <p className="text-[13px] text-on-surface-variant ml-11.5">
                Xác minh tài khoản nhận tiền do huấn luyện viên gửi lên trước khi cho phép rút tiền.
              </p>
            </div>

            {/* Pending badge */}
            {counts.pending > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-[13px] font-semibold text-amber-700">
                  {counts.pending} chờ duyệt
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35, ease: EASE }}
        >
          {/* Filter tabs */}
          <div className="flex items-center rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-1 gap-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  filter === tab.id
                    ? "bg-surface-container-high text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    filter === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-container-high text-on-surface-variant",
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm HLV, ngân hàng…"
              className="h-9 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest pl-8.5 pr-3 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest overflow-hidden"
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
        >
          {loading ? (
            <LoadingState label="Đang tải danh sách tài khoản…" />
          ) : error ? (
            <ErrorState
              title="Không thể tải danh sách"
              message="Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại."
              onRetry={refetch}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-low">
                <Building2 className="h-6 w-6 text-on-surface-variant/50" />
              </div>
              <p className="text-[14px] font-medium text-on-surface">
                {search.trim()
                  ? "Không tìm thấy kết quả"
                  : filter === "pending"
                  ? "Không có tài khoản nào chờ duyệt"
                  : "Không có dữ liệu"}
              </p>
              <p className="mt-1 text-[12px] text-on-surface-variant">
                {search.trim()
                  ? "Thử tìm với từ khoá khác."
                  : "Danh sách sẽ hiển thị khi có yêu cầu mới."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-soft)] bg-surface-container-low/40">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Huấn luyện viên
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Tài khoản ngân hàng
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Ngày gửi
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <BankVerificationRow
                      key={item.id}
                      item={item}
                      index={i}
                      coachProfile={coachProfiles.get(item.coachId) ?? null}
                      onApproved={handleApproved}
                      onRejected={handleRejected}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-[12px] text-on-surface-variant">
            Hiển thị {filtered.length} / {itemsWithLocal.length} tài khoản
          </p>
        )}
      </div>
    </AppShell>
  );
}
