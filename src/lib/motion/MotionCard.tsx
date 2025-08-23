"use client";

import { motion } from "framer-motion";
import { motion as tokens, prefersReducedMotion } from "./tokens";
import { isAnimationsEnabled } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import { ReactNode, useMemo } from "react";

export type MotionCardProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  visible?: boolean;
  size?: "sm" | "md" | "lg";
};

export function MotionCard({
  children,
  className,
  delayMs = 0,
  visible = true,
  size = "md",
}: MotionCardProps) {
  const reduced = prefersReducedMotion();
  const enabled = isAnimationsEnabled();
  const shouldAnimate = enabled && !reduced;

  const sizeClasses = useMemo(
    () => ({
      sm: "w-10 h-14",
      md: "w-14 h-20",
      lg: "w-16 h-24",
    })[size],
    [size]
  );

  if (!shouldAnimate) {
    return <div className={cn(sizeClasses, className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(sizeClasses, className)}
      initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.98, rotate: 0 }}
      transition={{
        duration: tokens.duration.base / 1000,
        ease: tokens.ease.decelerate,
        delay: (delayMs || 0) / 1000,
      }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}