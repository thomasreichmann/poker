"use client";

import { motion } from "@motionone/react";
import { useEffect, useRef } from "react";
import { motionDurations, motionEasingFns } from "./motionTokens";
import { useMotionSettings } from "./reducedMotion";

const MotionDiv = motion.div as unknown as React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    children?: React.ReactNode;
  }
>;

export function AnimatedPot({ value, children }: { value: number; children: React.ReactNode }) {
  const prev = useRef<number>(value);
  const { enabled, reduced } = useMotionSettings();
  const shouldAnimate = enabled && !reduced;

  useEffect(() => {
    prev.current = value;
  }, [value]);

  const increased = value > prev.current;

  return (
    <MotionDiv
      initial={false}
      animate={
        shouldAnimate && increased
          ? { scale: [1, 1.08, 1], filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] }
          : { scale: 1, filter: "brightness(1)" }
      }
      transition={{ duration: motionDurations.fast / 1000, easing: motionEasingFns.standard }}
    >
      {children}
    </MotionDiv>
  );
}