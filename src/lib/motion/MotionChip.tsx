"use client";

import { motion } from "framer-motion";
import { prefersReducedMotion, motion as tokens } from "./tokens";
import { isAnimationsEnabled } from "@/lib/featureFlags";
import { CSSProperties } from "react";

export type MotionChipProps = {
  x: number;
  y: number;
  toX: number;
  toY: number;
  durationMs?: number;
  delayMs?: number;
  color?: string;
  onComplete?: () => void;
};

export function MotionChip({
  x,
  y,
  toX,
  toY,
  durationMs = 300,
  delayMs = 0,
  color = "#eab308", // amber-500
  onComplete,
}: MotionChipProps) {
  const reduced = prefersReducedMotion();
  const enabled = isAnimationsEnabled();
  const shouldAnimate = enabled && !reduced;

  const baseStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 9999,
    background: color,
    border: "2px solid rgba(255,255,255,0.85)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    willChange: "transform, opacity",
  };

  if (!shouldAnimate) {
    return <div style={{ ...baseStyle, transform: `translate(${toX}px, ${toY}px)` }} />;
  }

  return (
    <motion.div
      style={{ ...baseStyle, transform: `translate(${x}px, ${y}px)` }}
      initial={{ opacity: 1, x, y }}
      animate={{ opacity: 1, x: toX, y: toY }}
      transition={{
        duration: (durationMs || tokens.duration.base) / 1000,
        ease: tokens.ease.decelerate,
        delay: (delayMs || 0) / 1000,
      }}
      onAnimationComplete={onComplete}
    />
  );
}