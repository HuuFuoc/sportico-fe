import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { getCoachById, mockCoaches } from "@/lib/mock/users";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MOCK_REVIEWS = [
  {
    id: "r1",
    name: "Sarah J.",
    achievement: "PR: 3:02:14",
    rating: 5,
    when: "2 weeks ago",
    text: "Transformed my form in 3 sessions. Technical knowledge is unmatched.",
    avatar: "https://i.pravatar.cc/120?u=review-1",
  },
  {
    id: "r2",
    name: "Marcus T.",
    achievement: "Sub-19 5K",
    rating: 5,
    when: "1 month ago",
    text: "Plans are demanding but smart. Saw measurable gains within 6 weeks.",
    avatar: "https://i.pravatar.cc/120?u=review-2",
  },
  {
    id: "r3",
    name: "Emma L.",
    achievement: "New runner",
    rating: 4,
    when: "1 month ago",
    text: "Patient and detailed. Great at adapting drills to my level.",
    avatar: "https://i.pravatar.cc/120?u=review-3",
  },
];

const PRICING = [
  {
    label: "Consultation",
    price: 120,
    description: "Single 60min technical review.",
    highlight: false,
  },
  {
    label: "Monthly Elite",
    price: 450,
    description: "Full plan + weekly video calls.",
    highlight: true,
  },
  {
    label: "Season Prep",
    price: 1200,
    description: "12-week customized program.",
    highlight: false,
  },
];

export async function generateStaticParams() {
  return mockCoaches.map((c) => ({ id: c.id }));
}

export default async function CoachProfilePage({ params }: PageProps) {
  const { id } = await params;
  const coach = getCoachById(id);
  if (!coach) notFound();

  return (
    <AppShell role="learner" title={coach.name}>
      <div className="max-w-[1200px] space-y-6">
        {/* Back nav */}
        <Link
          href="/learner/coaches"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <MaterialIcon name="arrow_back" size={16} />
          Back to coaches
        </Link>

        {/* Header */}
        <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6 flex flex-col md:flex-row gap-6">
          <img
            src={coach.avatarUrl}
            alt={coach.name}
            className="w-32 h-32 rounded-[12px] object-cover shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 text-on-surface">{coach.name}</h1>
              {coach.verified && (
                <span className="inline-flex items-center gap-1 text-body-sm text-primary">
                  <MaterialIcon name="verified" filled size={16} />
                  Verified
                </span>
              )}
              <AIBadge label="Elite Pro" />
            </div>
            <p className="text-body-base text-on-surface-variant">
              {coach.headline}
            </p>
            <div className="flex flex-wrap gap-4 text-body-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <MaterialIcon name="location_on" size={16} />
                {coach.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <MaterialIcon
                  name="star"
                  filled
                  size={16}
                  className="text-amber-500"
                />
                {coach.rating.toFixed(1)} ({coach.reviewCount} reviews)
              </span>
              <span className="inline-flex items-center gap-1">
                <MaterialIcon name="timer" size={16} />
                {coach.yearsExperience} yrs experience
              </span>
              <span className="inline-flex items-center gap-1">
                <MaterialIcon name="groups" size={16} />
                {coach.activeLearners} active learners
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:items-end shrink-0 md:min-w-[180px]">
            <button className="px-5 py-2.5 border border-[var(--color-border-soft)] rounded-[6px] text-body-base font-medium hover:bg-surface-container-low transition-colors">
              Message
            </button>
            <button className="px-5 py-2.5 bg-primary text-on-primary rounded-[6px] text-body-base font-medium hover:bg-[#2d20b8] transition-colors">
              Book a Session
            </button>
          </div>
        </section>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-8 space-y-6">
            {/* Intro video placeholder */}
            <div className="bg-surface-container-low border border-[var(--color-border-soft)] rounded-[12px] aspect-video relative overflow-hidden group cursor-pointer">
              <img
                src={coach.avatarUrl}
                alt=""
                className="w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MaterialIcon name="play_arrow" filled size={28} />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-on-primary font-medium">
                Why train with me? (2:14)
              </div>
            </div>

            {/* Specialties */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {coach.specialties.map((sp) => (
                <div
                  key={sp}
                  className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4"
                >
                  <MaterialIcon
                    name="fitness_center"
                    size={20}
                    className="text-primary mb-2"
                  />
                  <p className="text-h3 mb-1">{sp}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    Specialized training in {sp.toLowerCase()}.
                  </p>
                </div>
              ))}
            </section>

            {/* About */}
            <section className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6">
              <h2 className="text-h2 mb-3">About {coach.name.split(" ")[0]}</h2>
              <p className="text-body-base text-on-surface-variant leading-relaxed mb-4">
                {coach.bio}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Performance Testing",
                  "Periodization",
                  "Recovery Protocols",
                  "Video Analysis",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-surface-container-high text-body-sm rounded-[6px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h2">Client Reviews</h2>
                <button className="text-body-sm text-primary hover:underline">
                  View all {coach.reviewCount}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {MOCK_REVIEWS.map((r) => (
                  <article
                    key={r.id}
                    className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-4 flex gap-4"
                  >
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-body-base font-medium">
                          {r.name}{" "}
                          <span className="text-on-surface-variant font-normal">
                            — {r.achievement}
                          </span>
                        </p>
                        <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
                          {r.when}
                        </span>
                      </div>
                      <div className="flex text-amber-500 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <MaterialIcon
                            key={i}
                            name="star"
                            filled={i < r.rating}
                            size={14}
                            className={
                              i < r.rating
                                ? "text-amber-500"
                                : "text-surface-container-highest"
                            }
                          />
                        ))}
                      </div>
                      <p className="text-body-base text-on-surface-variant italic">
                        "{r.text}"
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Right (sticky widgets) */}
          <aside className="lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-20">
              {/* AI compat */}
              <div className="bg-primary/5 border border-primary/15 rounded-[12px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <MaterialIcon name="psychology" filled size={20} />
                    <span className="text-h3">AI Compatibility</span>
                  </div>
                  <span
                    className="text-h1 text-primary"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {coach.matchPercent ?? 87}%
                  </span>
                </div>
                <div className="w-full bg-outline-variant/40 h-1.5 rounded-full mb-3 overflow-hidden">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${coach.matchPercent ?? 87}%` }}
                  />
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  <span className="text-primary font-medium">
                    Strong match
                  </span>{" "}
                  — Based on your goals & training style preferences.
                </p>
              </div>

              {/* Pricing tiers */}
              <div className="space-y-2">
                {PRICING.map((tier) => (
                  <button
                    key={tier.label}
                    className={`w-full text-left p-4 rounded-[10px] border transition-colors relative ${
                      tier.highlight
                        ? "border-primary bg-primary/5"
                        : "border-[var(--color-border-soft)] bg-surface-container-lowest hover:border-primary"
                    }`}
                  >
                    {tier.highlight && (
                      <span className="absolute -top-2.5 right-4 bg-primary text-on-primary text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded">
                        Best Value
                      </span>
                    )}
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-h3 text-on-surface">
                        {tier.label}
                      </span>
                      <span
                        className="text-h2 text-primary"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {formatCurrency(tier.price, coach.currency)}
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      {tier.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
