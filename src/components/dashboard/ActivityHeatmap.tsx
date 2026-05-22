import { cn } from "@/lib/utils";

const LEVELS = [
  "bg-surface-container-high",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

const LEVEL_LABEL = ["Rest", "Light", "Moderate", "Solid", "Peak"];

/**
 * GitHub-style training intensity grid — 12 weeks × 7 days.
 */
export function ActivityHeatmap({ weeks }: { weeks: number[][] }) {
  return (
    <div>
      <div className="flex gap-[5px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[5px]">
            {week.map((lvl, di) => (
              <div
                key={di}
                title={LEVEL_LABEL[lvl]}
                className={cn(
                  "h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-[1.35]",
                  LEVELS[lvl],
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>12 weeks ago</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {LEVELS.map((c, i) => (
            <span key={i} className={cn("h-[10px] w-[10px] rounded-[2px]", c)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
