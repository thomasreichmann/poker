import { PlayingCard as PlayingCardType } from "@/lib/gameTypes";
import { getCardColor, getCardSymbol } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import { useMotion } from "@/lib/motion/provider";

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
  const { settings, getAnimAttrs } = useMotion();
  const sizeClasses = {
    sm: "w-10 h-14 text-xs",
    md: "w-14 h-20 text-sm",
    lg: "w-16 h-24 text-base",
  };

  const baseClasses = cn(
    "rounded border flex flex-col items-center justify-center font-bold shadow-lg transform transition-all duration-500",
    sizeClasses[size],
    settings.enabled && isAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0",
    isVisible ? "bg-white border-gray-300" : "bg-blue-900 border-blue-700",
    className
  );

  return (
    <div
      className={baseClasses}
      {...getAnimAttrs("card", { id: card.id, role: isVisible ? "face" : "back", sequenceIndex: 0, totalInSequence: 1, delayMs: animationDelay })}
      style={{
        animationDelay: `${Math.max(0, Math.floor(animationDelay / (settings.speedMultiplier || 1)))}ms`,
        outline: settings.debugOutlines ? "1px dashed rgba(16,185,129,0.6)" : undefined,
        outlineOffset: settings.debugOutlines ? 2 : undefined,
      }}
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
    </div>
  );
}
