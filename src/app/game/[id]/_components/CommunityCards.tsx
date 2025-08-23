"use client";

import { PlayingCard } from "@/components/ui/playing-card";
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
          <PlayingCard
            key={card.id}
            card={card}
            size="md"
            isVisible={true}
            isAnimating={!isAnimating}
            animationDelay={index * 40}
          />
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
