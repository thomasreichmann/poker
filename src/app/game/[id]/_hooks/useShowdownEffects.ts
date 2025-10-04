"use client";

import { useToast } from "@/components/ui/toast";
import { type Card } from "@/db/schema/cards";
import { type Game } from "@/db/schema/games";
import { type Player } from "@/db/schema/players";
import { evaluateHand } from "@/lib/poker/cards";
import { useEffect, useRef } from "react";

export function useShowdownEffects(
  dbGame: Game | null,
  dbPlayers: Player[],
  dbCards: Card[],
  advance: () => void | Promise<void>
) {
  const { toast } = useToast();
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

      const community = dbCards.filter((c) => c.playerId === null);
      const activePlayers = dbPlayers.filter(
        (p) => p.hasFolded === false || p.hasFolded === null
      );
      let winners = dbPlayers.filter((p) => p.hasWon);
      let handName: string | undefined;

      try {
        if (winners.length === 0 && activePlayers.length > 0) {
          if (activePlayers.length === 1) {
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          } else {
            const evals = activePlayers.map((p) => {
              const hole = dbCards.filter((c) => c.playerId === p.id);
              return { player: p, eval: evaluateHand([...hole, ...community]) };
            });
            const bestRank = Math.max(...evals.map((e) => e.eval.rank));
            const bests = evals.filter((e) => e.eval.rank === bestRank);
            const bestValue = Math.max(...bests.map((e) => e.eval.value));
            const finalWinners = bests.filter(
              (e) => e.eval.value === bestValue
            );
            winners = finalWinners.map((e) => e.player);
            handName = finalWinners[0]?.eval.name;
          }
        } else if (winners[0]) {
          const hole = dbCards.filter((c) => c.playerId === winners[0]!.id);
          const ev = evaluateHand([...hole, ...community]);
          handName = ev.name;
        }
      } catch {
        if (winners.length === 0 && activePlayers.length > 0) {
          if (activePlayers.length === 1) {
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          } else {
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          }
        }
      }

      const winnerNames = winners
        .map((p) => (p.displayName ? p.displayName : `Player ${p.seat}`))
        .join(", ");
      const finalWinnerNames = winnerNames || "Unknown Player";

      const description = handName
        ? `Winner: ${finalWinnerNames} — ${handName}`
        : `Winner: ${finalWinnerNames}`;
      toast({
        variant: "success",
        title: "Showdown",
        description,
        duration: 5000,
        groupId: `showdown-${dbGame.id}-${String(dbGame.handId ?? "")}`,
      });

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
  }, [dbGame, dbPlayers, dbCards, toast, advance]);
}
