"use client";

import { motion } from "@motionone/react";
import { motionEasingFns, motionZ } from "./motionTokens";
import { useMotionSettings } from "./reducedMotion";

const MotionDiv = motion.div as unknown as React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    className?: string;
    style?: React.CSSProperties;
  }
>;

export function TurnHalo({ active }: { active: boolean }) {
  const { enabled, reduced } = useMotionSettings();
  const shouldAnimate = enabled && !reduced;

  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ zIndex: motionZ.halo }}
      aria-hidden
    >
      <MotionDiv
        initial={{ opacity: 0.0, scale: 0.95 }}
        animate={
          shouldAnimate
            ? { opacity: [0.2, 0.6, 0.2], scale: [0.95, 1.05, 0.95] }
            : { opacity: 0.3, scale: 1 }
        }
        transition={{ duration: shouldAnimate ? 2.0 : 0, easing: motionEasingFns.standard, repeat: shouldAnimate ? Infinity : 0 }}
        className="rounded-[18px] border-2 border-emerald-400/60 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
        style={{ position: "absolute", inset: -4 }}
      />
    </div>
  );
}