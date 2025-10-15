import { describe, expect, test } from "vitest";
import { type CachedGameData } from "./applyBroadcastToCache";
import { applyBroadcastToCachedState } from "./reducers";

const base = (): CachedGameData => ({
  game: { id: "g", handId: 1 } as unknown as CachedGameData["game"],
  players: [
    { id: "p1", seat: 1, leaveAfterHand: true },
  ] as unknown as CachedGameData["players"],
  cards: [{ id: "1", playerId: null }] as unknown as CachedGameData["cards"],
  actions: [] as unknown as CachedGameData["actions"],
});

describe("reducers", () => {
  test("poker_games hand transition resets cards and prunes leaveAfterHand", () => {
    const prev = base();
    const next = applyBroadcastToCachedState(
      prev as unknown as CachedGameData,
      "poker_games",
      "UPDATE",
      { id: "g", hand_id: 2 },
      { id: "g", hand_id: 1 },
      undefined
    );
    expect(next.game.handId).toBe(2);
    expect(next.cards.length).toBe(0);
    expect(
      (next.players as Array<{ leaveAfterHand?: boolean }>).find(
        (p) => p.leaveAfterHand
      )
    ).toBeUndefined();
  });

  test("poker_players upsert and sort by seat", () => {
    const prev = base();
    const next = applyBroadcastToCachedState(
      prev as unknown as CachedGameData,
      "poker_players",
      "UPDATE",
      { id: "p2", seat: 0 },
      {},
      undefined
    );
    expect(next.players[0].id).toBe("p2");
  });
});
