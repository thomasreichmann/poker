"use client";

import { PlayingCard } from "@/components/ui/playing-card";
import { useBoardState } from "@/lib/dev/board";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";

type CommunityCardsProps = {
  cards: IPlayingCard[];
  isAnimating?: boolean;
};

export function CommunityCards({
  cards,
  isAnimating = false,
}: CommunityCardsProps) {
  const prevCount = useRef(0);
  const prevIdsRef = useRef<string[]>([]);
  const board = useBoardState();
  const displayCards = useMemo<IPlayingCard[]>(
    () => (board.enabled ? (board.cards as IPlayingCard[]) : cards),
    [board.enabled, board.cards, cards]
  );

  useEffect(() => {
    if (displayCards.length > prevCount.current) {
      // no-op now; animation handled declaratively
    }
    prevCount.current = displayCards.length;
    prevIdsRef.current = displayCards.map((c) => c.id);
  }, [displayCards]);

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
      <motion.div
        className="flex space-x-2"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        layout
      >
        {displayCards.map((card, index) => {
          const replaced = prevIdsRef.current[index] !== card.id;
          const shouldAnim =
            isAnimating || index >= prevCount.current || replaced;
          return (
            <PlayingCard
              key={card.id}
              card={card}
              size="md"
              isVisible={true}
              isAnimating={shouldAnim}
              animationDelay={index * 100}
            />
          );
        })}
        {Array.from({ length: 5 - displayCards.length }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="w-14 h-20 border-2 border-dashed border-emerald-600 rounded-lg opacity-30"
          />
        ))}
      </motion.div>
    </div>
  );
}
