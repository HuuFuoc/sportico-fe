import { cn } from "@/lib/utils";

interface ClassicLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ClassicLoader({
  className,
  size = "md",
}: ClassicLoaderProps) {
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-4",
  }[size];

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClass,
        className,
      )}
      aria-label="Đang tải"
      role="status"
    />
  );
}
