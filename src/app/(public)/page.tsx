import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { AIInsightBanner } from "@/components/common/AIInsightBanner";
import { CoachCard } from "@/components/common/CoachCard";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { HowItWorksCard } from "@/components/landing/HowItWorksCard";
import { getCoaches } from "@/lib/mock/users";
import { avatarFor } from "@/lib/utils";
import type { AIInsight, Coach } from "@/types";

// Platform-wide marketing figures — consistent with the admin dashboard mock
// (Total Users 24,592 · Active Coaches 1,204).
const STATS = [
  { label: "Elite Coaches", value: "1,204" },
  { label: "Athletes Trained", value: "24,592" },
  { label: "Match Accuracy", value: "98%" },
  { label: "Avg Coach Rating", value: "4.9★" },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: "flag",
    title: "Tell us your goals",
    body: "Share your sport, target outcomes, schedule and training style in a short profile.",
    ai: false,
  },
  {
    step: 2,
    icon: "auto_awesome",
    title: "AI matches your coach",
    body: "Our matching engine ranks 1,204 coaches against your goals to surface the best fit.",
    ai: true,
  },
  {
    step: 3,
    icon: "calendar_month",
    title: "Book & train",
    body: "Pick a slot, confirm the session and track every result from your dashboard.",
    ai: false,
  },
];

const AI_BULLETS = [
  {
    icon: "target",
    title: "Goal-aware ranking",
    body: "Scores coaches on your specific targets — not just sport category.",
  },
  {
    icon: "event_available",
    title: "Schedule sync",
    body: "Only surfaces coaches with open slots that fit your training week.",
  },
  {
    icon: "tune",
    title: "Style fit that learns",
    body: "Refines every future match from your session feedback and progress.",
  },
];

const TESTIMONIALS = [
  {
    name: "Alex Rivera",
    role: "Marathon runner",
    avatar: avatarFor("learner-1"),
    quote:
      "The AI match nailed it on the first try. My coach understood my mobility goals before our first call.",
  },
  {
    name: "Mia Carter",
    role: "5K competitor",
    avatar: avatarFor("learner-11"),
    quote:
      "Booking and progress tracking are in one place. I've cut 90 seconds off my time in two months.",
  },
  {
    name: "Daniel Wong",
    role: "Amateur boxer",
    avatar: avatarFor("learner-6"),
    quote:
      "I tried three platforms before this. The coach quality and the match accuracy are simply better.",
  },
];

const AI_MATCH_INSIGHT: AIInsight = {
  id: "landing-ai-insight",
  audience: "learner",
  title: "AI Insight",
  body: "Analyzed 1,204 coaches against your goals in 0.8s — here are your top matches.",
  severity: "info",
  createdAt: "2026-05-21",
};

export default function LandingPage() {
  const coaches = getCoaches();
  const featured = coaches.slice(0, 4);
  const matchPreview = coaches.slice(0, 3);

  return (
    <>
      {/* ============================ A — Hero ============================ */}
      <section className="border-b border-[var(--color-border-soft)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <AIBadge label="AI-Powered Matching" size="md" />
            <h1
              className="mt-5 text-[44px] font-medium leading-[1.05] text-on-surface sm:text-[52px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Train smarter with AI-matched coaches.
            </h1>
            <p className="mt-5 max-w-xl text-h3 font-normal text-on-surface-variant">
              ProCoach AI connects athletes with elite coaches — matched by your
              goals, schedule and training style, so every session moves you
              forward.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/learner/coaches"
                className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-5 py-2.5 text-body-base font-medium text-on-primary transition-colors hover:bg-[#2d20b8]"
              >
                <MaterialIcon name="search" size={18} />
                Find Your Coach
              </Link>
              <Link
                href="/coach/dashboard"
                className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-5 py-2.5 text-body-base font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <MaterialIcon name="sports" size={18} />
                Become a Coach
              </Link>
            </div>
          </div>

          <HeroPreview coach={coaches[0]} />
        </div>
      </section>

      {/* ======================= B — Trust bar / Stats ==================== */}
      <section className="border-b border-[var(--color-border-soft)] bg-surface-container-lowest">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p
                className="text-[28px] font-medium leading-none text-on-surface"
                style={{ letterSpacing: "-0.02em" }}
              >
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================= C — How it Works ======================== */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <h2
              className="text-[32px] font-medium leading-tight text-on-surface"
              style={{ letterSpacing: "-0.02em" }}
            >
              How ProCoach works
            </h2>
            <p className="mt-3 text-body-base text-on-surface-variant">
              From goal to first session in three steps — with AI doing the
              heavy lifting in the middle.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <HowItWorksCard key={step.step} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ====================== D — Featured Coaches ====================== */}
      <section className="border-t border-[var(--color-border-soft)] bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2
                className="text-[32px] font-medium leading-tight text-on-surface"
                style={{ letterSpacing: "-0.02em" }}
              >
                Meet our elite coaches
              </h2>
              <p className="mt-3 text-body-base text-on-surface-variant">
                Verified professionals across 13 sports — every profile vetted
                before it goes live.
              </p>
            </div>
            <Link
              href="/learner/coaches"
              className="inline-flex items-center gap-1 text-body-base font-medium text-primary hover:underline"
            >
              Browse all
              <MaterialIcon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        </div>
      </section>

      {/* ===================== E — AI Feature highlight =================== */}
      <section className="border-t border-[var(--color-border-soft)] bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <AIBadge label="AI Coach Matching" size="md" />
            <h2
              className="mt-5 text-[32px] font-medium leading-tight text-on-surface"
              style={{ letterSpacing: "-0.02em" }}
            >
              Matching that understands more than your sport.
            </h2>
            <p className="mt-3 text-body-base text-on-surface-variant">
              Most marketplaces stop at a filter. ProCoach AI weighs your goals,
              availability and how you like to be coached — then keeps improving.
            </p>
            <ul className="mt-6 space-y-3">
              {AI_BULLETS.map((bullet) => (
                <li key={bullet.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                    <MaterialIcon name={bullet.icon} filled size={18} />
                  </div>
                  <div>
                    <p className="text-body-base font-medium text-on-surface">
                      {bullet.title}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {bullet.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Match screen mockup */}
          <div className="space-y-3">
            <AIInsightBanner insight={AI_MATCH_INSIGHT} />
            <AIMatchMockup coaches={matchPreview} />
          </div>
        </div>
      </section>

      {/* ======================== F — For Coaches ========================= */}
      <section id="for-coaches" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col items-center gap-6 rounded-[10px] border border-primary/20 bg-primary/[0.06] px-6 py-12 text-center sm:px-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-primary text-on-primary">
              <MaterialIcon name="sports" filled size={24} />
            </div>
            <div className="max-w-2xl">
              <h2
                className="text-[32px] font-medium leading-tight text-on-surface"
                style={{ letterSpacing: "-0.02em" }}
              >
                Are you a coach? Grow your practice.
              </h2>
              <p className="mt-3 text-body-base text-on-surface-variant">
                Get matched with athletes who fit your specialty, manage your
                schedule and earnings, and let AI fill your open slots.
              </p>
            </div>
            <Link
              href="/coach/dashboard"
              className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-5 py-2.5 text-body-base font-medium text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              <MaterialIcon name="add" size={18} />
              Become a Coach
            </Link>
          </div>
        </div>
      </section>

      {/* ======================= G — Testimonials ========================= */}
      <section className="border-t border-[var(--color-border-soft)] bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <h2
              className="text-[32px] font-medium leading-tight text-on-surface"
              style={{ letterSpacing: "-0.02em" }}
            >
              Trusted by athletes who train with intent
            </h2>
            <p className="mt-3 text-body-base text-on-surface-variant">
              Real results from learners across the platform.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((review) => (
              <TestimonialCard key={review.name} {...review} />
            ))}
          </div>
        </div>
      </section>

      {/* ========================= H — Final CTA ========================== */}
      <section className="border-t border-[var(--color-border-soft)]">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2
            className="mx-auto max-w-2xl text-[40px] font-medium leading-tight text-on-surface"
            style={{ letterSpacing: "-0.03em" }}
          >
            Ready to elevate your performance?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-h3 font-normal text-on-surface-variant">
            Join thousands of athletes training with AI-matched elite coaches.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/learner/dashboard"
              className="inline-flex items-center gap-2 rounded-[6px] bg-primary px-6 py-3 text-body-base font-medium text-on-primary transition-colors hover:bg-[#2d20b8]"
            >
              <MaterialIcon name="auto_awesome" filled size={18} />
              Get Started Free
            </Link>
            <Link
              href="/learner/coaches"
              className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-6 py-3 text-body-base font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Browse Coaches
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ----------------------------- sub-components ---------------------------- */

function AIMatchMockup({ coaches }: { coaches: Coach[] }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="auto_awesome"
            filled
            size={18}
            className="text-primary"
          />
          <p className="text-h3 text-on-surface">AI Match Results</p>
        </div>
        <span className="text-body-sm text-on-surface-variant">
          Top 3 of 1,204
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className="flex items-center gap-3 rounded-[8px] border border-[var(--color-border-soft)] p-2.5"
          >
            <img
              src={coach.avatarUrl}
              alt={coach.name}
              className="h-10 w-10 rounded-[8px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-base font-medium text-on-surface">
                {coach.name}
              </p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {coach.sport} · {coach.headline}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-body-base font-medium text-primary">
                {coach.matchPercent}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                match
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  avatar,
  quote,
}: {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}) {
  return (
    <div className="flex flex-col rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4">
      <div className="flex gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <MaterialIcon key={i} name="star" filled size={16} />
        ))}
      </div>
      <p className="mt-3 flex-1 text-body-base text-on-surface">“{quote}”</p>
      <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-soft)] pt-4">
        <img
          src={avatar}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div>
          <p className="text-body-base font-medium text-on-surface">{name}</p>
          <p className="text-body-sm text-on-surface-variant">{role}</p>
        </div>
      </div>
    </div>
  );
}
