"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  CheckCircle2,
  Clock,
  Globe,
  Info,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { getSports } from "@/lib/sports-api";
import {
  getMyTrainingPackages,
  createTrainingPackage,
  updateTrainingPackage,
  archiveTrainingPackage,
  trainingPackageStatusLabel,
  trainingPackageStatusBadge,
} from "@/lib/training-package-api";
import { messageForApiError } from "@/lib/errors-vi";
import { showSuccess, showApiError } from "@/lib/toast";
import { cn, formatCurrencyVnd } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type {
  TrainingPackageResponse,
  TrainingPackageRequest,
  SportOption,
} from "@/lib/types/coach";

type StatusTab = "all" | "pending" | "published" | "rejected" | "archived";

const TABS: { id: StatusTab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ duyệt" },
  { id: "published", label: "Đã xuất bản" },
  { id: "rejected", label: "Bị từ chối" },
  { id: "archived", label: "Đã lưu trữ" },
];

function canEdit(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "pending" || s === "rejected" || s === "archived";
}

export default function CoachTrainingPackagesPage() {
  const { data: page, loading, error, refetch } = useApiResource(
    () => getMyTrainingPackages({ pageSize: 100 }),
    [],
  );
  const { data: sports } = useApiResource(() => getSports(), []);

  const [tab, setTab] = useState<StatusTab>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TrainingPackageResponse | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<TrainingPackageResponse | null>(null);
  const [archiving, setArchiving] = useState(false);

  const items = useMemo(() => page?.items ?? [], [page]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of items) {
      const s = (p.status ?? "").toLowerCase();
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(
    () =>
      tab === "all"
        ? items
        : items.filter((p) => (p.status ?? "").toLowerCase() === tab),
    [items, tab],
  );

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveTrainingPackage(archiveTarget.id);
      setArchiveTarget(null);
      showSuccess("Đã lưu trữ gói tập.");
      refetch();
    } catch (e) {
      showApiError(e);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AppShell
      role="coach"
      title="Gói tập"
      searchPlaceholder="Tìm gói tập theo tên, mô tả hoặc môn thể thao..."
    >
      <div className="max-w-[1040px] mx-auto pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(53,37,205,0.25)]">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-on-surface">
                Gói tập của tôi
              </h1>
              <p className="text-[12.5px] text-on-surface-variant mt-0.5">
                Quản lý các gói tập, trạng thái duyệt và khả năng hiển thị công
                khai.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors shrink-0 shadow-[0_2px_8px_rgba(53,37,205,0.2)]"
          >
            <Plus size={16} />
            Tạo gói tập
          </button>
        </div>

        {/* Summary stat cards */}
        {!loading && !error && (
          <SummaryRow items={items} />
        )}

        {/* Status flow info */}
        <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-primary/15 bg-primary/[0.04] px-3.5 py-2.5 text-[12px] text-on-surface-variant">
          <Info size={14} className="text-primary mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold text-on-surface">Chờ duyệt</span> →
            quản trị viên duyệt →{" "}
            <span className="font-semibold text-on-surface">Đã xuất bản</span>.
            Gói bị từ chối có thể chỉnh sửa và gửi lại. Bạn có thể lưu trữ gói bất
            kỳ lúc nào.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-surface-container-low rounded-[10px] mb-4 border border-[var(--color-border-soft)]">
          {TABS.map((t) => {
            const count = t.id === "all" ? items.length : counts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3.5 h-8 rounded-[7px] text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5",
                  active
                    ? "text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tp-tab-pill"
                    className="absolute inset-0 rounded-[7px] bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,15,30,0.08),0_0_0_1px_rgba(15,15,30,0.05)]"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <span className="relative">{t.label}</span>
                <span
                  className={cn(
                    "relative text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "bg-surface-container-high text-on-surface-variant",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        {loading ? (
          <LoadingState label="Đang tải gói tập…" />
        ) : error ? (
          <ErrorState
            message={messageForApiError(error)}
            onRetry={refetch}
            className="mx-auto mt-10 max-w-md"
          />
        ) : items.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container-low flex items-center justify-center">
              <Package size={20} className="text-on-surface-variant" />
            </div>
            <p className="text-body-sm text-on-surface-variant mb-4 max-w-sm mx-auto">
              Bạn chưa có gói tập nào. Hãy tạo gói tập đầu tiên để gửi quản trị
              viên duyệt.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] border border-primary/30 bg-primary/[0.06] text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
            >
              <Plus size={15} />
              Tạo gói tập
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--color-border-soft)] bg-surface-container-lowest py-12 text-center">
            <p className="text-body-sm text-on-surface-variant">
              Không có gói tập nào ở trạng thái này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p, i) => (
              <PackageCard
                key={p.id}
                pkg={p}
                index={i}
                onEdit={() => setEditing(p)}
                onArchive={() => setArchiveTarget(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <AnimatePresence>
        {(creating || editing) && (
          <PackageFormModal
            initial={editing}
            sports={sports ?? []}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={(msg) => {
              setCreating(false);
              setEditing(null);
              showSuccess(msg);
              refetch();
            }}
          />
        )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <Modal onClose={() => !archiving && setArchiveTarget(null)}>
            <h3 className="text-[16px] font-semibold">Lưu trữ gói tập</h3>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Bạn có chắc muốn lưu trữ &ldquo;{archiveTarget.title}&rdquo; không? Gói đã lưu
              trữ sẽ không hiển thị công khai.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void confirmArchive()}
                disabled={archiving}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[9px] bg-primary text-white text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
              >
                {archiving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Đang lưu trữ…
                  </>
                ) : (
                  <>
                    <Archive size={15} />
                    Lưu trữ gói tập
                  </>
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ---- Summary stat row -------------------------------------------------------

interface StatTile {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  valueColor: string;
}

function SummaryRow({ items }: { items: TrainingPackageResponse[] }) {
  const published = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "published",
  ).length;
  const pending = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "pending",
  ).length;
  const rejected = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "rejected",
  ).length;
  const archived = items.filter(
    (p) => (p.status ?? "").toLowerCase() === "archived",
  ).length;

  const tiles: StatTile[] = [
    {
      label: "Tổng gói",
      value: items.length,
      icon: <Package size={15} />,
      gradient: "from-primary to-[#7d6dff]",
      valueColor: "text-primary",
    },
    {
      label: "Đã xuất bản",
      value: published,
      icon: <CheckCircle2 size={15} />,
      gradient: "from-[#10b981] to-[#34d399]",
      valueColor: "text-[#0d9268]",
    },
    {
      label: "Chờ duyệt",
      value: pending,
      icon: <Clock size={15} />,
      gradient: "from-[#f59e0b] to-[#fb923c]",
      valueColor: "text-[#b95000]",
    },
    {
      label: "Bị từ chối",
      value: rejected,
      icon: <XCircle size={15} />,
      gradient: "from-[#f43f5e] to-[#fb7185]",
      valueColor: "text-[#ba1a1a]",
    },
    {
      label: "Đã lưu trữ",
      value: archived,
      icon: <Archive size={15} />,
      gradient: "from-slate-400 to-slate-500",
      valueColor: "text-on-surface-variant",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-3.5"
        >
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tile.gradient} flex items-center justify-center text-white mb-2.5`}
          >
            {tile.icon}
          </div>
          <p className="text-[11px] text-on-surface-variant mb-0.5 leading-none">
            {tile.label}
          </p>
          <p
            className={`text-[22px] font-bold tabular-nums leading-none ${tile.valueColor}`}
          >
            {tile.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Package card ----------------------------------------------------------

function PackageCard({
  pkg,
  index,
  onEdit,
  onArchive,
}: {
  pkg: TrainingPackageResponse;
  index: number;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const editable = canEdit(pkg.status);
  const archived = (pkg.status ?? "").toLowerCase() === "archived";
  const tags = [pkg.goalType, pkg.level, pkg.location].filter(Boolean) as string[];
  const visibleTags = tags.slice(0, 3);
  const extraTagCount = tags.length - visibleTags.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 flex flex-col hover:-translate-y-0.5 transition-transform shadow-[0_1px_2px_rgba(15,15,30,0.03),0_4px_16px_-8px_rgba(15,15,30,0.04)]"
    >
      {/* Card header: title + status badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-[15px] font-semibold leading-snug text-on-surface">
          {pkg.title}
        </h3>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border whitespace-nowrap",
            trainingPackageStatusBadge(pkg.status),
          )}
        >
          {trainingPackageStatusLabel(pkg.status)}
        </span>
      </div>

      {/* Description */}
      {pkg.description && (
        <p className="text-[12.5px] text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
          {pkg.description}
        </p>
      )}

      {/* Metadata row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Số buổi
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface">
            <Layers size={12} className="text-on-surface-variant" />
            {pkg.sessionCount}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Thời hạn
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface">
            <Clock size={12} className="text-on-surface-variant" />
            {pkg.durationDays} ngày
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wide font-medium">
            Môn
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-on-surface truncate">
            {pkg.isOnline ? (
              <Globe size={12} className="text-on-surface-variant shrink-0" />
            ) : (
              <MapPin size={12} className="text-on-surface-variant shrink-0" />
            )}
            <span className="truncate">
              {pkg.sportName || (pkg.isOnline ? "Online" : "Trực tiếp")}
            </span>
          </span>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleTags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="px-2 py-0.5 rounded-full bg-surface-container-low border border-[var(--color-border-soft)] text-[11px] text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-[var(--color-border-soft)] text-[11px] text-on-surface-variant">
              +{extraTagCount}
            </span>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {(pkg.status ?? "").toLowerCase() === "rejected" && pkg.rejectionReason && (
        <div className="mb-3 rounded-[8px] border border-[#ffbbb3] bg-[#ffdad6]/50 px-3 py-2 text-[11.5px] text-[#ba1a1a]">
          <span className="font-semibold">Lý do từ chối: </span>
          {pkg.rejectionReason}
        </div>
      )}

      {/* Footer: price + actions */}
      <div className="mt-auto pt-3 border-t border-[var(--color-border-soft)] flex items-end justify-between gap-2">
        <div>
          <p className="text-[10.5px] text-on-surface-variant mb-0.5 font-medium uppercase tracking-wide">
            Giá gói
          </p>
          <p className="text-[19px] font-bold tabular-nums text-primary leading-none">
            {formatCurrencyVnd(pkg.price)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            disabled={!editable}
            title={
              editable
                ? "Chỉnh sửa gói tập"
                : "Gói đã xuất bản không thể chỉnh sửa"
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-medium border border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low hover:text-primary hover:border-primary/20 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant disabled:hover:border-[var(--color-border-soft)]"
          >
            <Pencil size={13} />
            Sửa
          </button>
          {!archived && (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12px] font-medium border border-[var(--color-border-soft)] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
            >
              <Archive size={13} />
              Lưu trữ
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---- Create / edit modal ---------------------------------------------------

function PackageFormModal({
  initial,
  sports,
  onClose,
  onSaved,
}: {
  initial: TrainingPackageResponse | null;
  sports: SportOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(initial);
  const [sportId, setSportId] = useState<string>(
    initial ? String(initial.sportId) : sports[0] ? String(sports[0].id) : "",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [sessionCount, setSessionCount] = useState(
    initial ? String(initial.sessionCount) : "",
  );
  const [durationDays, setDurationDays] = useState(
    initial ? String(initial.durationDays) : "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [isOnline, setIsOnline] = useState(initial?.isOnline ?? false);
  const [level, setLevel] = useState(initial?.level ?? "");
  const [goalType, setGoalType] = useState(initial?.goalType ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const validate = (): string | null => {
    const sid = Number(sportId);
    if (!sid || sid <= 0) return "Vui lòng chọn môn thể thao.";
    if (!title.trim()) return "Vui lòng nhập tên gói tập.";
    if (title.length > 200) return "Tên gói tập tối đa 200 ký tự.";
    if (description.length > 3000) return "Mô tả tối đa 3000 ký tự.";
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return "Giá phải lớn hơn 0.";
    if (!Number.isInteger(p)) return "Giá phải là số nguyên (không có phần thập phân).";
    const sc = Number(sessionCount);
    if (!Number.isInteger(sc) || sc <= 0) return "Số buổi tập phải lớn hơn 0.";
    const dd = Number(durationDays);
    if (!Number.isInteger(dd) || dd <= 0) return "Thời hạn gói phải lớn hơn 0.";
    if (location.length > 255) return "Địa điểm tối đa 255 ký tự.";
    if (level.length > 50) return "Trình độ tối đa 50 ký tự.";
    if (goalType.length > 50) return "Mục tiêu tối đa 50 ký tự.";
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSaving(true);
    setErr(null);
    const payload: TrainingPackageRequest = {
      sportId: Number(sportId),
      title: title.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      sessionCount: Number(sessionCount),
      durationDays: Number(durationDays),
      location: location.trim() || undefined,
      isOnline,
      level: level.trim() || undefined,
      goalType: goalType.trim() || undefined,
    };
    try {
      if (isEdit && initial) {
        await updateTrainingPackage(initial.id, payload);
        onSaved("Đã cập nhật gói tập.");
      } else {
        await createTrainingPackage(payload);
        onSaved("Gói tập đã được tạo và đang chờ quản trị viên duyệt.");
      }
    } catch (e) {
      setErr(messageForApiError(e));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={() => !saving && onClose()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold">
          {isEdit ? "Cập nhật gói tập" : "Tạo gói tập"}
        </h3>
        <button
          onClick={() => !saving && onClose()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <Label label="Môn thể thao" required>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            className="w-full h-11 pl-3.5 pr-9 appearance-none bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] cursor-pointer"
          >
            <option value="" disabled>
              Chọn môn thể thao…
            </option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Label>

        <Label label="Tên gói tập" required>
          <Inp
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            placeholder="VD: Gói cầu lông cơ bản 10 buổi"
          />
        </Label>

        <Label label="Mô tả">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
            rows={3}
            placeholder="Nội dung, lộ trình, đối tượng phù hợp…"
            className="w-full px-3.5 py-2.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px] resize-none leading-relaxed"
          />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label label="Giá (VND)" required hint="Số nguyên.">
            <Inp
              type="number"
              min={1}
              className="tabular-nums"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="VD: 1500000"
            />
          </Label>
          <Label label="Số buổi tập" required>
            <Inp
              type="number"
              min={1}
              className="tabular-nums"
              value={sessionCount}
              onChange={(e) => setSessionCount(e.target.value)}
              placeholder="VD: 10"
            />
          </Label>
          <Label label="Thời hạn gói (ngày)" required>
            <Inp
              type="number"
              min={1}
              className="tabular-nums"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="VD: 30"
            />
          </Label>
          <Label label="Trình độ" hint="Tùy chọn.">
            <Inp
              value={level}
              onChange={(e) => setLevel(e.target.value.slice(0, 50))}
              placeholder="VD: Cơ bản"
            />
          </Label>
        </div>

        <Label label="Mục tiêu" hint="Tùy chọn.">
          <Inp
            value={goalType}
            onChange={(e) => setGoalType(e.target.value.slice(0, 50))}
            placeholder="VD: Giảm cân, thi đấu…"
          />
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Label label="Địa điểm" hint="Tùy chọn.">
            <Inp
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, 255))}
              placeholder="VD: Sân cầu lông ABC"
            />
          </Label>
          <div className="pt-[26px]">
            <button
              type="button"
              onClick={() => setIsOnline((v) => !v)}
              className="w-full flex items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border-soft)] bg-surface-container-low/50 px-3.5 h-11 text-left"
            >
              <span className="text-[13px] font-medium">Dạy online</span>
              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  isOnline ? "bg-primary" : "bg-surface-container-high",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    isOnline ? "translate-x-[22px]" : "translate-x-0.5",
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {err && (
          <p className="text-[12.5px] text-rose-600" role="alert">
            {err}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => !saving && onClose()}
          disabled={saving}
          className="h-10 px-4 rounded-[9px] border border-[var(--color-border-soft)] text-[13px] font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          onClick={() => void submit()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[9px] bg-primary text-white text-[13px] font-semibold hover:bg-[#2d20b8] transition-colors disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Đang lưu…
            </>
          ) : isEdit ? (
            "Cập nhật gói tập"
          ) : (
            "Tạo gói tập"
          )}
        </button>
      </div>
    </Modal>
  );
}

// ---- shared primitives -----------------------------------------------------

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 shadow-[0_20px_60px_-12px_rgba(15,15,30,0.3)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Label({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-semibold text-on-surface">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-[11px] text-on-surface-variant">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-11 px-3.5 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[8px] outline-none focus:border-primary text-[14px]",
        props.className,
      )}
    />
  );
}
