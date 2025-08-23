"use client";

import { motion } from "@motionone/react";
import { useMemo } from "react";
import { motionDurations, motionEasingFns } from "./motionTokens";
import { useMotionSettings } from "./reducedMotion";

export type CardPhase = "idle" | "deal" | "flip" | "reveal" | "exit";

type MotionValue = string | number | (string | number)[];

type AnimateTarget = {
  opacity?: MotionValue;
  transform?: MotionValue;
  transformStyle?: MotionValue;
  filter?: MotionValue;
};

const MotionDiv = motion.div as unknown as React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    children?: React.ReactNode;
  }
>;

export function AnimatedCard({
  children,
  phase = "idle",
  delayMs = 0,
  from,
  to,
  className,
}: {
  children: React.ReactNode;
  phase?: CardPhase;
  delayMs?: number;
  from?: { x?: number; y?: number; rotate?: number; scale?: number };
  to?: { x?: number; y?: number; rotate?: number; scale?: number };
  className?: string;
}) {
  const { enabled, reduced } = useMotionSettings();
  const shouldAnimate = enabled && !reduced;

  const initial: AnimateTarget | undefined = useMemo(() => {
    if (!shouldAnimate) return undefined;
    if (phase === "deal" && from) {
      return {
        transform: `translate(${from.x ?? 0}px, ${from.y ?? 0}px) rotate(${from.rotate ?? 0}deg) scale(${from.scale ?? 0.6})`,
        opacity: 0,
      };
    }
    if (phase === "flip") {
      return { transform: "rotateY(180deg)", transformStyle: "preserve-3d" };
    }
    return undefined;
  }, [from, phase, shouldAnimate]);

  const animate: AnimateTarget | undefined = useMemo(() => {
    if (!shouldAnimate) return undefined;
    switch (phase) {
      case "deal":
        return {
          opacity: [0, 1],
          transform: [
            `translate(${from?.x ?? 0}px, ${from?.y ?? 0}px) rotate(${from?.rotate ?? 0}deg) scale(${from?.scale ?? 0.6})`,
            `translate(${to?.x ?? 0}px, ${to?.y ?? 0}px) rotate(${to?.rotate ?? 0}deg) scale(${to?.scale ?? 1})`,
          ],
        };
      case "flip":
      case "reveal":
        return {
          transform: ["rotateY(180deg)", "rotateY(0deg)"],
        };
      case "exit":
        return {
          opacity: [1, 0],
          transform: [
            `translate(0px, 0px) rotate(0deg) scale(1)`,
            `translate(${to?.x ?? 0}px, ${to?.y ?? -40}px) rotate(${to?.rotate ?? -10}deg) scale(${to?.scale ?? 0.85})`,
          ],
        };
      default:
        return undefined;
    }
  }, [from, to, phase, shouldAnimate]);

  const transition = useMemo(() => {
    if (!shouldAnimate) return { duration: 0 };
    const base =
      phase === "deal"
        ? motionDurations.base
        : phase === "flip" || phase === "reveal"
        ? 300
        : phase === "exit"
        ? 250
        : motionDurations.fast;
    return { duration: base / 1000, easing: motionEasingFns.standard, delay: delayMs / 1000 };
  }, [phase, delayMs, shouldAnimate]);

  return (
    <MotionDiv initial={initial} animate={animate} transition={transition} className={className} style={{ backfaceVisibility: "hidden" }}>
      {children}
    </MotionDiv>
  );
}