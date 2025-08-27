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
}

export function PlayingCard({
  card,
  size = "md",
  isVisible = true,
  isAnimating = false,
  animationDelay = 0,
  className,
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

  return (
    <motion.div
      className={baseClasses}
      initial={{ opacity: 0, scale: 0.8, rotate: -8, y: 8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, rotate: 6, y: 8 }}
      whileHover={{ y: -4, rotate: 2 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, delay: animationDelay / 1000 }}
      layout
    >
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
