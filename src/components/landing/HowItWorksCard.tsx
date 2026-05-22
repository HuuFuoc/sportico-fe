import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { AIBadge } from "@/components/common/AIBadge";

interface HowItWorksCardProps {
  step: number;
  icon: string;
  title: string;
  body: string;
  /** Marks this step as an AI-driven feature (adds an indigo AI badge). */
  ai?: boolean;
}

export function HowItWorksCard({
  step,
  icon,
  title,
  body,
  ai = false,
}: HowItWorksCardProps) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-4 transition-colors hover:border-primary">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          <MaterialIcon name={icon} filled size={22} weight={500} />
        </div>
        <span
          className="text-[40px] font-medium leading-none text-surface-container-highest"
          style={{ letterSpacing: "-0.02em" }}
        >
          {String(step).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-h3 text-on-surface">{title}</h3>
        {ai && <AIBadge label="AI" />}
      </div>
      <p className="mt-1 text-body-base text-on-surface-variant">{body}</p>
    </div>
  );
}
