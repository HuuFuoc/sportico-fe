import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Find Coaches", href: "/learner/coaches" },
      { label: "AI Match", href: "/learner/ai-match" },
      { label: "How it Works", href: "/#how-it-works" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    title: "For Coaches",
    links: [
      { label: "Become a Coach", href: "/coach/dashboard" },
      { label: "Coach Earnings", href: "/coach/earnings" },
      { label: "Resources", href: "#" },
      { label: "Success Stories", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: "alternate_email", label: "X / Twitter" },
  { icon: "photo_camera", label: "Instagram" },
  { icon: "smart_display", label: "YouTube" },
  { icon: "forum", label: "Community" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Top grid: brand + 4 link columns */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary text-on-primary">
                <MaterialIcon name="rocket_launch" filled size={18} weight={500} />
              </div>
              <span className="text-h3 text-primary">ProCoach AI</span>
            </Link>
            <p className="mt-3 max-w-[260px] text-body-sm text-on-surface-variant">
              AI-matched coaching that connects athletes with elite coaches —
              built for measurable performance gains.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-on-surface-variant">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-on-surface-variant transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row: logo + copyright + social */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border-soft)] pt-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary text-on-primary">
              <MaterialIcon name="rocket_launch" filled size={14} weight={500} />
            </div>
            <p className="text-body-sm text-on-surface-variant">
              © 2026 ProCoach AI. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <MaterialIcon name={social.icon} size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
