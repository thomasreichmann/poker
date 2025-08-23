import { PlayingCard as PlayingCardType } from "@/lib/gameTypes";
import { getCardColor, getCardSymbol } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/lib/motion/MotionCard";

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
    <MotionCard
      size={size}
      delayMs={animationDelay}
      visible={!isAnimating}
      className={baseClasses}
    >
      {isVisible ? (
        <>
          <div className={cn(getCardColor(card.suit), "text-base")}>{card.rank}</div>
          <div className={cn(getCardColor(card.suit), "text-lg")}>{getCardSymbol(card.suit)}</div>
        </>
      ) : (
        <div className="text-blue-300">?</div>
      )}
    </MotionCard>
  );
}
