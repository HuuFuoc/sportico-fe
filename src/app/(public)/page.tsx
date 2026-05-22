import type { ReactNode } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { MatchExplainer } from "@/components/landing/MatchExplainer";
import { CoachShowcaseCard } from "@/components/landing/CoachShowcaseCard";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { AnimatedNumber } from "@/components/landing/AnimatedNumber";
import { Reveal, RevealStagger, RevealItem } from "@/components/landing/Motion";
import { getCoaches } from "@/lib/mock/users";
import { avatarFor, cn } from "@/lib/utils";

/* ----------------------------- page content ----------------------------- */

const HERO_AVATARS = [
  avatarFor("learner-11"),
  avatarFor("learner-2"),
  avatarFor("learner-6"),
  avatarFor("learner-1"),
];

const STATS = [
  { value: 1200, suffix: "+", decimals: 0, label: "Verified elite coaches" },
  { value: 25, suffix: "k+", decimals: 0, label: "Athletes coached since 2021" },
  { value: 94, suffix: "%", decimals: 0, label: "AI match accuracy" },
  { value: 4.9, suffix: "/5", decimals: 1, label: "Average coach rating" },
];

const STEPS = [
  {
    n: "01",
    icon: "flag",
    title: "Share your ambition",
    body: "Tell us your sport, your goal and how you like to train. A focused 60-second profile — no endless forms.",
  },
  {
    n: "02",
    icon: "auto_awesome",
    title: "AI finds your match",
    body: "Our engine scores every coach against your goals, schedule and style — and shows you exactly why each one fits.",
    highlight: true,
  },
  {
    n: "03",
    icon: "trending_up",
    title: "Train, measure, repeat",
    body: "Book in a tap, then watch every metric move on one intelligent dashboard that learns as you go.",
  },
];

const AI_SIGNALS = [
  {
    icon: "target",
    title: "Goal-weighted ranking",
    body: "Coaches are scored on your specific outcome — not just a sport category.",
  },
  {
    icon: "event_available",
    title: "Schedule-aware matching",
    body: "Only surfaces coaches with real open slots that fit how your week looks.",
  },
  {
    icon: "tune",
    title: "Style calibration",
    body: "Learns whether you want tough love or patient guidance, then matches for it.",
  },
  {
    icon: "insights",
    title: "Closed feedback loop",
    body: "Every session result sharpens the model's next recommendation for you.",
  },
];

const TESTIMONIALS = [
  {
    name: "Mia Carter",
    role: "5K competitor",
    avatar: avatarFor("learner-11"),
    metric: "−90s",
    metricLabel: "5K time",
    quote:
      "The match nailed it on the first try. I've cut 90 seconds off my 5K in two months — and I actually look forward to every session now.",
  },
  {
    name: "Alex Rivera",
    role: "Marathon runner",
    avatar: avatarFor("learner-1"),
    metric: "+24h",
    metricLabel: "trained",
    quote:
      "My coach understood my mobility goals before our first call. Booking, plans and progress finally all live in one calm place.",
  },
  {
    name: "Daniel Wong",
    role: "Amateur boxer",
    avatar: avatarFor("learner-6"),
    metric: "4.9★",
    metricLabel: "coach rating",
    quote:
      "I tried three platforms before this. The coach quality and the accuracy of the AI match are simply on another level.",
  },
];

export default function LandingPage() {
  const coaches = getCoaches();
  const heroCoach = coaches[0];
  const showcase = [coaches[0], coaches[2], coaches[4]];

  return (
    <>
      {/* ===================== A — Hero ===================== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-grid-faint [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_35%,transparent_80%)]" />
          <div className="absolute -left-32 -top-28 h-[480px] w-[480px] rounded-full bg-indigo-400/25 blur-[130px]" />
          <div className="absolute -right-20 top-0 h-[440px] w-[440px] rounded-full bg-violet-400/20 blur-[130px]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-16">
          <div>
            <Reveal>
              <AIBadge label="AI-Powered Coach Matching" size="md" />
            </Reveal>
            <Reveal delay={0.07}>
              <h1 className="mt-5 text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-on-surface sm:text-[54px] lg:text-[60px]">
                Train smarter with{" "}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  AI-matched coaches.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-5 max-w-xl text-[17px] leading-[1.65] text-on-surface-variant sm:text-[18px]">
                Stop scrolling endless directories. ProCoach AI reads your
                goals, schedule and training style — then matches you with the
                elite coach most likely to get you there.
              </p>
            </Reveal>
            <Reveal delay={0.21}>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/learner/coaches"
                  className="group inline-flex items-center gap-2 rounded-[8px] bg-primary px-6 py-3.5 text-[15px] font-semibold text-on-primary shadow-[0_12px_30px_-8px_rgba(53,37,205,0.55)] transition-all hover:bg-[#2d20b8] hover:shadow-[0_16px_38px_-8px_rgba(53,37,205,0.65)]"
                >
                  <MaterialIcon name="search" size={18} />
                  Find your coach
                  <MaterialIcon
                    name="arrow_forward"
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/coach/dashboard"
                  className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-on-surface transition-colors hover:text-primary"
                >
                  Become a coach
                  <MaterialIcon
                    name="arrow_outward"
                    size={16}
                    className="text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {HERO_AVATARS.map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="h-8 w-8 rounded-full border-2 border-surface-container-lowest object-cover"
                      />
                    ))}
                  </div>
                  <p className="text-[13px] text-on-surface-variant">
                    <span className="font-semibold text-on-surface">
                      2,000+ athletes
                    </span>{" "}
                    matched this season
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <MaterialIcon
                        key={i}
                        name="star"
                        filled
                        size={15}
                        className="text-amber-500"
                      />
                    ))}
                  </span>
                  <span className="font-semibold text-on-surface">4.9</span>
                  average rating
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.34} y={36} className="lg:pl-6">
            <HeroPreview coach={heroCoach} />
          </Reveal>
        </div>
      </section>

      {/* ===================== B — Stat strip ===================== */}
      <section className="border-y border-[var(--color-border-soft)] bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <RevealStagger className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {STATS.map((stat) => (
              <RevealItem
                key={stat.label}
                className="sm:border-l sm:border-[var(--color-border-soft)] sm:pl-6 sm:first:border-l-0 sm:first:pl-0"
              >
                <p
                  className="text-[30px] font-semibold leading-none text-on-surface sm:text-[34px]"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  <AnimatedNumber
                    value={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="mt-2.5 text-[13px] text-on-surface-variant">
                  {stat.label}
                </p>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ===================== C — How it works ===================== */}
      <section className="bg-surface-container-lowest">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.025em] text-on-surface sm:text-[40px]">
              From goal to first session in three steps
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-on-surface-variant">
              No cold outreach. No guesswork. Just an intelligent path from
              where you are to where you want to be.
            </p>
          </Reveal>

          <div className="relative mt-14">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[52px] hidden h-px bg-[var(--color-border-soft)] lg:block"
            />
            <RevealStagger
              className="grid gap-5 lg:grid-cols-3"
              stagger={0.12}
            >
              {STEPS.map((step) => (
                <RevealItem key={step.n}>
                  <div
                    className={cn(
                      "relative h-full overflow-hidden rounded-[18px] border p-6 transition-colors",
                      step.highlight
                        ? "border-primary/25 bg-primary/[0.035]"
                        : "border-[var(--color-border-soft)] bg-surface-container-lowest",
                    )}
                  >
                    <span
                      className="pointer-events-none absolute -right-1 top-1 text-[68px] font-bold leading-none text-on-surface/[0.04]"
                      aria-hidden
                    >
                      {step.n}
                    </span>
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-[14px]",
                        step.highlight
                          ? "bg-gradient-to-br from-primary to-violet-500 text-white shadow-[0_10px_24px_-8px_rgba(53,37,205,0.6)]"
                          : "bg-surface-container-high text-primary",
                      )}
                    >
                      <MaterialIcon name={step.icon} filled size={22} />
                    </div>
                    <h3 className="mt-5 text-[19px] font-semibold text-on-surface">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-on-surface-variant">
                      {step.body}
                    </p>
                    {step.highlight && (
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-surface-container-lowest px-2.5 py-1 text-[12px] font-medium text-primary">
                        <MaterialIcon
                          name="bolt"
                          filled
                          size={13}
                        />
                        Avg. match in 0.8s
                      </div>
                    )}
                  </div>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </div>
      </section>

      {/* ===================== D — AI deep-dive (dark) ===================== */}
      <section className="relative overflow-hidden bg-[#0b0a1e]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_60%_60%_at_70%_40%,#000,transparent)]" />
          <div className="absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full bg-indigo-600/25 blur-[150px]" />
          <div className="absolute -right-10 -top-10 h-[360px] w-[360px] rounded-full bg-violet-600/25 blur-[140px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
              <span className="h-1 w-1 rounded-full bg-indigo-300" />
              The matching engine
            </span>
            <h2 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-[42px]">
              Matching intelligence,
              <br />
              not just another filter.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/60">
              Most marketplaces stop at a search bar. ProCoach AI weighs four
              live signals on every coach — and shows you the reasoning behind
              the score.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {AI_SIGNALS.map((signal) => (
                <div
                  key={signal.title}
                  className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-500/15 text-indigo-300">
                    <MaterialIcon name={signal.icon} filled size={18} />
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold text-white">
                    {signal.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/55">
                    {signal.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} y={36}>
            <MatchExplainer coach={heroCoach} />
          </Reveal>
        </div>
      </section>

      {/* ===================== E — Coach showcase ===================== */}
      <section className="bg-surface-container-lowest">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <Reveal className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-xl">
              <Eyebrow>The marketplace</Eyebrow>
              <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.025em] text-on-surface sm:text-[40px]">
                Coaches worth training with
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-on-surface-variant">
                Every profile is identity-verified and credential-checked
                before it goes live — across 13 disciplines.
              </p>
            </div>
            <Link
              href="/learner/coaches"
              className="group inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-soft)] px-4 py-2.5 text-[14px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
            >
              Browse all coaches
              <MaterialIcon
                name="arrow_forward"
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>

          <RevealStagger
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.1}
          >
            {showcase.map((coach) => (
              <RevealItem key={coach.id}>
                <CoachShowcaseCard coach={coach} />
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ===================== F — Product preview ===================== */}
      <section className="border-y border-[var(--color-border-soft)] bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <Reveal>
            <Eyebrow>Inside the product</Eyebrow>
            <h2 className="mt-4 text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-on-surface sm:text-[40px]">
              Every session, measured and understood
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-on-surface-variant">
              Your dashboard turns training into signal. Track fitness trends,
              streaks and recovery — and let AI flag what to adjust before it
              costs you progress.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Composite fitness score across mobility, strength & conditioning",
                "AI recovery alerts from heart-rate variability trends",
                "One calm view for sessions, messages and progress",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MaterialIcon name="check" size={13} weight={500} />
                  </span>
                  <span className="text-[15px] leading-relaxed text-on-surface">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/learner/dashboard"
              className="group mt-8 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary"
            >
              Explore the dashboard
              <MaterialIcon
                name="arrow_forward"
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>

          <Reveal delay={0.12} y={36}>
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      {/* ===================== G — Testimonials ===================== */}
      <section className="bg-surface-container-lowest">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow center>Proof, not promises</Eyebrow>
            <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.025em] text-on-surface sm:text-[40px]">
              Athletes who trained with intent
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-on-surface-variant">
              Real results from learners across the platform — measured, not
              imagined.
            </p>
          </Reveal>

          <RevealStagger
            className="mt-12 grid gap-5 md:grid-cols-3"
            stagger={0.1}
          >
            {TESTIMONIALS.map((t) => (
              <RevealItem key={t.name}>
                <figure className="flex h-full flex-col rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <MaterialIcon
                          key={i}
                          name="star"
                          filled
                          size={15}
                        />
                      ))}
                    </div>
                    <span className="inline-flex items-baseline gap-1 rounded-[8px] bg-primary/8 px-2.5 py-1">
                      <span className="text-[15px] font-semibold text-primary">
                        {t.metric}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        {t.metricLabel}
                      </span>
                    </span>
                  </div>
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-on-surface">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--color-border-soft)] pt-4">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-[14px] font-semibold text-on-surface">
                        {t.name}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">
                        {t.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ===================== H — Final CTA ===================== */}
      <section className="bg-surface-container-lowest px-6 pb-24 pt-4">
        <Reveal className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#3525cd_0%,#4f46e5_52%,#7c3aed_100%)] px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000,transparent)]" />
              <div className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
            </div>

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
                <MaterialIcon name="auto_awesome" filled size={13} />
                Start free today
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[48px]">
                Your next breakthrough is one match away.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
                Join thousands of athletes training with AI-matched elite
                coaches. No credit card required to start.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/learner/dashboard"
                  className="group inline-flex items-center gap-2 rounded-[8px] bg-white px-6 py-3.5 text-[15px] font-semibold text-primary shadow-[0_14px_36px_-10px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
                >
                  <MaterialIcon name="rocket_launch" filled size={18} />
                  Get started free
                </Link>
                <Link
                  href="/learner/coaches"
                  className="inline-flex items-center gap-2 rounded-[8px] border border-white/30 bg-white/5 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  Browse coaches
                </Link>
              </div>

              <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-3 border-t border-white/15 pt-6 text-[13px] text-white/70">
                <MaterialIcon name="sports" size={16} />
                <span>
                  Are you a coach?{" "}
                  <Link
                    href="/coach/dashboard"
                    className="font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Grow your practice with AI-filled slots →
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/* ----------------------------- sub-components ---------------------------- */

function Eyebrow({
  children,
  center,
}: {
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-primary",
        center && "justify-center",
      )}
    >
      <span className="h-1 w-1 rounded-full bg-primary" />
      {children}
    </span>
  );
}
