"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CoachCard } from "@/components/common/CoachCard";
import { AIBadge } from "@/components/common/AIBadge";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { AVAILABLE_SPORTS } from "@/lib/constants";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ErrorState, LoadingState } from "@/components/common/AsyncStates";
import type { Sport } from "@/types";

const GOALS = [
  { id: "compete", label: "Thi đấu", icon: "emoji_events" },
  { id: "general", label: "Thể lực tổng quát", icon: "fitness_center" },
  { id: "weight", label: "Giảm cân", icon: "monitor_weight" },
  { id: "skill", label: "Học kỹ năng mới", icon: "school" },
  { id: "rehab", label: "Phục hồi / Linh hoạt", icon: "healing" },
  { id: "stress", label: "Giảm căng thẳng", icon: "self_improvement" },
];

const STYLES = [
  { id: "data", label: "Dựa trên số liệu", icon: "monitoring" },
  { id: "motivational", label: "Năng động, nhiệt huyết", icon: "bolt" },
  { id: "patient", label: "Kiên nhẫn & nhẹ nhàng", icon: "spa" },
  { id: "technical", label: "Kỹ thuật chuyên sâu", icon: "precision_manufacturing" },
];

const STEPS = ["Môn thể thao", "Mục tiêu", "Phong cách", "Ngân sách", "Kết quả"] as const;
type StepName = (typeof STEPS)[number];

export default function PublicAIMatchPage() {
  const {
    data: coachesData,
    loading: coachesLoading,
    error: coachesError,
    refetch,
  } = useApiResource(() => api.fetchCoaches(), []);
  const allCoaches = useMemo(() => coachesData ?? [], [coachesData]);

  const [step, setStep] = useState<StepName>("Môn thể thao");
  const [sport, setSport] = useState<Sport | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [budget, setBudget] = useState(80);

  const stepIdx = STEPS.indexOf(step);

  const matches = useMemo(() => {
    return allCoaches
      .filter((c) => (sport ? c.sport === sport : true))
      .filter((c) => c.hourlyRate <= budget)
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
      .slice(0, 6);
  }, [allCoaches, sport, budget]);

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };
  const canNext =
    (step === "Môn thể thao" && sport) ||
    (step === "Mục tiêu" && goal) ||
    (step === "Phong cách" && style) ||
    (step === "Ngân sách" && budget > 0);

  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Hero */}
          <header className="text-center pt-2 pb-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-3">
              <MaterialIcon name="auto_awesome" filled size={14} />
              <span className="text-[11px] uppercase tracking-wider font-medium">
                AI Coach Matching
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[38px] font-bold tracking-tight text-on-surface leading-[1.1]">
              Tìm huấn luyện viên hoàn hảo trong 5 bước
            </h1>
            <p className="text-[15px] text-on-surface-variant mt-2 max-w-xl mx-auto leading-relaxed">
              AI của chúng tôi phân tích mục tiêu, phong cách tập luyện và ngân
              sách để ghép bạn với huấn luyện viên phù hợp nhất.
            </p>
          </header>

          {/* Stepper */}
          <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {STEPS.map((s, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={s} className="flex-1 flex items-center">
                    <button
                      onClick={() => i <= stepIdx && setStep(s)}
                      className={cn(
                        "flex items-center gap-2 text-[13px] transition-colors",
                        done
                          ? "text-primary"
                          : active
                            ? "text-primary font-medium"
                            : "text-on-surface-variant",
                      )}
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium",
                          done
                            ? "bg-primary text-on-primary"
                            : active
                              ? "bg-primary/10 text-primary border border-primary"
                              : "bg-surface-container-high text-on-surface-variant",
                        )}
                      >
                        {done ? (
                          <MaterialIcon name="check" size={14} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="hidden sm:inline">{s}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <span
                        className={cn(
                          "flex-1 h-[1px] mx-2",
                          done ? "bg-primary" : "bg-[var(--color-border-soft)]",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[12px] p-6">
            {step === "Môn thể thao" && (
              <StepBody
                title="Bạn muốn tập môn thể thao nào?"
                hint="Chọn bộ môn phù hợp với mục tiêu của bạn."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {AVAILABLE_SPORTS.map((s) => (
                    <SelectChip
                      key={s}
                      label={s}
                      active={sport === s}
                      onClick={() => setSport(s)}
                    />
                  ))}
                </div>
              </StepBody>
            )}

            {step === "Mục tiêu" && (
              <StepBody
                title="Mục tiêu chính của bạn là gì?"
                hint="Chúng tôi sẽ ưu tiên các HLV có thành tích tốt trong lĩnh vực này."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOALS.map((g) => (
                    <SelectChip
                      key={g.id}
                      label={g.label}
                      icon={g.icon}
                      active={goal === g.id}
                      onClick={() => setGoal(g.id)}
                    />
                  ))}
                </div>
              </StepBody>
            )}

            {step === "Phong cách" && (
              <StepBody
                title="Phong cách huấn luyện bạn thích?"
                hint="Giúp chúng tôi chọn HLV có tính cách phù hợp với bạn."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLES.map((s) => (
                    <SelectChip
                      key={s.id}
                      label={s.label}
                      icon={s.icon}
                      active={style === s.id}
                      onClick={() => setStyle(s.id)}
                    />
                  ))}
                </div>
              </StepBody>
            )}

            {step === "Ngân sách" && (
              <StepBody
                title="Ngân sách theo giờ của bạn?"
                hint="Chúng tôi sẽ giới hạn kết quả trong phạm vi ngân sách."
              >
                <div className="max-w-md">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[36px] font-bold text-primary leading-none">
                      ${budget}
                    </span>
                    <span className="text-[13px] text-on-surface-variant">
                      mỗi giờ
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={150}
                    step={5}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[13px] text-on-surface-variant mt-1">
                    <span>$30</span>
                    <span>$150</span>
                  </div>
                </div>
              </StepBody>
            )}

            {step === "Kết quả" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-primary mb-1">
                      <AIBadge label="Kết quả ghép nối" />
                    </div>
                    <h2 className="text-[22px] font-bold tracking-tight">
                      {matches.length} huấn luyện viên phù hợp với bạn
                    </h2>
                    <p className="text-[14px] text-on-surface-variant mt-1">
                      Sắp xếp theo điểm tương thích với các lựa chọn của bạn.
                    </p>
                  </div>
                  <Link
                    href="/coaches"
                    className="text-[13px] text-primary hover:underline whitespace-nowrap"
                  >
                    Xem tất cả HLV →
                  </Link>
                </div>
                {coachesLoading ? (
                  <LoadingState label="Đang tìm huấn luyện viên phù hợp…" />
                ) : coachesError ? (
                  <ErrorState onRetry={refetch} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.map((c) => (
                      <CoachCard key={c.id} coach={c} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border-soft)]">
              <button
                onClick={back}
                disabled={stepIdx === 0}
                className="px-4 py-2 text-[14px] text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Quay lại
              </button>
              {step !== "Kết quả" ? (
                <button
                  onClick={next}
                  disabled={!canNext}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-[6px] text-[14px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2d20b8] transition-colors"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStep("Môn thể thao");
                    setSport(null);
                    setGoal(null);
                    setStyle(null);
                    setBudget(80);
                  }}
                  className="px-5 py-2.5 border border-[var(--color-border-soft)] rounded-[6px] text-[14px] hover:bg-surface-container-low"
                >
                  Làm lại
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StepBody({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[20px] font-bold tracking-tight mb-1">{title}</h2>
      <p className="text-[14px] text-on-surface-variant mb-5">{hint}</p>
      {children}
    </div>
  );
}

function SelectChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-[6px] border transition-colors text-left",
        active
          ? "border-primary bg-primary/5 text-primary font-medium"
          : "border-[var(--color-border-soft)] hover:border-primary text-on-surface",
      )}
    >
      {icon && <MaterialIcon name={icon} size={18} />}
      <span className="text-[14px]">{label}</span>
      {active && (
        <MaterialIcon
          name="check_circle"
          filled
          size={16}
          className="ml-auto text-primary"
        />
      )}
    </button>
  );
}
