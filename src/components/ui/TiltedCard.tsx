"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface TiltedCardProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  /** Max rotation degrees. Default 12. */
  maxTilt?: number;
  /** Scale factor on hover. Default 1.025. */
  scaleOnHover?: number;
}

/**
 * 3D-tilt card with spring physics.
 *
 * Tracks the cursor inside the container and tilts toward it using `motion/react`
 * springs. Respects `prefers-reduced-motion` — falls back to a plain hover shadow
 * with no transform. Touch devices get the hover scale only (no tilt).
 *
 * Usage:
 *   <TiltedCard containerClassName="..." className="rounded-[16px] overflow-hidden">
 *     {card content}
 *   </TiltedCard>
 */
export function TiltedCard({
  children,
  className,
  containerClassName,
  maxTilt = 12,
  scaleOnHover = 1.025,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();

  const rotateX = useSpring(0, { stiffness: 320, damping: 32 });
  const rotateY = useSpring(0, { stiffness: 320, damping: 32 });
  const scale = useSpring(1, { stiffness: 260, damping: 22 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    rotateX.set(-y * maxTilt);
    rotateY.set(x * maxTilt);
  };

  const onMouseEnter = () => {
    if (!shouldReduce) scale.set(scaleOnHover);
  };

  const onMouseLeave = () => {
    if (!shouldReduce) {
      rotateX.set(0);
      rotateY.set(0);
      scale.set(1);
    }
  };

  if (shouldReduce) {
    return (
      <div className={containerClassName}>
        <div className={cn("transition-shadow duration-200 hover:shadow-lg", className)}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={containerClassName}
      style={{ perspective: "1000px" }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}
