import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** Inner padding around chart body; defaults to 16. */
  padding?: number;
}

export function ChartCard({
  title,
  subtitle,
  action,
  className,
  children,
  padding = 16,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px]",
        className,
      )}
    >
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-h3 text-on-surface">{title}</h3>
          {subtitle && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div style={{ padding }}>{children}</div>
    </div>
  );
}
