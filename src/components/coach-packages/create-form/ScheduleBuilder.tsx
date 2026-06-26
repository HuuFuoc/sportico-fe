"use client";

// ============================================================================
// ScheduleBuilder — the heart of the create-package form. Two ways to build the
// fixed `SessionDraft[]`:
//   • "Tạo tự động" (RepeatScheduleForm): pick weekdays + time + range → expand.
//   • "Thêm thủ công" (ManualSessionForm): add one session at a time.
// Below, SessionPreviewTable lists every generated session with per-row edit /
// duplicate / delete, plus a live out-of-range warning.
// ============================================================================

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  Copy,
  Pencil,
  Plus,
  Repeat,
  ArrowDownUp,
  Trash2,
  Video,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateVN,
  formatDuration,
} from "@/lib/training-package-format";
import { Field, ModeToggle, TextInput, Textarea, WeekdayPicker } from "./ui";
import {
  type DefaultConfig,
  type RepeatConfig,
  type SessionDraft,
  blankSession,
  calculateDurationMinutes,
  combineLocalISO,
  generateWeeklySessions,
  newSessionId,
  sortSessionsByStartTime,
  validateRepeatConfig,
  weekdayShort,
} from "./schedule";

type Tab = "auto" | "manual";

export function ScheduleBuilder({
  sessions,
  setSessions,
  defaults,
  startDate,
  endDate,
}: {
  sessions: SessionDraft[];
  setSessions: (next: SessionDraft[]) => void;
  defaults: DefaultConfig;
  startDate: string;
  endDate: string;
}) {
  const [tab, setTab] = useState<Tab>("auto");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<SessionDraft[] | null>(null);

  const sorted = sortSessionsByStartTime(sessions);
  const outOfRange = sessions.filter(
    (s) => s.date && startDate && endDate && (s.date < startDate || s.date > endDate),
  ).length;

  const applyGenerated = (generated: SessionDraft[], mode: "replace" | "append") => {
    if (mode === "replace") setSessions(generated);
    else setSessions(sortSessionsByStartTime([...sessions, ...generated]));
    setPending(null);
  };

  const onGenerated = (generated: SessionDraft[]) => {
    if (sessions.length === 0) setSessions(generated);
    else setPending(generated); // ask before overwriting hand-edited rows
  };

  const updateSession = (id: string, patch: Partial<SessionDraft>) =>
    setSessions(sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSession = (id: string) =>
    setSessions(sessions.filter((s) => s.id !== id));
  const duplicateSession = (id: string) => {
    const src = sessions.find((s) => s.id === id);
    if (!src) return;
    setSessions(
      sortSessionsByStartTime([...sessions, { ...src, id: newSessionId() }]),
    );
  };

  return (
    <div className="space-y-3.5">
      {/* Tabs */}
      <div className="inline-flex w-full items-center gap-1 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-low p-1 sm:w-auto">
        <TabButton active={tab === "auto"} onClick={() => setTab("auto")} icon={<Repeat size={13} />}>
          Tạo tự động
        </TabButton>
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")} icon={<Plus size={13} />}>
          Thêm thủ công
        </TabButton>
      </div>

      {/* Builder body */}
      {tab === "auto" ? (
        <RepeatScheduleForm
          defaults={defaults}
          startDate={startDate}
          endDate={endDate}
          onGenerated={onGenerated}
        />
      ) : (
        <ManualSessionForm defaults={defaults} onAdd={(s) => setSessions(sortSessionsByStartTime([...sessions, s]))} />
      )}

      {/* Replace / append confirm */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <p className="text-[12px] text-amber-800">
              Bạn đang có <b>{sessions.length}</b> buổi. Lịch mới tạo{" "}
              <b>{pending.length}</b> buổi — bạn muốn?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyGenerated(pending, "append")}
                className="h-8 rounded-[7px] border border-[var(--color-border-soft)] bg-white px-3 text-[12px] font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Thêm vào
              </button>
              <button
                type="button"
                onClick={() => applyGenerated(pending, "replace")}
                className="h-8 rounded-[7px] bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700"
              >
                Thay thế
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                aria-label="Huỷ"
                className="flex h-8 w-8 items-center justify-center rounded-[7px] text-amber-700 hover:bg-amber-100"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview header + toolbar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
          <CalendarPlus size={14} className="text-primary" />
          Lịch học ({sessions.length} buổi)
        </p>
        {sessions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSessions(sortSessionsByStartTime(sessions))}
              className="inline-flex h-8 items-center gap-1 rounded-[7px] border border-[var(--color-border-soft)] px-2.5 text-[11.5px] font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            >
              <ArrowDownUp size={12} />
              Sắp xếp
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Xoá toàn bộ lịch học đã tạo?")) setSessions([]);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-[7px] border border-[var(--color-border-soft)] px-2.5 text-[11.5px] font-medium text-on-surface-variant hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={12} />
              Xoá hết
            </button>
          </div>
        )}
      </div>

      {/* Out-of-range warning */}
      {outOfRange > 0 && (
        <div className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Có <b>{outOfRange}</b> buổi nằm ngoài khoảng ngày của gói. Hãy chỉnh lại
            ngày học hoặc khoảng thời gian gói.
          </span>
        </div>
      )}

      {/* Preview list */}
      <SessionPreviewTable
        sessions={sorted}
        startDate={startDate}
        endDate={endDate}
        editingId={editingId}
        onEdit={setEditingId}
        onChange={updateSession}
        onRemove={removeSession}
        onDuplicate={duplicateSession}
      />
    </div>
  );
}

// ── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 text-[12.5px] font-semibold transition-colors sm:flex-none",
        active
          ? "bg-surface-container-lowest text-primary shadow-[0_1px_2px_rgba(15,15,30,0.06)]"
          : "text-on-surface-variant hover:text-on-surface",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Repeat (auto) form ───────────────────────────────────────────────────────

function RepeatScheduleForm({
  defaults,
  startDate,
  endDate,
  onGenerated,
}: {
  defaults: DefaultConfig;
  startDate: string;
  endDate: string;
  onGenerated: (sessions: SessionDraft[]) => void;
}) {
  const [cfg, setCfg] = useState<RepeatConfig>({
    weekdays: [],
    startTime: "",
    endTime: "",
    fromDate: startDate,
    toDate: endDate,
    isOnline: defaults.isOnline,
    location: defaults.location,
    meetingUrl: defaults.meetingUrl,
    maxParticipants: defaults.maxParticipants,
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<RepeatConfig>) => setCfg((c) => ({ ...c, ...p }));

  const toggleDay = (js: number) =>
    setCfg((c) => ({
      ...c,
      weekdays: c.weekdays.includes(js)
        ? c.weekdays.filter((d) => d !== js)
        : [...c.weekdays, js],
    }));

  // Auto-fill end from start + default duration when end is empty.
  const onStartTime = (v: string) => {
    if (v && !cfg.endTime && defaults.durationMinutes > 0) {
      const [h, m] = v.split(":").map(Number);
      const end = new Date(2000, 0, 1, h, m + defaults.durationMinutes);
      patch({
        startTime: v,
        endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      });
    } else patch({ startTime: v });
  };

  const generate = () => {
    const eff: RepeatConfig = {
      ...cfg,
      fromDate: cfg.fromDate || startDate,
      toDate: cfg.toDate || endDate,
    };
    const v = validateRepeatConfig(eff);
    if (v) {
      setError(v);
      return;
    }
    const generated = generateWeeklySessions(eff);
    if (generated.length === 0) {
      setError("Lịch lặp không tạo ra buổi học nào trong khoảng thời gian đã chọn.");
      return;
    }
    setError(null);
    onGenerated(generated);
  };

  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/30 p-3.5 space-y-3">
      <Field label="Chọn ngày học trong tuần" required>
        <WeekdayPicker selected={cfg.weekdays} onToggle={toggleDay} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Giờ bắt đầu" required>
          <TextInput type="time" value={cfg.startTime} onChange={(e) => onStartTime(e.target.value)} />
        </Field>
        <Field label="Giờ kết thúc" required>
          <TextInput
            type="time"
            value={cfg.endTime}
            onChange={(e) => patch({ endTime: e.target.value })}
          />
        </Field>
        <Field label="Áp dụng từ ngày" hint="dd/MM/yyyy">
          <TextInput
            type="date"
            value={cfg.fromDate}
            min={startDate || undefined}
            max={endDate || undefined}
            onChange={(e) => patch({ fromDate: e.target.value })}
          />
        </Field>
        <Field label="Đến ngày" hint="dd/MM/yyyy">
          <TextInput
            type="date"
            value={cfg.toDate}
            min={cfg.fromDate || startDate || undefined}
            max={endDate || undefined}
            onChange={(e) => patch({ toDate: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hình thức">
          <ModeToggle isOnline={cfg.isOnline} onChange={(o) => patch({ isOnline: o })} />
        </Field>
        <Field label="Số học viên tối đa" required>
          <TextInput
            type="number"
            min={1}
            value={cfg.maxParticipants}
            onChange={(e) => patch({ maxParticipants: e.target.value })}
          />
        </Field>
        {cfg.isOnline ? (
          <Field label="Link học mặc định" className="col-span-2">
            <TextInput
              type="url"
              value={cfg.meetingUrl}
              onChange={(e) => patch({ meetingUrl: e.target.value })}
              placeholder="https://meet.google.com/…"
            />
          </Field>
        ) : (
          <Field label="Địa điểm / sân" required className="col-span-2">
            <TextInput
              value={cfg.location}
              onChange={(e) => patch({ location: e.target.value.slice(0, 255) })}
              placeholder="VD: Sân cầu lông Sky"
            />
          </Field>
        )}
        <Field label="Ghi chú chung" className="col-span-2">
          <TextInput
            value={cfg.note}
            onChange={(e) => patch({ note: e.target.value.slice(0, 500) })}
            placeholder="VD: Mang theo vợt và nước"
          />
        </Field>
      </div>

      {error && (
        <p className="text-[12px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#2d20b8]"
      >
        <Repeat size={14} />
        Tạo lịch
      </button>
    </div>
  );
}

// ── Manual form ──────────────────────────────────────────────────────────────

function ManualSessionForm({
  defaults,
  onAdd,
}: {
  defaults: DefaultConfig;
  onAdd: (s: SessionDraft) => void;
}) {
  const [draft, setDraft] = useState<SessionDraft>(blankSession(defaults));
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<SessionDraft>) => setDraft((d) => ({ ...d, ...p }));

  const onStartTime = (v: string) => {
    if (v && !draft.endTime && defaults.durationMinutes > 0) {
      const [h, m] = v.split(":").map(Number);
      const end = new Date(2000, 0, 1, h, m + defaults.durationMinutes);
      patch({
        startTime: v,
        endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      });
    } else patch({ startTime: v });
  };

  const add = () => {
    if (!draft.date) return setError("Vui lòng chọn ngày học.");
    if (!draft.startTime || !draft.endTime)
      return setError("Vui lòng nhập giờ bắt đầu và kết thúc.");
    if (calculateDurationMinutes(draft.startTime, draft.endTime) == null)
      return setError("Giờ kết thúc phải sau giờ bắt đầu.");
    if (!Number(draft.maxParticipants) || Number(draft.maxParticipants) < 1)
      return setError("Số học viên tối đa phải lớn hơn 0.");
    if (!draft.isOnline && !draft.location.trim())
      return setError("Buổi trực tiếp cần có địa điểm hoặc sân tập.");
    setError(null);
    onAdd({ ...draft, id: newSessionId() });
    // Keep mode/location/capacity for fast repeated entry; clear date/time.
    setDraft({ ...blankSession(defaults), isOnline: draft.isOnline, location: draft.location, maxParticipants: draft.maxParticipants });
  };

  return (
    <div className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/30 p-3.5 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Ngày học" required hint="dd/MM/yyyy" className="col-span-2 sm:col-span-1">
          <TextInput type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label="Giờ bắt đầu" required>
          <TextInput type="time" value={draft.startTime} onChange={(e) => onStartTime(e.target.value)} />
        </Field>
        <Field label="Giờ kết thúc" required>
          <TextInput
            type="time"
            value={draft.endTime}
            onChange={(e) => patch({ endTime: e.target.value })}
          />
        </Field>
        <Field label="Hình thức">
          <ModeToggle isOnline={draft.isOnline} onChange={(o) => patch({ isOnline: o })} />
        </Field>
        <Field label="Số học viên tối đa" required>
          <TextInput
            type="number"
            min={1}
            value={draft.maxParticipants}
            onChange={(e) => patch({ maxParticipants: e.target.value })}
          />
        </Field>
        {draft.isOnline ? (
          <Field label="Link học" className="col-span-2 sm:col-span-3">
            <TextInput
              type="url"
              value={draft.meetingUrl}
              onChange={(e) => patch({ meetingUrl: e.target.value })}
              placeholder="https://meet.google.com/…"
            />
          </Field>
        ) : (
          <Field label="Địa điểm / sân" required className="col-span-2 sm:col-span-3">
            <TextInput
              value={draft.location}
              onChange={(e) => patch({ location: e.target.value.slice(0, 255) })}
              placeholder="VD: Sân cầu lông Sky"
            />
          </Field>
        )}
        <Field label="Ghi chú" className="col-span-2 sm:col-span-3">
          <TextInput
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value.slice(0, 500) })}
            placeholder="VD: Buổi đánh giá kỹ thuật ban đầu"
          />
        </Field>
      </div>

      {error && (
        <p className="text-[12px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#2d20b8]"
      >
        <Plus size={14} />
        Thêm buổi
      </button>
    </div>
  );
}

// ── Preview table ────────────────────────────────────────────────────────────

function SessionPreviewTable({
  sessions,
  startDate,
  endDate,
  editingId,
  onEdit,
  onChange,
  onRemove,
  onDuplicate,
}: {
  sessions: SessionDraft[];
  startDate: string;
  endDate: string;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onChange: (id: string, patch: Partial<SessionDraft>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-[var(--color-border-soft)] py-8 text-center">
        <p className="text-[12.5px] text-on-surface-variant">
          Chưa có buổi học nào. Dùng “Tạo tự động” hoặc “Thêm thủ công” ở trên.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sessions.map((s, i) =>
        editingId === s.id ? (
          <li key={s.id}>
            <SessionRowEditor
              n={i + 1}
              session={s}
              onChange={(patch) => onChange(s.id, patch)}
              onDone={() => onEdit(null)}
            />
          </li>
        ) : (
          <li key={s.id}>
            <SessionRow
              n={i + 1}
              session={s}
              outOfRange={Boolean(
                s.date && startDate && endDate && (s.date < startDate || s.date > endDate),
              )}
              onEdit={() => onEdit(s.id)}
              onDuplicate={() => onDuplicate(s.id)}
              onRemove={() => onRemove(s.id)}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function SessionRow({
  n,
  session: s,
  outOfRange,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  n: number;
  session: SessionDraft;
  outOfRange: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const duration = formatDuration(calculateDurationMinutes(s.startTime, s.endTime));
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[10px] border bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between",
        outOfRange ? "border-amber-300" : "border-[var(--color-border-soft)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold tabular-nums text-primary">
          {n}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-on-surface">
            {weekdayShort(s.date)}, {formatDateVN(combineDate(s.date))}
            <span className="ml-2 font-normal tabular-nums text-on-surface-variant">
              {s.startTime}-{s.endTime}
              {duration !== "Chưa cập nhật" && ` · ${duration}`}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              {s.isOnline ? <Video size={11} /> : <MapPin size={11} />}
              {s.isOnline ? "Trực tuyến" : s.location.trim() || "Chưa có địa điểm"}
            </span>
            <span>· Tối đa {s.maxParticipants || "?"} HV</span>
            {s.note.trim() && <span className="truncate">· {s.note}</span>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        <RowAction icon={<Pencil size={13} />} label="Sửa" onClick={onEdit} />
        <RowAction icon={<Copy size={13} />} label="Nhân đôi" onClick={onDuplicate} />
        <RowAction
          icon={<Trash2 size={13} />}
          label="Xoá"
          onClick={onRemove}
          danger
        />
      </div>
    </div>
  );
}

function RowAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[7px] text-on-surface-variant transition-colors",
        danger ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-surface-container-low hover:text-primary",
      )}
    >
      {icon}
    </button>
  );
}

function SessionRowEditor({
  n,
  session: s,
  onChange,
  onDone,
}: {
  n: number;
  session: SessionDraft;
  onChange: (patch: Partial<SessionDraft>) => void;
  onDone: () => void;
}) {
  return (
    <div className="rounded-[10px] border border-primary/40 bg-primary/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-on-surface">
          Sửa buổi {n}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-primary px-2.5 text-[11.5px] font-semibold text-white hover:bg-[#2d20b8]"
        >
          <Check size={12} />
          Xong
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Field label="Ngày học" required className="col-span-2 sm:col-span-1">
          <TextInput type="date" value={s.date} onChange={(e) => onChange({ date: e.target.value })} />
        </Field>
        <Field label="Bắt đầu" required>
          <TextInput type="time" value={s.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </Field>
        <Field label="Kết thúc" required>
          <TextInput type="time" value={s.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </Field>
        <Field label="Hình thức">
          <ModeToggle isOnline={s.isOnline} onChange={(o) => onChange({ isOnline: o })} />
        </Field>
        <Field label="Tối đa HV" required>
          <TextInput
            type="number"
            min={1}
            value={s.maxParticipants}
            onChange={(e) => onChange({ maxParticipants: e.target.value })}
          />
        </Field>
        {s.isOnline ? (
          <Field label="Link học">
            <TextInput type="url" value={s.meetingUrl} onChange={(e) => onChange({ meetingUrl: e.target.value })} />
          </Field>
        ) : (
          <Field label="Địa điểm / sân" required>
            <TextInput value={s.location} onChange={(e) => onChange({ location: e.target.value.slice(0, 255) })} />
          </Field>
        )}
        <Field label="Ghi chú" className="col-span-2 sm:col-span-3">
          <Textarea rows={1} value={s.note} onChange={(e) => onChange({ note: e.target.value.slice(0, 500) })} />
        </Field>
      </div>
    </div>
  );
}

/** Local YYYY-MM-DD → ISO at local midnight (for formatDateVN). */
function combineDate(date: string): string {
  return date ? combineLocalISO(date, "00:00") : "";
}
