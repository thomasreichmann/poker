"use client";

import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import { useMemo } from "react";
import { type GameSnapshot, type GameViewModel } from "./types";

export function computeGameViewModel(
  snapshot: GameSnapshot | null,
  meId?: string | null
): GameViewModel {
  const dbGame = snapshot?.game ?? null;
  const dbPlayers = snapshot?.players ?? [];
  const dbCards = snapshot?.cards ?? [];

  const yourDbPlayer = dbPlayers.find((p) => p.userId === meId) || null;

  const isYourTurn = !!(
    dbGame &&
    yourDbPlayer &&
    dbGame.currentPlayerTurn === yourDbPlayer.id
  );

  const communityCards = dbCards
    .filter((c) => c.playerId === null)
    .map((c, idx) => ({
      suit: c.suit as IPlayingCard["suit"],
      rank: c.rank as IPlayingCard["rank"],
      id: `${c.rank}-${c.suit}-${idx}`,
    }));

  const playersBySeat = [...dbPlayers].sort((a, b) => a.seat - b.seat);

  const activePlayerIndex = (() => {
    const idx = playersBySeat.findIndex(
      (p) => p.id === dbGame?.currentPlayerTurn
    );
    return idx === -1 ? 0 : idx;
  })();

  const selfSeatIndex = (() => {
    const idx = playersBySeat.findIndex((p) => p.id === yourDbPlayer?.id);
    return idx === -1 ? 0 : idx;
  })();

  function rotateArray<T>(arr: T[], offset: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const k = ((offset % n) + n) % n;
    return arr.slice(k).concat(arr.slice(0, k));
  }

  const playersByView = rotateArray(playersBySeat, selfSeatIndex);

  const activePlayerIndexByView =
    playersBySeat.length === 0
      ? 0
      : (activePlayerIndex - selfSeatIndex + playersBySeat.length) %
        playersBySeat.length;

  const connectedCount = playersBySeat.filter((p) => p.isConnected).length;

  const playerIdToCards = (() => {
    const map = new Map<string, IPlayingCard[]>();
    const counters = new Map<string, number>();
    for (const c of dbCards) {
      if (!c.playerId) continue;
      const idx = (counters.get(c.playerId) ?? 0) + 1;
      counters.set(c.playerId, idx);
      const arr = map.get(c.playerId) ?? [];
      arr.push({
        suit: c.suit as IPlayingCard["suit"],
        rank: c.rank as IPlayingCard["rank"],
        id: `${c.rank}-${c.suit}-${c.playerId}-${idx - 1}`,
      });
      map.set(c.playerId, arr);
    }
    return map;
  })();

  const phaseLabel = (() => {
    const map: Record<string, string> = {
      "pre-flop": "Pré-flop",
      flop: "Flop",
      turn: "Turn",
      river: "River",
      showdown: "Showdown",
    };
    return dbGame ? map[dbGame.currentRound ?? "pre-flop"] ?? "Pré-flop" : "";
  })();

  const callAmount = (() => {
    if (!dbGame || !yourDbPlayer) return 0;
    const diff =
      (dbGame.currentHighestBet ?? 0) - (yourDbPlayer.currentBet ?? 0);
    return Math.max(0, Math.min(diff, yourDbPlayer.stack));
  })();

  const minRaiseTotal = (() => {
    if (!dbGame) return 0;
    const tableBet = dbGame.currentHighestBet ?? 0;
    return tableBet === 0
      ? dbGame.bigBlind
      : Math.max(tableBet * 2, dbGame.bigBlind);
  })();

  const maxRaiseTotal = (() => {
    if (!yourDbPlayer) return 0;
    return (yourDbPlayer.currentBet ?? 0) + (yourDbPlayer.stack ?? 0);
  })();

  const canCheck = !!(
    dbGame &&
    yourDbPlayer &&
    (dbGame.currentHighestBet ?? 0) <= (yourDbPlayer.currentBet ?? 0)
  );

  const canCall = !!(
    dbGame &&
    yourDbPlayer &&
    (dbGame.currentHighestBet ?? 0) > (yourDbPlayer.currentBet ?? 0) &&
    yourDbPlayer.stack > 0
  );

  return {
    yourDbPlayer,
    isYourTurn,
    playersBySeat,
    playersByView,
    activePlayerIndex,
    activePlayerIndexByView,
    phaseLabel,
    callAmount,
    minRaiseTotal,
    maxRaiseTotal,
    canCheck,
    canCall,
    connectedCount,
    playerIdToCards,
    communityCards,
  };
}

export function useGameDerived(
  snapshot: GameSnapshot | null,
  meId?: string | null
): GameViewModel {
  return useMemo(() => computeGameViewModel(snapshot, meId), [snapshot, meId]);
}
