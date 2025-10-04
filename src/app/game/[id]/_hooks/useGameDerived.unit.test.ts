import { describe, expect, test } from "vitest";
import { computeGameViewModel } from "./useGameDerived";

function makeSnapshot(overrides?: Partial<any>) {
  const base = {
    game: {
      id: "g",
      status: "active",
      currentRound: "pre-flop",
      currentHighestBet: 20,
      currentPlayerTurn: "p2",
      lastAggressorId: null,
      pot: 30,
      bigBlind: 20,
      smallBlind: 10,
    },
    players: [
      {
        id: "p1",
        userId: "u1",
        seat: 0,
        stack: 1000,
        currentBet: 10,
        hasFolded: false,
        isButton: true,
      },
      {
        id: "p2",
        userId: "u2",
        seat: 1,
        stack: 1000,
        currentBet: 20,
        hasFolded: false,
        isButton: false,
      },
      {
        id: "p3",
        userId: "u3",
        seat: 2,
        stack: 0,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
      },
    ],
    cards: [],
    actions: [],
  } as any;
  return { ...base, ...overrides };
}

describe("computeGameViewModel", () => {
  test("computes call/check/canCall and min/max raises", () => {
    const vm = computeGameViewModel(makeSnapshot(), "u1");
    expect(vm.isYourTurn).toBe(false);
    expect(vm.callAmount).toBe(10);
    expect(vm.canCheck).toBe(false);
    expect(vm.canCall).toBe(true);
    expect(vm.minRaiseTotal).toBe(40);
    expect(vm.maxRaiseTotal).toBe(1010);
  });

  test("playersByView and indexes rotate around self seat", () => {
    const vm = computeGameViewModel(makeSnapshot(), "u3");
    expect(vm.playersBySeat[0]?.id).toBe("p1");
    expect(vm.playersByView[0]?.userId).toBe("u3");
    expect(vm.activePlayerIndexByView).toBeGreaterThanOrEqual(0);
  });

  test("handles empty snapshot gracefully", () => {
    const vm = computeGameViewModel(null, undefined);
    expect(vm.connectedCount).toBe(0);
    expect(vm.playersBySeat).toEqual([]);
    expect(vm.communityCards).toEqual([]);
  });
});
