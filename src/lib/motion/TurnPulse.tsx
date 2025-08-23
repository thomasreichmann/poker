"use client";

import { motion } from "framer-motion";
import { motion as tokens, prefersReducedMotion } from "./tokens";
import { isAnimationsEnabled } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

type TurnPulseProps = {
  active: boolean;
  className?: string;
  cycleMs?: number;
};

export function TurnPulse({ active, className, cycleMs = 1200 }: TurnPulseProps) {
  const reduced = prefersReducedMotion();
  const enabled = isAnimationsEnabled();
  const shouldAnimate = enabled && !reduced && active;

  if (!shouldAnimate) {
    return <div className={cn("ring-2 ring-emerald-400/60 rounded-md", className)} />;
  }

  return (
    <motion.div
      className={cn("rounded-md", className)}
      initial={{ boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)" }}
      animate={{ boxShadow: [
        "0 0 0 0 rgba(16, 185, 129, 0.7)",
        "0 0 0 8px rgba(16, 185, 129, 0.0)",
      ]}}
      transition={{
        duration: (cycleMs || 1200) / 1000,
        ease: tokens.ease.standard,
        repeat: Infinity,
      }}
      style={{ willChange: "box-shadow" }}
    />
  );
}