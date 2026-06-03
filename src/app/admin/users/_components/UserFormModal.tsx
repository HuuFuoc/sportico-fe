"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { zodResolver } from "@/lib/validation/auth";
import * as adminUserService from "@/lib/admin/adminUserService";
import { ApiResultError } from "@/lib/api-result";
import type { AdminUserItem } from "@/lib/types/admin-user";

const EASE = [0.16, 1, 0.3, 1] as const;

// ---- Schemas ----------------------------------------------------------------

const createSchema = z.object({
  fullName: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự.")
    .max(150, "Họ tên quá dài."),
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ.")
    .max(320),
  phoneNumber: z
    .string()
    .min(9, "Số điện thoại không hợp lệ.")
    .max(15, "Số điện thoại quá dài."),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự.")
    .max(100, "Mật khẩu quá dài."),
  role: z.enum(["learner", "coach", "admin"]),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(150).optional(),
  phoneNumber: z.string().min(9, "Số điện thoại không hợp lệ.").max(15).optional(),
  role: z.enum(["learner", "coach", "admin"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});
type EditValues = z.infer<typeof editSchema>;

// ---- Props ------------------------------------------------------------------

interface UserFormModalProps {
  open: boolean;
  user?: AdminUserItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// ---- Field component --------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[11.5px] text-[#ba1a1a] font-medium">{error}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/8 focus:bg-surface-container-lowest";

const selectCls =
  "w-full h-10 pl-3 pr-8 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-lowest text-[13px] text-on-surface outline-none appearance-none cursor-pointer transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/8";

// ---- Create form ------------------------------------------------------------

function CreateForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const reduce = useReducedMotion();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const onSubmit = async (values: CreateValues) => {
    setApiError(null);
    try {
      await adminUserService.createUser(values);
      onSuccess("Tạo người dùng thành công.");
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiResultError
          ? (err.details?.join(", ") ?? err.message)
          : "Tạo người dùng thất bại. Vui lòng thử lại.";
      setApiError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <div className="rounded-[8px] border border-[#ffbbb3] bg-[#ffdad6] px-3 py-2.5 text-[12.5px] font-medium text-[#ba1a1a]">
          {apiError}
        </div>
      )}

      <Field label="Họ và tên" error={errors.fullName?.message}>
        <input {...register("fullName")} placeholder="Nguyễn Văn A" className={inputCls} />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <input {...register("email")} type="email" placeholder="example@email.com" className={inputCls} />
      </Field>

      <Field label="Số điện thoại" error={errors.phoneNumber?.message}>
        <input {...register("phoneNumber")} placeholder="0901234567" className={inputCls} />
      </Field>

      <Field label="Mật khẩu" error={errors.password?.message}>
        <input {...register("password")} type="password" placeholder="Ít nhất 8 ký tự" className={inputCls} />
      </Field>

      <Field label="Vai trò" error={errors.role?.message}>
        <div className="relative">
          <select {...register("role")} className={selectCls} defaultValue="">
            <option value="" disabled>Chọn vai trò…</option>
            <option value="learner">Học viên</option>
            <option value="coach">Huấn luyện viên</option>
            <option value="admin">Quản trị</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">▾</span>
        </div>
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-soft)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "h-9 px-5 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.5)] transition-all disabled:opacity-60",
            reduce ? "" : "hover:scale-[1.02] active:scale-[0.98]",
          )}
        >
          {isSubmitting && <Loader2 size={13} className="animate-spin" />}
          Tạo người dùng
        </button>
      </div>
    </form>
  );
}

// ---- Edit form --------------------------------------------------------------

function EditForm({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const reduce = useReducedMotion();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role as EditValues["role"],
      status: user.status as EditValues["status"],
    },
  });

  const onSubmit = async (values: EditValues) => {
    setApiError(null);
    try {
      await adminUserService.updateUser(user.id, values);
      onSuccess("Cập nhật người dùng thành công.");
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiResultError
          ? (err.details?.join(", ") ?? err.message)
          : "Cập nhật thất bại. Vui lòng thử lại.";
      setApiError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <div className="rounded-[8px] border border-[#ffbbb3] bg-[#ffdad6] px-3 py-2.5 text-[12.5px] font-medium text-[#ba1a1a]">
          {apiError}
        </div>
      )}

      <Field label="Họ và tên" error={errors.fullName?.message}>
        <input {...register("fullName")} className={inputCls} />
      </Field>

      <Field label="Số điện thoại" error={errors.phoneNumber?.message}>
        <input {...register("phoneNumber")} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vai trò" error={errors.role?.message}>
          <div className="relative">
            <select {...register("role")} className={selectCls}>
              <option value="learner">Học viên</option>
              <option value="coach">Huấn luyện viên</option>
              <option value="admin">Quản trị</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">▾</span>
          </div>
        </Field>

        <Field label="Trạng thái" error={errors.status?.message}>
          <div className="relative">
            <select {...register("status")} className={selectCls}>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="pending">Đang chờ</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">▾</span>
          </div>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-soft)]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-9 px-4 rounded-[8px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "h-9 px-5 rounded-[8px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_6px_18px_-3px_rgba(53,37,205,0.5)] transition-all disabled:opacity-60",
            reduce ? "" : "hover:scale-[1.02] active:scale-[0.98]",
          )}
        >
          {isSubmitting && <Loader2 size={13} className="animate-spin" />}
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
}

// ---- Modal shell ------------------------------------------------------------

export function UserFormModal({ open, user, onClose, onSuccess }: UserFormModalProps) {
  const reduce = useReducedMotion();
  const isEdit = user != null;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
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
            className="w-full max-w-md rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_20px_60px_-10px_rgba(15,15,30,0.35),0_4px_16px_-6px_rgba(15,15,30,0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border-soft)]">
              <div>
                <h2 className="text-[17px] font-bold tracking-tight">
                  {isEdit ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
                </h2>
                {isEdit && (
                  <p className="text-[12px] text-on-surface-variant mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {isEdit ? (
                <EditForm user={user} onClose={onClose} onSuccess={onSuccess} />
              ) : (
                <CreateForm onClose={onClose} onSuccess={onSuccess} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
