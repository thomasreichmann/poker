"use client";

import { PlayingCard } from "@/components/ui/playing-card";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";

type CommunityCardsProps = {
  cards: IPlayingCard[];
  isAnimating?: boolean;
};

export function CommunityCards({
  cards,
  isAnimating = false,
}: CommunityCardsProps) {
  const prevCount = useRef(0);
  console.log("CommunityCards", cards.length);
  useEffect(() => {
    if (cards.length > prevCount.current) {
      // no-op now; animation handled declaratively
    }
    prevCount.current = cards.length;
  }, [cards.length]);

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
      <motion.div
        className="flex space-x-2"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        layout
      >
        {cards.map((card, index) => (
          <PlayingCard
            key={card.id}
            card={card}
            size="md"
            isVisible={true}
            isAnimating={isAnimating}
            animationDelay={index * 200}
          />
        ))}
        {Array.from({ length: 5 - cards.length }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="w-14 h-20 border-2 border-dashed border-emerald-600 rounded-lg opacity-30"
          />
        ))}
      </motion.div>
    </div>
  );
}
