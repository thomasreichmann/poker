"use client";

import { type Card as DbCard } from "@/db/schema/cards";
import { type Game as DbGame } from "@/db/schema/games";
import { type Player as DbPlayer } from "@/db/schema/players";
import { evaluateHand } from "@/lib/poker/cards";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useMemo } from "react";

type ShowdownBannerProps = {
  game: DbGame | null;
  players: DbPlayer[];
  cards: DbCard[];
  className?: string;
};

export function ShowdownBanner({
  game,
  players,
  cards,
  className,
}: ShowdownBannerProps) {
  const isShowdown = (game?.currentRound ?? "pre-flop") === "showdown";

  const { winnerNames, handName, isSplit } = useMemo(() => {
    if (!game)
      return {
        winnerNames: "",
        handName: undefined as string | undefined,
        isSplit: false,
      };

    const community = cards.filter((c) => c.playerId === null);
    const activePlayers = players.filter(
      (p) => p.hasFolded === false || p.hasFolded === null
    );

    let winners = players.filter((p) => p.hasWon);
    let computedHandName: string | undefined;

    try {
      if (winners.length === 0 && activePlayers.length > 0) {
        if (activePlayers.length === 1) {
          winners = [activePlayers[0]!];
          computedHandName = "Winner by default";
        } else {
          const evaluations = activePlayers.map((p) => {
            const hole = cards.filter((c) => c.playerId === p.id);
            const evaluation = evaluateHand([...hole, ...community]);
            return { player: p, evaluation };
          });
          const bestRank = Math.max(
            ...evaluations.map((e) => e.evaluation.rank)
          );
          const bestHands = evaluations.filter(
            (e) => e.evaluation.rank === bestRank
          );
          const bestValue = Math.max(
            ...bestHands.map((e) => e.evaluation.value)
          );
          const finalWinners = bestHands.filter(
            (e) => e.evaluation.value === bestValue
          );
          winners = finalWinners.map((e) => e.player);
          computedHandName = finalWinners[0]?.evaluation.name;
        }
      } else if (winners[0]) {
        const hole = cards.filter((c) => c.playerId === winners[0]!.id);
        const ev = evaluateHand([...hole, ...community]);
        computedHandName = ev.name;
      }
    } catch {
      if (winners.length === 0 && activePlayers.length > 0) {
        winners = [activePlayers[0]!];
        computedHandName = "Winner by default";
      }
    }

    const names = winners
      .map((p) => (p.displayName ? p.displayName : `Player ${p.seat}`))
      .join(", ");

    return {
      winnerNames: names,
      handName: computedHandName,
      isSplit: winners.length > 1,
    };
  }, [game, players, cards]);

  if (!isShowdown) return null;

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 top-12 z-50",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <motion.div
        className={cn(
          "rounded-xl border border-emerald-500/40 bg-slate-900/85 backdrop-blur px-4 py-3 shadow-xl",
          "text-white"
        )}
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="text-xs uppercase tracking-wide text-emerald-300/90">
          Showdown
        </div>
        <div className="text-sm font-semibold mt-0.5">
          {winnerNames && handName ? (
            <span>
              Winner{isSplit ? "s" : ""}: {winnerNames} — {handName}
            </span>
          ) : winnerNames ? (
            <span>
              Winner{isSplit ? "s" : ""}: {winnerNames}
            </span>
          ) : (
            <span>Determining winner…</span>
          )}
        </div>
        <div className="text-[11px] text-slate-300 mt-1">
          {/* Placeholder; exact chip amounts to be surfaced by engine later */}
          {isSplit ? "Split pot" : "Wins the pot"}
        </div>
      </motion.div>
    </div>
  );
}
