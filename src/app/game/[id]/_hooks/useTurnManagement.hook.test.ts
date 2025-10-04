import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
// @ts-ignore: testing-library types may not be available in CI TS config
import { renderHook } from "@testing-library/react";
import { useTurnManagement, type TurnContext } from "./useTurnManagement";

describe("useTurnManagement (hook)", () => {
  const realNow = Date.now.bind(global.Date);
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    // Restore Date.now
    (Date.now as any) = realNow;
  });

  function makeCtx(overrides?: Partial<TurnContext>): TurnContext {
    return {
      meId: "u1",
      gameId: "g1",
      handId: 1,
      status: "active",
      currentRound: "flop",
      currentPlayerTurn: "p1",
      turnMs: 1000,
      turnTimeoutAt: new Date(Date.now() + 1000),
      ...overrides,
    };
  }

  test("fires primary timeout for turn-holder at deadline", () => {
    const onTimeout = vi.fn();
    const ctx = makeCtx();
    renderHook(() => useTurnManagement(ctx, true, onTimeout));

    vi.advanceTimersByTime(999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  test("fallback fires for non-turn holder after grace", () => {
    const onTimeout = vi.fn();
    const now = Date.now();
    const ctx = makeCtx({ turnTimeoutAt: new Date(now + 1000) });
    renderHook(() => useTurnManagement(ctx, false, onTimeout));
    // Wait past deadline + 1.25s grace
    vi.advanceTimersByTime(2251);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  test("proactive catch-up triggers when already overdue on mount (turn-holder)", () => {
    const onTimeout = vi.fn();
    const ctx = makeCtx({ turnTimeoutAt: new Date(Date.now() - 500) });
    renderHook(() => useTurnManagement(ctx, true, onTimeout));
    // Debounce happens immediately during mount
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
