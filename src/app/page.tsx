import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

const ROLE_TILES = [
  {
    href: "/learner/dashboard",
    title: "Learner",
    subtitle: "Find coaches & track progress",
    icon: "school",
    bullets: [
      "AI-matched coach recommendations",
      "Weekly schedule & session tracking",
      "Personalized progress dashboard",
    ],
  },
  {
    href: "/coach/dashboard",
    title: "Coach",
    subtitle: "Manage learners & schedule",
    icon: "sports",
    bullets: [
      "Today's schedule with quick-join",
      "Earnings & payout analytics",
      "Edit public profile + pricing tiers",
    ],
  },
  {
    href: "/admin/dashboard",
    title: "Admin",
    subtitle: "Platform analytics & moderation",
    icon: "admin_panel_settings",
    bullets: [
      "30-day DAU + revenue trends",
      "Coach verification queue",
      "Tune matching algorithm weights",
    ],
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: "auto_awesome",
    title: "AI-first throughout",
    body: "Every role has insight banners, AI matching, and the Ask AI assistant panel.",
  },
  {
    icon: "design_services",
    title: "Minimalist design system",
    body: "Strict palette, flat surfaces with 1px borders, single indigo accent for CTAs.",
  },
  {
    icon: "swap_horiz",
    title: "Mock data, real-shape API",
    body: "All UI consumes lib/api.ts — swap mocks for fetch() when backend is ready.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border-soft)] bg-surface-container-lowest">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-primary text-on-primary flex items-center justify-center">
              <MaterialIcon name="rocket_launch" filled size={18} weight={500} />
            </div>
            <div>
              <p className="text-h3 text-primary leading-none">ProCoach AI</p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-on-surface-variant mt-0.5">
                Elite Performance
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded hover:bg-surface-container-low transition-colors"
            >
              Docs
            </a>
            <Link
              href="/learner/dashboard"
              className="text-body-sm font-medium bg-primary text-on-primary px-3 py-1.5 rounded-[6px] hover:bg-[#2d20b8] transition-colors"
            >
              Launch app
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
            <MaterialIcon name="auto_awesome" filled size={14} />
            <span className="text-[11px] uppercase tracking-wider font-medium">
              Sportico × ProCoach AI · UI Preview
            </span>
          </span>
          <h1
            className="text-[40px] sm:text-[52px] font-medium text-on-surface leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Smart Coach Hub
          </h1>
          <p className="text-body-base sm:text-h3 text-on-surface-variant mt-3 max-w-2xl mx-auto">
            UI scaffolding for an AI-powered coaching platform. Pick a role
            below to explore the dashboard — every page is mocked but wired up.
          </p>
        </section>

        {/* Role tiles */}
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {ROLE_TILES.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6 transition-colors hover:border-primary"
              >
                <div className="w-10 h-10 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <MaterialIcon name={tile.icon} filled size={22} />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">
                  {tile.subtitle}
                </p>
                <h2 className="text-h2 text-on-surface group-hover:text-primary transition-colors mb-3">
                  {tile.title}
                </h2>
                <ul className="space-y-1.5">
                  {tile.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-body-base text-on-surface-variant"
                    >
                      <MaterialIcon
                        name="check"
                        size={16}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 inline-flex items-center gap-1 text-body-sm text-primary font-medium">
                  Open dashboard
                  <MaterialIcon
                    name="arrow_forward"
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Feature highlights */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURE_HIGHLIGHTS.map((f) => (
              <div
                key={f.title}
                className="bg-surface-container-low border border-[var(--color-border-soft)] rounded-[10px] p-5"
              >
                <MaterialIcon
                  name={f.icon}
                  filled
                  size={20}
                  className="text-primary mb-2"
                />
                <h3 className="text-h3 mb-1">{f.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <p>
            Built with Next.js, Tailwind v4, recharts. Tip: dev mode shows a{" "}
            <span className="text-primary">Role Switcher</span> bottom-left.
          </p>
          <p>© 2026 Sportico — Smart Coach Hub UI.</p>
        </div>
      </footer>
    </div>
  );
}
