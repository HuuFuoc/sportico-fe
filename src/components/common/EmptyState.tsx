import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 bg-surface-container-lowest border border-dashed border-[var(--color-border-soft)] rounded-[10px]",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-[10px] bg-surface-container-high flex items-center justify-center mb-3">
        <MaterialIcon
          name={icon}
          size={24}
          weight={400}
          className="text-on-surface-variant"
        />
      </div>
      <h4 className="text-h3 text-on-surface mb-1">{title}</h4>
      {description && (
        <p className="text-body-sm text-on-surface-variant max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
