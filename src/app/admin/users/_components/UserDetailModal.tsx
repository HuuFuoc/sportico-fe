"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Calendar, Mail, Phone, Shield, User, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { AdminUserItem } from "@/lib/types/admin-user";

const EASE = [0.16, 1, 0.3, 1] as const;

// ---- Status / role badges ---------------------------------------------------

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

const ROLE_META: Record<string, { label: string; pill: string }> = {
  admin: {
    label: "Quản trị",
    pill: "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]",
  },
  coach: {
    label: "Huấn luyện viên",
    pill: "bg-primary/8 text-primary border-primary/20",
  },
  learner: {
    label: "Học viên",
    pill: "bg-[#8b5cf6]/8 text-[#7c3aed] border-[#8b5cf6]/20",
  },
};

// ---- Row ---------------------------------------------------------------

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-soft)] last:border-b-0">
      <div className="w-8 h-8 rounded-[8px] bg-surface-container-low flex items-center justify-center shrink-0">
        <Icon size={14} className="text-on-surface-variant" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-on-surface-variant mb-0.5">
          {label}
        </p>
        <p className="text-[13.5px] text-on-surface truncate">{value}</p>
      </div>
    </div>
  );
}

// ---- Modal ------------------------------------------------------------------

interface UserDetailModalProps {
  open: boolean;
  user: AdminUserItem | null;
  onClose: () => void;
  onEdit: (user: AdminUserItem) => void;
}

export function UserDetailModal({ open, user, onClose, onEdit }: UserDetailModalProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const statusMeta =
    user ? (STATUS_META[user.status?.toLowerCase()] ?? STATUS_META.inactive) : null;
  const primaryRole =
    user
      ? ((user.role?.trim()) ||
         (Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : "") ||
         "").toLowerCase()
      : "";
  const roleMeta = user ? (ROLE_META[primaryRole] ?? ROLE_META.learner) : null;

  return (
    <AnimatePresence>
      {open && user && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            className="w-full max-w-sm rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_20px_60px_-10px_rgba(15,15,30,0.35),0_4px_16px_-6px_rgba(15,15,30,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border-soft)]">
              <h2 className="text-[17px] font-bold tracking-tight">
                Chi tiết người dùng
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Avatar + name block */}
            <div className="px-6 pt-5 pb-4 flex items-center gap-4 border-b border-[var(--color-border-soft)]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-on-primary text-[18px] font-bold shrink-0">
                {initials(user.fullName ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold truncate">{user.fullName}</p>
                <p className="text-[12px] text-on-surface-variant truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {roleMeta && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                        roleMeta.pill,
                      )}
                    >
                      {roleMeta.label}
                    </span>
                  )}
                  {statusMeta && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                        statusMeta.pill,
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          statusMeta.dot,
                        )}
                      />
                      {statusMeta.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div className="px-6 py-1">
              <DetailRow icon={Mail} label="Email" value={user.email} />
              <DetailRow
                icon={Phone}
                label="Số điện thoại"
                value={user.phoneNumber || "—"}
              />
              <DetailRow
                icon={Shield}
                label="ID người dùng"
                value={
                  <span className="font-mono text-[12px] text-on-surface-variant">
                    {user.id}
                  </span>
                }
              />
              <DetailRow
                icon={Calendar}
                label="Ngày tạo"
                value={new Date(user.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border-soft)] flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(user);
                }}
                className="h-9 px-4 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.5)] transition-all"
              >
                Chỉnh sửa
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
