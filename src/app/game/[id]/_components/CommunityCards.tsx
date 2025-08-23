"use client";

import { PlayingCard } from "@/components/ui/playing-card";
import { AnimatedCard } from "@/lib/motion/AnimatedCard";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";

type CommunityCardsProps = {
  cards: IPlayingCard[];
  isAnimating?: boolean;
};

export function CommunityCards({
  cards,
  isAnimating = false,
}: CommunityCardsProps) {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
      <div className="flex space-x-2">
        {cards.map((card, index) => (
          <AnimatedCard
            key={card.id}
            phase={isAnimating ? "deal" : "idle"}
            delayMs={index * 80}
            from={{ x: 0, y: -100, rotate: -10, scale: 0.8 }}
            to={{ x: 0, y: 0, rotate: 0, scale: 1 }}
          >
            <PlayingCard
              card={card}
              size="md"
              isVisible={true}
              isAnimating={false}
              animationDelay={0}
            />
          </AnimatedCard>
        ))}
        {Array.from({ length: 5 - cards.length }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="w-14 h-20 border-2 border-dashed border-emerald-600 rounded-lg opacity-30"
          />
        ))}
      </div>
    </div>
  );
}
