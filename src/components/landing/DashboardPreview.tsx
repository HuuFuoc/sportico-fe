import { MaterialIcon } from "@/components/icons/MaterialIcon";

/** 8-week composite fitness score — drives the preview chart. */
const TREND = [60, 63, 65, 68, 70, 73, 75, 78];

const TILES = [
  { icon: "timer", value: "24h", label: "Đã tập" },
  { icon: "local_fire_department", value: "8 ngày", label: "Chuỗi" },
  { icon: "auto_awesome", value: "98%", label: "Tỉ lệ khớp" },
];

/**
 * In-product preview — a glass "browser" frame showing the learner progress
 * dashboard, so the marketing page makes the real product believable.
 */
export function DashboardPreview() {
  const W = 560;
  const H = 188;
  const PADX = 4;
  const PADTOP = 16;
  const PADBOT = 8;
  const min = 54;
  const max = 82;

  const pts = TREND.map((v, i) => ({
    x: PADX + (i * (W - PADX * 2)) / (TREND.length - 1),
    y: PADTOP + ((max - v) / (max - min)) * (H - PADTOP - PADBOT),
  }));
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${H - PADBOT} L${pts[0].x.toFixed(1)} ${H - PADBOT} Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-surface-container-lowest shadow-[0_40px_90px_-40px_rgba(53,37,205,0.45)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-soft)] bg-surface-container-low/70 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e4574c]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b53d]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#54b75b]" />
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-[6px] bg-surface-container-lowest px-3 py-1 text-[11px] font-medium text-on-surface-variant">
          <MaterialIcon name="lock" size={11} />
          procoach.ai/progress
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* chart header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] font-medium text-on-surface-variant">
              Xu hướng điểm thể lực
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className="text-[32px] font-semibold leading-none text-on-surface"
                style={{ letterSpacing: "-0.02em" }}
              >
                78
              </span>
              <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#1f7a4d]">
                <MaterialIcon name="trending_up" size={13} />
                +12% so chu kỳ trước
              </span>
            </p>
          </div>
          <span className="hidden rounded-full border border-[var(--color-border-soft)] px-2.5 py-1 text-[11px] font-medium text-on-surface-variant sm:inline-block">
            8 tuần qua
          </span>
        </div>

        {/* svg chart */}
        <div className="mt-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line
                key={g}
                x1="0"
                x2={W}
                y1={H * g}
                y2={H * g}
                stroke="#e8e8e5"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            ))}
            <path d={area} fill="url(#dashArea)" />
            <path
              d={line}
              fill="none"
              stroke="#3525cd"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={last.x} cy={last.y} r="5" fill="#3525cd" />
            <circle cx={last.x} cy={last.y} r="9" fill="#3525cd" opacity="0.18" />
          </svg>
        </div>

        {/* stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TILES.map((t) => (
            <div
              key={t.label}
              className="rounded-[12px] border border-[var(--color-border-soft)] bg-surface-container-low/50 p-3"
            >
              <MaterialIcon
                name={t.icon}
                filled
                size={16}
                className="text-primary"
              />
              <p className="mt-2 text-[17px] font-semibold leading-none text-on-surface">
                {t.value}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {t.label}
              </p>
            </div>
          ))}
        </div>

        {/* ai insight */}
        <div className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-primary/15 bg-primary/[0.05] p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-primary text-white">
            <MaterialIcon name="auto_awesome" filled size={14} />
          </div>
          <p className="text-[12px] leading-relaxed text-on-surface">
            <span className="font-semibold text-primary">AI nhận xét — </span>
            HRV của bạn giảm 6%. Hãy nghỉ ngơi nhẹ nhàng trước chu kỳ sức mạnh
            tiếp theo để bảo vệ chuỗi tập của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}
