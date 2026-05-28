"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Award,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crop,
  DollarSign,
  Eye,
  ExternalLink,
  ImagePlus,
  Lightbulb,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  Save,
  Scissors,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { AVAILABLE_SPORTS } from "@/lib/constants";
import { devUserIdForRole } from "@/lib/auth";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Sport } from "@/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const AI_TOOLS = [
  { id: "generate", label: "Generate", icon: Wand2 },
  { id: "improve", label: "Improve", icon: Sparkles },
  { id: "shorten", label: "Shorten", icon: Scissors },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "tone", label: "Rewrite Tone", icon: PencilLine },
] as const;

const SUGGESTED_SPECIALTIES = [
  "Threshold Work",
  "Match Strategy",
  "Recovery Planning",
  "Mobility Flow",
  "Tactical Drills",
  "Power Endurance",
];

const COACHING_TONES = ["Friendly", "Professional", "Motivating", "Concise"];

export default function EditCoachProfilePage() {
  // TODO(auth): hard-coded current coach until real session auth lands.
  const coachId = devUserIdForRole("coach");
  const {
    data: coach,
    loading,
    error,
    refetch,
  } = useApiResource(() => api.fetchCoach(coachId), [coachId]);
  const reduce = useReducedMotion();

  // Form state — seeded from the coach profile once it loads (see effect below).
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState(0);
  const [sport, setSport] = useState<Sport>("Tennis");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [tone, setTone] = useState(COACHING_TONES[1]);

  // UI state
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false); // mobile toggle

  // Seed the form once the coach profile loads from the API.
  useEffect(() => {
    if (!coach) return;
    setName(coach.name);
    setHeadline(coach.headline);
    setBio(coach.bio);
    setHourlyRate(coach.hourlyRate);
    setSport(coach.sport);
    setSpecialties(coach.specialties);
    setLocation(coach.location);
    setAvatarUrl(coach.avatarUrl);
  }, [coach]);

  // Mark dirty on any change
  const markDirty = () => setDirty(true);

  // Profile completion
  const completion = useMemo(() => {
    const items = [
      { id: "photo", label: "Profile photo", done: !!avatarUrl },
      { id: "name", label: "Display name", done: name.trim().length > 0 },
      {
        id: "headline",
        label: "Headline",
        done: headline.trim().length >= 10,
      },
      { id: "bio", label: "Bio (40+ chars)", done: bio.trim().length >= 40 },
      {
        id: "specialties",
        label: "3+ specialties",
        done: specialties.length >= 3,
      },
      { id: "location", label: "Location", done: location.trim().length > 0 },
      { id: "pricing", label: "Hourly rate", done: hourlyRate > 0 },
    ];
    const done = items.filter((i) => i.done).length;
    return { items, pct: Math.round((done / items.length) * 100) };
  }, [avatarUrl, name, headline, bio, specialties, location, hourlyRate]);

  const addSpecialty = (val?: string) => {
    const v = (val ?? newSpecialty).trim();
    if (!v) return;
    if (!specialties.includes(v)) {
      setSpecialties([...specialties, v]);
      markDirty();
    }
    if (!val) setNewSpecialty("");
  };
  const removeSpecialty = (s: string) => {
    setSpecialties(specialties.filter((x) => x !== s));
    markDirty();
  };

  const handleAITool = (id: string) => {
    setAiLoading(id);
    setTimeout(() => {
      setAiLoading(null);
      if (id === "generate" && !bio) {
        setBio(
          "I help athletes turn consistent training into measurable progress. With over a decade on the court and certifications across mobility, strength, and tactical coaching, I tailor every session to your goals — whether that's a faster serve, a smarter game plan, or a body that holds up to the demands of high performance.",
        );
        markDirty();
      } else if (id === "improve") {
        setBio((prev) =>
          prev.replace(/\.$/, "") +
          ". Every plan is built around your data, your timeline, and your goals.",
        );
        markDirty();
      } else if (id === "shorten") {
        const sentences = bio.split(/(?<=\.)\s+/);
        setBio(sentences.slice(0, 2).join(" "));
        markDirty();
      }
    }, 900);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 1000);
  };

  // Beforeunload guard
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (loading) {
    return (
      <AppShell role="coach" title="Edit Public Profile">
        <LoadingState label="Đang tải hồ sơ…" />
      </AppShell>
    );
  }

  if (error || !coach) {
    return (
      <AppShell role="coach" title="Edit Public Profile">
        <ErrorState onRetry={refetch} className="mx-auto mt-10 max-w-md" />
      </AppShell>
    );
  }

  return (
    <AppShell role="coach" title="Edit Public Profile">
      <div className="max-w-[1340px] mx-auto pb-24">
        {/* ============ HERO ============ */}
        <Hero
          completion={completion}
          dirty={dirty}
          coachId={coach.id}
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          reduce={reduce ?? false}
        />

        {/* ============ 2-COLUMN ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 mt-6">
          {/* ============ LEFT: FORM ============ */}
          <div className="space-y-5 min-w-0">
            {/* Avatar card */}
            <AvatarCard
              avatarUrl={avatarUrl}
              setAvatarUrl={(u) => {
                setAvatarUrl(u);
                markDirty();
              }}
              name={name}
              reduce={reduce ?? false}
            />

            {/* Identity */}
            <FormSection
              icon={Briefcase}
              title="Identity"
              subtitle="The basics learners see first"
              delay={0.08}
              reduce={reduce ?? false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Display name" required>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      markDirty();
                    }}
                    placeholder="Your full name"
                  />
                </Field>
                <Field label="Primary sport" required>
                  <Select
                    value={sport}
                    onChange={(e) => {
                      setSport(e.target.value as typeof sport);
                      markDirty();
                    }}
                  >
                    {AVAILABLE_SPORTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Location"
                  hint="City, country — helps learners filter nearby coaches."
                  className="sm:col-span-2"
                  icon={MapPin}
                >
                  <Input
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Boulder, CO"
                  />
                </Field>
                <Field
                  label="Headline"
                  hint="One line that captures your expertise."
                  className="sm:col-span-2"
                  counter={{ value: headline.length, max: 80 }}
                >
                  <Input
                    value={headline}
                    onChange={(e) => {
                      setHeadline(e.target.value.slice(0, 80));
                      markDirty();
                    }}
                    placeholder="e.g. Tennis coach for ambitious amateurs"
                  />
                </Field>
              </div>
            </FormSection>

            {/* Bio with AI assistant */}
            <FormSection
              icon={PencilLine}
              title="About You"
              subtitle="2–4 sentences on your coaching philosophy"
              delay={0.16}
              reduce={reduce ?? false}
            >
              {/* AI Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 rounded-[14px] bg-gradient-to-br from-primary/[0.04] to-[#7d6dff]/[0.03] border border-primary/10">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-br from-primary to-[#7d6dff] text-on-primary text-[10.5px] font-bold uppercase tracking-wider shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)]">
                  <Sparkles size={10} />
                  AI Bio
                </span>
                {AI_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAITool(t.id)}
                    disabled={aiLoading !== null}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface-container-lowest border border-[var(--color-border-soft)] hover:border-primary/30 hover:bg-primary/[0.04] text-[11.5px] font-medium transition-all disabled:opacity-50",
                      aiLoading === t.id && "border-primary/40 bg-primary/[0.06]",
                    )}
                  >
                    {aiLoading === t.id ? (
                      <Loader2 size={11} className="animate-spin text-primary" />
                    ) : (
                      <t.icon size={11} className="text-primary" />
                    )}
                    {t.label}
                  </button>
                ))}

                {/* Tone selector */}
                <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
                  <span>Tone:</span>
                  <div className="relative">
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="appearance-none pl-2.5 pr-6 h-7 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-full text-[11px] font-medium outline-none focus:border-primary/40 cursor-pointer"
                    >
                      {COACHING_TONES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
                    />
                  </div>
                </div>
              </div>

              <Field counter={{ value: bio.length, max: 500 }}>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value.slice(0, 500));
                    markDirty();
                  }}
                  rows={6}
                  placeholder="Tell learners about your coaching style, experience, and what makes a session with you valuable…"
                  className="w-full px-4 py-3 bg-surface-container-low/40 border border-[var(--color-border-soft)] hover:border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[14px] outline-none text-[14px] leading-[1.6] resize-none transition-all"
                />
              </Field>
            </FormSection>

            {/* Specialties */}
            <FormSection
              icon={Award}
              title="Specialties"
              subtitle="Tag the skills you coach best"
              delay={0.24}
              reduce={reduce ?? false}
            >
              {/* Current chips */}
              <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                <AnimatePresence>
                  {specialties.map((s) => (
                    <motion.span
                      key={s}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{
                        duration: reduce ? 0 : 0.25,
                        ease: EASE,
                      }}
                      className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 text-[12.5px] font-medium text-primary"
                    >
                      {s}
                      <button
                        onClick={() => removeSpecialty(s)}
                        aria-label={`Remove ${s}`}
                        className="w-5 h-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                {specialties.length === 0 && (
                  <p className="text-[12px] text-on-surface-variant italic">
                    No specialties yet — add a few below.
                  </p>
                )}
              </div>

              {/* Add input */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                  placeholder="e.g. Form Check, Match Prep…"
                />
                <button
                  onClick={() => addSpecialty()}
                  disabled={!newSpecialty.trim()}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[12px] bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_3px_10px_-2px_rgba(53,37,205,0.4)] hover:shadow-[0_5px_14px_-2px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 whitespace-nowrap"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add
                </button>
              </div>

              {/* AI suggestions */}
              <div className="rounded-[14px] bg-gradient-to-br from-primary/[0.04] to-[#7d6dff]/[0.03] border border-primary/10 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)]">
                    <Sparkles size={13} className="text-on-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold">
                      AI Suggestions
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Based on your sport, learners, and trending searches
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SPECIALTIES.filter(
                    (s) => !specialties.includes(s),
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => addSpecialty(s)}
                      className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-container-lowest border border-dashed border-primary/30 hover:border-solid hover:border-primary/50 hover:bg-primary/[0.06] text-[12px] font-medium text-primary transition-all"
                    >
                      <Plus
                        size={11}
                        className="transition-transform group-hover:rotate-90"
                      />
                      {s}
                    </button>
                  ))}
                  {SUGGESTED_SPECIALTIES.every((s) =>
                    specialties.includes(s),
                  ) && (
                    <p className="text-[11.5px] text-on-surface-variant">
                      Nice — you&apos;ve picked up all AI suggestions.
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection
              icon={DollarSign}
              title="Pricing"
              subtitle="What you charge for a 1-on-1 session"
              delay={0.32}
              reduce={reduce ?? false}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <Field
                  label="Hourly rate"
                  hint="USD per hour"
                  required
                >
                  <div className="flex items-center bg-surface-container-low/40 border border-[var(--color-border-soft)] focus-within:border-primary/40 focus-within:bg-surface-container-lowest focus-within:ring-4 focus-within:ring-primary/8 rounded-[14px] px-4 transition-all">
                    <span className="text-on-surface-variant text-[15px] font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      value={hourlyRate}
                      min={0}
                      onChange={(e) => {
                        setHourlyRate(Number(e.target.value));
                        markDirty();
                      }}
                      className="flex-1 ml-1.5 py-3 bg-transparent outline-none text-[20px] font-bold tabular-nums"
                    />
                    <span className="text-on-surface-variant text-[13px]">
                      /hr
                    </span>
                  </div>
                </Field>

                {/* Pricing intelligence */}
                <PricingIntelligence
                  current={hourlyRate}
                  market={105}
                  onApply={(v) => {
                    setHourlyRate(v);
                    markDirty();
                  }}
                />
              </div>
            </FormSection>
          </div>

          {/* ============ RIGHT: PREVIEW ============ */}
          <aside
            className={cn(
              "lg:block",
              previewOpen ? "block" : "hidden lg:block",
            )}
          >
            <LivePreview
              avatarUrl={avatarUrl}
              name={name}
              headline={headline}
              bio={bio}
              sport={sport}
              location={location}
              specialties={specialties}
              hourlyRate={hourlyRate}
              rating={coach.rating}
              reviewCount={coach.reviewCount}
              reduce={reduce ?? false}
            />
          </aside>
        </div>
      </div>

      {/* ============ STICKY SAVE BAR ============ */}
      <AnimatePresence>
        {dirty && (
          <SaveBar
            saving={saving}
            onDiscard={() => {
              setName(coach.name);
              setHeadline(coach.headline);
              setBio(coach.bio);
              setHourlyRate(coach.hourlyRate);
              setSport(coach.sport);
              setSpecialties(coach.specialties);
              setLocation(coach.location);
              setAvatarUrl(coach.avatarUrl);
              setDirty(false);
            }}
            onSave={handleSave}
            reduce={reduce ?? false}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero({
  completion,
  dirty,
  coachId,
  previewOpen,
  setPreviewOpen,
  reduce,
}: {
  completion: { items: { id: string; label: string; done: boolean }[]; pct: number };
  dirty: boolean;
  coachId: string;
  previewOpen: boolean;
  setPreviewOpen: (b: boolean) => void;
  reduce: boolean;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-surface-container-lowest to-[#7d6dff]/[0.06] p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_12px_32px_-16px_rgba(53,37,205,0.18)]"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-56 h-56 rounded-full bg-gradient-to-tr from-[#7d6dff]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/15">
              <Sparkles size={11} />
              Public Profile Builder
            </span>
            {dirty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff5d6] text-[#b95000] text-[10.5px] font-semibold border border-[#f4d68a]/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
          <h1 className="text-[30px] sm:text-[36px] leading-[1.05] font-bold tracking-tight">
            Build Your Coaching Brand
          </h1>
          <p className="text-[14.5px] text-on-surface-variant mt-2 max-w-xl leading-relaxed">
            Complete your public profile to attract more learners. Stronger
            profiles get{" "}
            <span className="text-on-surface font-semibold">
              3.2× more inquiries
            </span>
            .
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <Link
              href={`/learner/coaches/${coachId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-[13px] font-medium transition-colors"
            >
              <ExternalLink size={13} />
              View public page
            </Link>
            <button
              onClick={() => setPreviewOpen(!previewOpen)}
              className="lg:hidden inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--color-border-soft)] bg-surface-container-lowest hover:bg-surface-container-low text-[13px] font-medium transition-colors"
            >
              <Eye size={13} />
              {previewOpen ? "Hide preview" : "Show preview"}
            </button>
          </div>
        </div>

        {/* Completion card */}
        <CompletionWidget completion={completion} reduce={reduce} />
      </div>
    </motion.header>
  );
}

function CompletionWidget({
  completion,
  reduce,
}: {
  completion: { items: { id: string; label: string; done: boolean }[]; pct: number };
  reduce: boolean;
}) {
  return (
    <div className="relative rounded-[18px] bg-surface-container-lowest border border-[var(--color-border-soft)] p-4 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_22px_-12px_rgba(15,15,30,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
            Profile Completion
          </p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums bg-gradient-to-r from-primary to-[#7d6dff] bg-clip-text text-transparent leading-none mt-1">
            {completion.pct}%
          </p>
        </div>
        {completion.pct >= 100 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success-container text-[10.5px] font-bold text-[#1f7a4d]">
            <Check size={11} />
            Done
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-surface-container-low overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completion.pct}%` }}
          transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
          className="h-full rounded-full bg-gradient-to-r from-primary via-[#5b4ee8] to-[#7d6dff]"
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
        {completion.items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-2 text-[12px]"
          >
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                it.done
                  ? "bg-gradient-to-br from-primary to-[#7d6dff] text-on-primary"
                  : "bg-surface-container-low border border-dashed border-[var(--color-border-soft)]",
              )}
            >
              {it.done && <Check size={9} strokeWidth={3} />}
            </span>
            <span
              className={cn(
                it.done
                  ? "text-on-surface line-through decoration-on-surface-variant/40"
                  : "text-on-surface-variant",
              )}
            >
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Form section card
// ============================================================================

function FormSection({
  icon: Icon,
  title,
  subtitle,
  children,
  delay,
  reduce,
}: {
  icon: typeof Briefcase;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 flex items-center justify-center text-primary">
          <Icon size={17} strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12.5px] text-on-surface-variant mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

// ============================================================================
// Avatar card
// ============================================================================

function AvatarCard({
  avatarUrl,
  setAvatarUrl,
  name,
  reduce,
}: {
  avatarUrl: string;
  setAvatarUrl: (s: string) => void;
  name: string;
  reduce: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
      className="rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 flex items-center justify-center text-primary">
          <Camera size={17} strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight leading-tight">
            Profile Photo
          </h2>
          <p className="text-[12.5px] text-on-surface-variant mt-0.5">
            Faces with eye contact attract 2× more inquiries
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Large avatar preview */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-primary to-[#7d6dff] blur-xl opacity-30" />
          <div className="relative w-28 h-28 rounded-[24px] overflow-hidden ring-4 ring-surface-container-lowest shadow-[0_8px_24px_-6px_rgba(15,15,30,0.18)]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-primary font-bold text-2xl">
                {name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            )}
          </div>
          {/* Floating tools */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-full shadow-[0_4px_12px_-2px_rgba(15,15,30,0.15)]">
            <button
              aria-label="Crop"
              className="w-7 h-7 rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
            >
              <Crop size={12} />
            </button>
            <button
              aria-label="Zoom"
              className="w-7 h-7 rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={() => setAvatarUrl("")}
              aria-label="Remove"
              className="w-7 h-7 rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-[#ba1a1a] transition-colors flex items-center justify-center"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Drag-drop upload */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          className={cn(
            "group flex-1 w-full cursor-pointer rounded-[16px] border-2 border-dashed p-5 transition-all bg-gradient-to-br",
            dragOver
              ? "border-primary/50 from-primary/[0.06] to-primary/[0.02]"
              : "border-[var(--color-border-soft)] from-surface-container-low/40 to-transparent hover:border-primary/30 hover:from-primary/[0.03]",
          )}
        >
          <input type="file" accept="image/*" className="sr-only" />
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                dragOver
                  ? "bg-gradient-to-br from-primary to-[#7d6dff] text-on-primary shadow-[0_6px_16px_-3px_rgba(53,37,205,0.45)]"
                  : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary",
              )}
            >
              {dragOver ? (
                <Upload size={20} strokeWidth={2.25} />
              ) : (
                <ImagePlus size={20} strokeWidth={2.25} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold">
                Drag &amp; drop a photo
              </p>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                JPG or PNG, up to 5 MB · 800×800 px recommended
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12px] font-semibold shadow-[0_3px_8px_-2px_rgba(53,37,205,0.4)]">
                  <Upload size={12} />
                  Choose file
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  or paste URL
                </span>
              </div>
            </div>
          </div>
        </label>
      </div>
    </motion.section>
  );
}

// ============================================================================
// Pricing intelligence
// ============================================================================

function PricingIntelligence({
  current,
  market,
  onApply,
}: {
  current: number;
  market: number;
  onApply: (v: number) => void;
}) {
  const delta = market - current;
  const deltaPct = Math.round((delta / market) * 100);
  const below = current < market;
  const suggested = Math.round(current * 1.08);

  return (
    <div className="rounded-[14px] bg-gradient-to-br from-primary/[0.04] to-[#7d6dff]/[0.03] border border-primary/15 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-[#7d6dff] flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(53,37,205,0.35)]">
          <Lightbulb size={13} className="text-on-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[12.5px] font-semibold">Pricing Intelligence</p>
          <p className="text-[10.5px] text-on-surface-variant">
            Based on 124 similar coaches
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
          92% confident
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-[10px] bg-surface-container-lowest border border-[var(--color-border-soft)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-medium text-on-surface-variant">
            Market avg
          </p>
          <p className="text-[18px] font-bold tabular-nums leading-none mt-0.5">
            ${market}
            <span className="text-[11px] text-on-surface-variant font-normal">
              /hr
            </span>
          </p>
        </div>
        <div className="rounded-[10px] bg-surface-container-lowest border border-[var(--color-border-soft)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-medium text-on-surface-variant">
            Your price
          </p>
          <p className="text-[18px] font-bold tabular-nums leading-none mt-0.5">
            ${current}
            <span className="text-[11px] text-on-surface-variant font-normal">
              /hr
            </span>
          </p>
        </div>
      </div>

      {below ? (
        <div className="flex items-start gap-2 p-2.5 rounded-[10px] bg-success-container/40 border border-[#bce8c8]">
          <TrendingUp size={13} className="text-[#1f7a4d] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-tight">
              Suggested: +8% → ${suggested}/hr
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              You&apos;re {Math.abs(deltaPct)}% below market. Most learners
              expect to pay closer to market.
            </p>
            <button
              onClick={() => onApply(suggested)}
              className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1f7a4d] hover:underline"
            >
              Apply suggestion
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-2.5 rounded-[10px] bg-surface-container-lowest border border-[var(--color-border-soft)]">
          <CheckCircle2 size={13} className="text-[#1f7a4d] mt-0.5 shrink-0" />
          <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
            You&apos;re at or above market — great for premium positioning.
            Lean into the value in your bio to justify the rate.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Live Preview
// ============================================================================

function LivePreview({
  avatarUrl,
  name,
  headline,
  bio,
  sport,
  location,
  specialties,
  hourlyRate,
  rating,
  reviewCount,
  reduce,
}: {
  avatarUrl: string;
  name: string;
  headline: string;
  bio: string;
  sport: string;
  location: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, delay: 0.1, ease: EASE }}
      className="lg:sticky lg:top-20 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant inline-flex items-center gap-1.5">
          <Eye size={11} />
          Live preview
        </p>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-container text-[10px] font-semibold text-[#1f7a4d]">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_2px_8px_-2px_rgba(15,15,30,0.06),0_16px_36px_-12px_rgba(15,15,30,0.1)]">
        {/* Cover gradient */}
        <div className="relative h-24 bg-gradient-to-br from-primary via-[#5b4ee8] to-[#7d6dff] overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-6 left-1/3 w-24 h-24 rounded-full bg-[#c084fc]/40 blur-2xl" />
        </div>

        <div className="relative px-5 pb-5">
          {/* Avatar overlap */}
          <div className="relative z-10 -mt-12 mb-3">
            <div className="w-20 h-20 rounded-[18px] overflow-hidden ring-4 ring-surface-container-lowest shadow-[0_6px_16px_-3px_rgba(15,15,30,0.18)]">
              {avatarUrl ? (
                <motion.img
                  key={avatarUrl}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-container-high flex items-center justify-center text-primary font-bold text-xl">
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
            </div>
          </div>

          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <motion.h3
                key={name}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="text-[20px] font-bold tracking-tight leading-tight truncate"
              >
                {name || "Your name"}
              </motion.h3>
              <p className="text-[12px] text-on-surface-variant inline-flex items-center gap-1 mt-0.5">
                <MapPin size={11} />
                <span className="truncate">
                  {location || "Add location"} · {sport}
                </span>
              </p>
            </div>
            <div className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#fff5d6] text-[#b45309] text-[11px] font-bold border border-[#f4d68a]/60">
              <Star size={10} className="fill-[#f59e0b] stroke-[#f59e0b]" />
              {rating.toFixed(1)}
              <span className="text-on-surface-variant font-medium">
                ({reviewCount})
              </span>
            </div>
          </div>

          {/* Headline */}
          <motion.p
            key={headline}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="text-[14px] font-semibold text-on-surface mt-3 leading-snug"
          >
            {headline || (
              <span className="italic text-on-surface-variant">
                Add a headline to capture your expertise…
              </span>
            )}
          </motion.p>

          {/* Bio */}
          <motion.p
            key={bio.slice(0, 40)}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="text-[12.5px] text-on-surface-variant leading-relaxed mt-2 line-clamp-4"
          >
            {bio || (
              <span className="italic">
                Write a short bio describing your coaching style…
              </span>
            )}
          </motion.p>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1.5 mt-3 min-h-[24px]">
            {specialties.slice(0, 6).map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[10.5px] font-semibold border border-primary/15"
              >
                {s}
              </span>
            ))}
            {specialties.length === 0 && (
              <span className="text-[11px] italic text-on-surface-variant">
                Tag your specialties to stand out
              </span>
            )}
          </div>

          {/* Price + CTA */}
          <div className="flex items-end justify-between mt-4 pt-4 border-t border-[var(--color-border-soft)]">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-on-surface-variant">
                Hourly rate
              </p>
              <p className="text-[24px] leading-none font-bold tracking-tight tabular-nums bg-gradient-to-r from-primary to-[#7d6dff] bg-clip-text text-transparent mt-1">
                {formatCurrency(hourlyRate)}
                <span className="text-[12px] text-on-surface-variant font-medium not-italic">
                  /hr
                </span>
              </p>
            </div>
            <button
              disabled
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[12.5px] font-semibold shadow-[0_4px_12px_-2px_rgba(53,37,205,0.4)]"
            >
              Book session
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10.5px] text-on-surface-variant text-center">
        This is how learners will see your profile
      </p>
    </motion.div>
  );
}

// ============================================================================
// Sticky save bar
// ============================================================================

function SaveBar({
  saving,
  onDiscard,
  onSave,
  reduce,
}: {
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
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
      className="fixed bottom-4 left-4 right-4 lg:left-[calc(16rem+1rem)] lg:right-6 z-30"
    >
      <div className="max-w-[1340px] mx-auto rounded-[16px] border border-[var(--color-border-soft)] bg-surface-container-lowest/95 backdrop-blur-md p-3 pl-4 flex items-center justify-between gap-3 shadow-[0_8px_24px_-6px_rgba(15,15,30,0.15),0_2px_8px_-2px_rgba(15,15,30,0.08)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">
              Unsaved changes
            </p>
            <p className="text-[11px] text-on-surface-variant truncate">
              Save to publish updates to your public profile
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDiscard}
            disabled={saving}
            className="h-10 px-4 rounded-xl border border-[var(--color-border-soft)] hover:bg-surface-container-low text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-br from-primary to-[#5b4ee8] text-on-primary text-[13px] font-semibold shadow-[0_4px_14px_-2px_rgba(53,37,205,0.45)] hover:shadow-[0_8px_22px_-4px_rgba(53,37,205,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={2.5} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Field, Input, Select primitives
// ============================================================================

function Field({
  label,
  hint,
  required,
  icon: Icon,
  counter,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  icon?: typeof MapPin;
  counter?: { value: number; max: number };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-on-surface">
            {Icon && <Icon size={12} className="text-on-surface-variant" />}
            {label}
            {required && <span className="text-primary">*</span>}
          </label>
          {counter && (
            <span
              className={cn(
                "text-[10.5px] tabular-nums font-medium",
                counter.value > counter.max * 0.9
                  ? "text-[#b95000]"
                  : "text-on-surface-variant",
              )}
            >
              {counter.value} / {counter.max}
            </span>
          )}
        </div>
      )}
      {hint && (
        <p className="text-[11.5px] text-on-surface-variant mb-2 leading-relaxed">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-11 px-4 bg-surface-container-low/40 border border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[12px] outline-none text-[14px] placeholder:text-on-surface-variant/60 transition-all",
        props.className,
      )}
    />
  );
}

function Select({
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...rest}
        className="w-full h-11 pl-4 pr-9 appearance-none bg-surface-container-low/40 border border-[var(--color-border-soft)] focus:border-primary/40 focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/8 rounded-[12px] outline-none text-[14px] transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
      />
    </div>
  );
}

// Silence unused imports (kept reserved for future actions)
void ChevronRight;
