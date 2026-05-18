"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { getCoachById, AVAILABLE_SPORTS } from "@/lib/mock/users";

export default function EditCoachProfilePage() {
  const coach = getCoachById("coach-1")!;
  const [name, setName] = useState(coach.name);
  const [headline, setHeadline] = useState(coach.headline);
  const [bio, setBio] = useState(coach.bio);
  const [hourlyRate, setHourlyRate] = useState(coach.hourlyRate);
  const [sport, setSport] = useState(coach.sport);
  const [specialties, setSpecialties] = useState<string[]>(coach.specialties);
  const [location, setLocation] = useState(coach.location);
  const [newSpecialty, setNewSpecialty] = useState("");

  const addSpecialty = () => {
    const v = newSpecialty.trim();
    if (!v) return;
    if (!specialties.includes(v)) setSpecialties([...specialties, v]);
    setNewSpecialty("");
  };
  const removeSpecialty = (s: string) =>
    setSpecialties(specialties.filter((x) => x !== s));

  return (
    <AppShell role="coach" title="Edit Public Profile">
      <div className="max-w-[1200px]">
        <header className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-h1">Edit Public Profile</h1>
            <p className="text-body-base text-on-surface-variant mt-1">
              How learners see your coaching page.
            </p>
          </div>
          <Link
            href={`/learner/coaches/${coach.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low"
          >
            <MaterialIcon name="open_in_new" size={16} />
            Preview public page
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Form */}
          <div className="lg:col-span-7 space-y-5">
            {/* Identity */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <h2 className="text-h2 mb-4">Primary identity</h2>
              <div className="flex items-center gap-4 mb-5">
                <img
                  src={coach.avatarUrl}
                  alt={coach.name}
                  className="w-20 h-20 rounded-[12px] object-cover"
                />
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-sm hover:bg-surface-container-low">
                    Upload new
                  </button>
                  <button className="px-3 py-1.5 text-body-sm text-on-surface-variant hover:text-on-surface">
                    Remove
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Display name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Primary sport">
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as typeof sport)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors"
                  >
                    {AVAILABLE_SPORTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Location" className="sm:col-span-2">
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </Field>
                <Field label="Headline" className="sm:col-span-2" hint="One line that captures your expertise.">
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </Field>
              </div>
            </section>

            {/* About */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <h2 className="text-h2 mb-4">About you</h2>
              <Field label="Bio" hint="2-4 sentences describing your coaching philosophy.">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors resize-none"
                />
              </Field>
              <p className="text-body-sm text-on-surface-variant mt-2">
                {bio.length} / 500 characters
              </p>
            </section>

            {/* Specialties */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2">Specialties</h2>
                <AIBadge label="AI suggested" />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-high rounded-[6px] text-body-sm"
                  >
                    {s}
                    <button
                      onClick={() => removeSpecialty(s)}
                      className="hover:text-error"
                      aria-label={`Remove ${s}`}
                    >
                      <MaterialIcon name="close" size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                  placeholder="e.g. Form Check, Match Prep..."
                />
                <button
                  onClick={addSpecialty}
                  className="px-3 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8] whitespace-nowrap"
                >
                  Add
                </button>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-3 inline-flex items-center gap-1">
                <MaterialIcon
                  name="auto_awesome"
                  filled
                  size={14}
                  className="text-primary"
                />
                AI noticed your learners often request "Threshold Work" — add
                it?
              </p>
            </section>

            {/* Pricing */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-5">
              <h2 className="text-h2 mb-4">Pricing</h2>
              <Field label="Hourly rate (USD)" hint="Single 1-on-1 session.">
                <div className="flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 max-w-[200px] focus-within:border-primary">
                  <span className="text-on-surface-variant">$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="flex-1 ml-1 py-2 bg-transparent outline-none text-body-base"
                  />
                  <span className="text-on-surface-variant text-body-sm">
                    /hr
                  </span>
                </div>
              </Field>
            </section>
          </div>

          {/* Preview */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-20 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
                Live preview
              </p>
              <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-5">
                <img
                  src={coach.avatarUrl}
                  alt={name}
                  className="w-20 h-20 rounded-[12px] object-cover mb-3"
                />
                <h3 className="text-h2">{name}</h3>
                <p className="text-body-sm text-on-surface-variant mb-3 inline-flex items-center gap-1">
                  <MaterialIcon name="location_on" size={14} />
                  {location} · {sport}
                </p>
                <p className="text-body-base text-on-surface mb-3">
                  {headline}
                </p>
                <p className="text-body-sm text-on-surface-variant mb-3 line-clamp-4">
                  {bio}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {specialties.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] uppercase tracking-wider text-on-surface-variant"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p
                  className="text-h2 text-primary"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {formatCurrency(hourlyRate)}
                  <span className="text-body-base text-on-surface-variant font-normal">
                    /hr
                  </span>
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Save bar (sticky) */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-surface-container-lowest border-t border-[var(--color-border-soft)] px-6 py-3 flex items-center justify-end gap-2 z-30">
          <button className="px-4 py-2 text-body-sm text-on-surface-variant hover:text-on-surface">
            Discard
          </button>
          <button className="px-5 py-2 bg-primary text-on-primary rounded-[6px] text-body-sm font-medium hover:bg-[#2d20b8]">
            Save changes
          </button>
        </div>
        <div className="h-16" />
      </div>
    </AppShell>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-body-base font-medium text-on-surface mb-1">
        {label}
      </label>
      {hint && (
        <p className="text-body-sm text-on-surface-variant mb-2">{hint}</p>
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
        "w-full px-3 py-2 bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] text-body-base outline-none focus:border-primary transition-colors",
        props.className,
      )}
    />
  );
}
