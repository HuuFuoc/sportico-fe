/**
 * Tiny inline chart for metric cards — pure SVG, no dependencies.
 */
export function Sparkline({
  data,
  variant = "line",
  color = "#4f46e5",
  fill = false,
  height = 38,
  className,
}: {
  data: number[];
  variant?: "line" | "bar";
  color?: string;
  fill?: boolean;
  height?: number;
  className?: string;
}) {
  const W = 100;
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  if (variant === "bar") {
    const slot = W / data.length;
    const bw = slot * 0.6;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={className}
        aria-hidden
      >
        {data.map((v, i) => {
          const h = Math.max(3, ((v - min) / span) * (H - 4));
          return (
            <rect
              key={i}
              x={i * slot + (slot - bw) / 2}
              y={H - h}
              width={bw}
              height={h}
              rx={1.6}
              fill={color}
            />
          );
        })}
      </svg>
    );
  }

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 3 - ((v - min) / span) * (H - 6),
  }));
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {fill && <path d={area} fill={color} fillOpacity={0.12} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
