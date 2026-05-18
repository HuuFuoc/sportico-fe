import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-10 text-center">
        <p className="text-label-caps uppercase tracking-[0.08em] text-primary mb-3">
          Sportico × ProCoach AI
        </p>
        <h1 className="text-h1 text-on-surface mb-3">Smart Coach Hub</h1>
        <p className="text-body-base text-on-surface-variant mb-8 max-w-lg mx-auto">
          UI scaffolding is live. Pick a role workspace below to preview the
          dashboard for that user.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RoleLink
            href="/learner/dashboard"
            title="Learner"
            subtitle="Find coaches & track progress"
          />
          <RoleLink
            href="/coach/dashboard"
            title="Coach"
            subtitle="Manage learners & schedule"
          />
          <RoleLink
            href="/admin/dashboard"
            title="Admin"
            subtitle="Platform analytics & moderation"
          />
        </div>
        <p className="text-body-sm text-on-surface-variant mt-8">
          Tip: in dev mode the bottom-left{" "}
          <span className="text-primary">Role Switcher</span> lets you change
          role from any page.
        </p>
      </div>
    </div>
  );
}

function RoleLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-1 rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest px-4 py-4 text-left transition-colors hover:bg-surface-container-low hover:border-primary"
    >
      <span className="text-h3 text-on-surface group-hover:text-primary transition-colors">
        {title}
      </span>
      <span className="text-body-sm text-on-surface-variant">{subtitle}</span>
    </Link>
  );
}
