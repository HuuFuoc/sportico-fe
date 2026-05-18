import { cn } from "@/lib/utils";

interface MaterialIconProps {
  name: string;
  filled?: boolean;
  size?: number;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

export function MaterialIcon({
  name,
  filled = false,
  size = 20,
  weight = 400,
  grade = 0,
  className,
  ...rest
}: MaterialIconProps) {
  return (
    <span
      aria-hidden={rest["aria-hidden"] ?? true}
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  );
}
