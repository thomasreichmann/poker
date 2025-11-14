import { describe, expect, test, vi } from "vitest";
import type { CachedGameData } from "../_hooks/realtime/applyBroadcastToCache";
import { GameDataStore } from "./store";

const baseSnapshot: CachedGameData = {
  game: {
    id: "g",
    handId: 1,
    status: "active",
    currentRound: "pre-flop",
    currentHighestBet: 0,
    currentPlayerTurn: "p1",
    lastAggressorId: null,
    pot: 0,
    bigBlind: 20,
    smallBlind: 10,
    turnMs: 30_000,
    updatedAt: new Date(),
    lastAction: "check",
    lastBetAmount: 0,
    turnTimeoutAt: null,
  },
  players: [
    {
      id: "p1",
      userId: "u1",
      gameId: "g",
      seat: 0,
      stack: 1000,
      currentBet: 0,
      hasFolded: false,
      isConnected: true,
      lastSeen: new Date(),
      isButton: true,
      hasWon: false,
      showCards: false,
      displayName: "Hero",
      leaveAfterHand: false,
      handRank: null,
      handValue: null,
      handName: null,
    },
    {
      id: "p2",
      userId: "u2",
      gameId: "g",
      seat: 1,
      stack: 1000,
      currentBet: 0,
      hasFolded: false,
      isConnected: true,
      lastSeen: new Date(),
      isButton: false,
      hasWon: false,
      showCards: false,
      displayName: "Btn",
      leaveAfterHand: true,
      handRank: null,
      handValue: null,
      handName: null,
    },
  ],
  cards: [
    {
      id: 1,
      handId: 1,
      gameId: "g",
      playerId: null,
      revealAtShowdown: false,
      rank: "A",
      suit: "spades",
    },
  ],
  actions: [],
};

describe("GameDataStore", () => {
  test("clears cards and exiting players when hand transitions", () => {
    const store = new GameDataStore();
    store.hydrate(baseSnapshot);
    const onHandTransition = vi.fn();

    store.applyBroadcast(
      {
        table: "poker_games",
        event: "UPDATE",
        newRow: { id: "g", hand_id: 2 },
        oldRow: { id: "g", hand_id: 1 },
      },
      { onHandTransition }
    );

    const next = store.getSnapshot();
    expect(next?.game.handId).toBe(2);
    expect(next?.cards).toHaveLength(0);
    expect(next?.players.some((p) => p.leaveAfterHand)).toBeFalsy();
    expect(onHandTransition).toHaveBeenCalledTimes(1);
  });

  test("merges private cards for the viewing player", () => {
    const store = new GameDataStore();
    store.hydrate(baseSnapshot);

    store.mergePrivateCards({
      userId: "u1",
      handId: 1,
      cards: [
        {
          id: 10,
          handId: 1,
          gameId: "g",
          playerId: "p1",
          revealAtShowdown: true,
          rank: "K",
          suit: "clubs",
        },
        {
          id: 11,
          handId: 1,
          gameId: "g",
          playerId: "p1",
          revealAtShowdown: true,
          rank: "K",
          suit: "diamonds",
        },
      ],
    });

    const next = store.getSnapshot();
    const heroCards = next?.cards.filter((c) => c.playerId === "p1") ?? [];
    expect(heroCards).toHaveLength(2);
  });
});
