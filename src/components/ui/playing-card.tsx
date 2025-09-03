import { PlayingCard as PlayingCardType } from "@/lib/gameTypes";
import { getCardColor, getCardSymbol } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import { useMotion } from "@/lib/motion/provider";
import { useEffect, useRef, useState } from "react";

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
  const [entering, setEntering] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const sizeClasses = {
    sm: "w-10 h-14 text-xs",
    md: "w-14 h-20 text-sm",
    lg: "w-16 h-24 text-base",
  };

  // Trigger an entrance animation on mount and when the card id changes.
  // We start in a collapsed/rotated state, then transition to visible state.
  useEffect(() => {
    // Reset to entering state
    setEntering(true);
    // Respect speed multiplier and per-card delay
    const effectiveDelay = Math.max(
      0,
      Math.floor((animationDelay || 0) / (settings.speedMultiplier || 1))
    );
    // Delay start, then flip the flag on the next frame for smoother transitions
    timeoutRef.current = window.setTimeout(() => {
      requestAnimationFrame(() => setEntering(false));
    }, effectiveDelay);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const baseClasses = cn(
    "rounded border flex flex-col items-center justify-center font-bold shadow-lg transform transition-transform",
    sizeClasses[size],
    settings.enabled && (entering || isAnimating)
      ? "scale-0 rotate-180"
      : "scale-100 rotate-0",
    isVisible ? "bg-white border-gray-300" : "bg-blue-900 border-blue-700",
    className
  );

  return (
    <div
      className={baseClasses}
      {...getAnimAttrs("card", { id: card.id, role: isVisible ? "face" : "back", sequenceIndex: 0, totalInSequence: 1, delayMs: animationDelay })}
      style={{
        // Transition timing respects the global speed multiplier and per-card delay
        transitionDuration: `${Math.max(100, Math.floor(500 / (settings.speedMultiplier || 1)))}ms`,
        transitionDelay: `${Math.max(0, Math.floor((animationDelay || 0) / (settings.speedMultiplier || 1)))}ms`,
        // Keep animationDelay for potential future CSS keyframe hooks
        animationDelay: `${Math.max(0, Math.floor((animationDelay || 0) / (settings.speedMultiplier || 1)))}ms`,
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
