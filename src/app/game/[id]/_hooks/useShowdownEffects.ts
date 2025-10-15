"use client";

import { type Card } from "@/db/schema/cards";
import { type Game } from "@/db/schema/games";
import { type Player } from "@/db/schema/players";
import { useEffect, useRef } from "react";

export function useShowdownEffects(
  dbGame: Game | null,
  dbPlayers: Player[],
  dbCards: Card[],
  advance: () => void | Promise<void>
) {
  const showdownHandledRef = useRef<string | null>(null);
  const showdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!dbGame) return;
    const isShowdown = (dbGame.currentRound ?? "pre-flop") === "showdown";
    if (!isShowdown) {
      showdownHandledRef.current = null;
      if (showdownTimeoutRef.current) {
        clearTimeout(showdownTimeoutRef.current);
        showdownTimeoutRef.current = null;
      }
      return;
    }

    const key = `${dbGame.id}-${String(dbGame.handId ?? "")}`;
    if (showdownHandledRef.current === key) return;

    if (showdownTimeoutRef.current) {
      clearTimeout(showdownTimeoutRef.current);
    }

    showdownTimeoutRef.current = setTimeout(() => {
      if (showdownHandledRef.current === key) return;
      showdownHandledRef.current = key;

      const advanceTimer = setTimeout(() => {
        void advance();
      }, 2000);
      setTimeout(() => clearTimeout(advanceTimer), 3000);
    }, 150);

    return () => {
      if (showdownTimeoutRef.current) {
        clearTimeout(showdownTimeoutRef.current);
        showdownTimeoutRef.current = null;
      }
    };
  }, [dbGame, dbPlayers, dbCards, advance]);
}
