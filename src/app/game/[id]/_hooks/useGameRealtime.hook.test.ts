import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useGameRealtime } from "./useGameRealtime";

vi.mock("@/supabase/client", () => {
  const listeners: Record<string, (payload: unknown) => void> = {};
  const channel = {
    on: vi
      .fn()
      .mockImplementation(
        (_ev: unknown, filter: { event: string }, cb: (p: unknown) => void) => {
          listeners[filter.event] = cb;
          return channel;
        }
      ),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    getSupabaseBrowserClient: () => ({
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { access_token: "t" } } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      realtime: { setAuth: vi.fn() },
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
      __listeners: listeners as Record<string, (payload: unknown) => void>,
    }),
  };
});

describe("useGameRealtime (hook)", () => {
  test("wires auth and updates cache on game hand change", async () => {
    let cache: {
      game: { id: string; handId: number };
      players: Array<{ id: string; leaveAfterHand?: boolean }>;
      cards: Array<{ id: number }>;
      actions: unknown[];
    } = {
      game: { id: "g", handId: 1 },
      players: [{ id: "p1", leaveAfterHand: true }],
      cards: [{ id: 1 }],
      actions: [],
    };
    const setCache = (updater: (prev: typeof cache) => typeof cache): void => {
      cache = updater(cache);
    };
    const onHandTransition = vi.fn();
    renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useGameRealtime("g", setCache as any, undefined, onHandTransition)
    );

    const { getSupabaseBrowserClient } = await import("@/supabase/client");
    const supa = getSupabaseBrowserClient() as unknown as {
      __listeners: Record<string, (payload: unknown) => void>;
    };
    supa.__listeners.UPDATE({
      event: "UPDATE",
      payload: {
        schema: "public",
        table: "poker_games",
        record: { id: "g", hand_id: 2 },
        old_record: { id: "g", hand_id: 1 },
      },
      type: "broadcast",
    });

    expect(cache.game.handId).toBe(2);
    expect(cache.cards).toEqual([]);
    expect(cache.players.find((p) => p.leaveAfterHand)).toBeUndefined();
    expect(onHandTransition).toHaveBeenCalledTimes(1);
  });
});
