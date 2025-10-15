"use client";

import { useReplaySignal } from "@/lib/dev/replay";
import { PlayingCard as PlayingCardType } from "@/lib/gameTypes";
import { getCardColor, getCardSymbol } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface PlayingCardProps {
  card: PlayingCardType;
  size?: "sm" | "md" | "lg";
  isVisible?: boolean;
  isAnimating?: boolean;
  animationDelay?: number;
  className?: string;
  replaySeed?: number;
  highlighted?: boolean;
}

export function PlayingCard({
  card,
  size = "md",
  isVisible = true,
  animationDelay = 0,
  className,
  highlighted = false,
}: PlayingCardProps) {
  const sizeClasses = {
    sm: "w-10 h-14 text-xs",
    md: "w-14 h-20 text-sm",
    lg: "w-16 h-24 text-base",
  };

  const baseClasses = cn(
    "rounded border flex flex-col items-center justify-center font-bold shadow-lg",
    sizeClasses[size],
    isVisible ? "bg-white border-gray-300" : "bg-blue-900 border-blue-700",
    className
  );

  const replayAt = useReplaySignal();
  const motionKey = `${card.id}:${replayAt}:${animationDelay}`;

  return (
    <motion.div
      key={motionKey}
      className={cn(baseClasses, "relative overflow-hidden")}
      initial={{ opacity: 0, y: 10, rotate: -1.5, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: highlighted ? -6 : 0,
        rotate: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.33,
        ease: "easeInOut",
        delay: Math.max(0, animationDelay) / 1000,
      }}
      style={
        highlighted
          ? { filter: "drop-shadow(0 0 10px rgba(245, 158, 11, 0.45))" }
          : undefined
      }
    >
      {highlighted && (
        <div
          className="absolute inset-0 rounded pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.10) 40%, rgba(245, 158, 11, 0) 75%)",
            mixBlendMode: "screen",
          }}
        />
      )}
      {isVisible ? (
        <>
          <div className={cn(getCardColor(card.suit), "text-base")}>
            {card.rank}
          </div>
          <div className={cn(getCardColor(card.suit), "text-lg")}>
            {getCardSymbol(card.suit)}
          </div>
        </>
      ) : (
        <div className="text-blue-300">?</div>
      )}
    </motion.div>
  );
}
