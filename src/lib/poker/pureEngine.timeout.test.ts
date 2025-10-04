import { describe, expect, test } from "vitest";
import {
  addPlayerToGame,
  createInitialGameState,
  startNewGame,
  timeoutPlayer,
  validateTimeout,
} from "./pureEngine";

describe("Engine timeout validation and behavior", () => {
  test("validateTimeout rejects before deadline and accepts shortly after with skew", () => {
    let gs = createInitialGameState("t1");
    gs = addPlayerToGame(gs, "p1", 1000);
    gs = addPlayerToGame(gs, "p2", 1000);
    gs = startNewGame(gs);

    // Move deadline to future
    gs.turnTimeoutAt = new Date(Date.now() + 2000);
    const playerId = gs.currentPlayerTurn!;
    const before = validateTimeout(
      gs,
      gs.players.find((p) => p.id === playerId)
    );
    expect(before.isValid).toBe(false);

    // Simulate just after deadline within skew window
    gs.turnTimeoutAt = new Date(Date.now() - 200);
    const near = validateTimeout(
      gs,
      gs.players.find((p) => p.id === playerId)
    );
    // With 250ms skew allowance, -200ms should pass
    expect(near.isValid).toBe(true);
  });

  test("timeoutPlayer checks when allowed, folds otherwise, and advances", () => {
    let gs = createInitialGameState("t2");
    gs = addPlayerToGame(gs, "p1", 1000);
    gs = addPlayerToGame(gs, "p2", 1000);
    gs = startNewGame(gs);

    const current = gs.currentPlayerTurn!;
    // Ensure deadline passed
    gs.turnTimeoutAt = new Date(Date.now() - 1000);

    // If no outstanding bet (post-flop check allowed), simulate by setting currentHighestBet to player's currentBet
    const player = gs.players.find((p) => p.id === current)!;
    gs.currentHighestBet = player.currentBet; // can check

    const res1 = timeoutPlayer(gs, current);
    expect(res1.isValid).toBe(true);
    expect(res1.newGameState.lastAction).toBe("check");
    expect(res1.newGameState.currentPlayerTurn).not.toBe(current);

    // Now simulate cannot check (outstanding bet)
    const gs2 = { ...gs };
    gs2.currentHighestBet = (player.currentBet ?? 0) + 10;
    gs2.turnTimeoutAt = new Date(Date.now() - 1000);
    const res2 = timeoutPlayer(gs2, current);
    expect(res2.isValid).toBe(true);
    expect(res2.newGameState.lastAction).toBe("fold");
    // If only two players, folding current player may end the hand; assert status or turn change
    if (res2.newGameState.status === "completed") {
      expect(res2.newGameState.currentRound).toBe("showdown");
    } else {
      expect(res2.newGameState.currentPlayerTurn).not.toBe(current);
    }
  });
});
