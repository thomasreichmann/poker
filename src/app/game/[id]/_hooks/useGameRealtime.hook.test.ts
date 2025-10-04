import { describe, expect, test, vi } from "vitest";
// @ts-ignore: testing-library types may not be available in CI TS config
import { renderHook } from "@testing-library/react";
import { useGameRealtime } from "./useGameRealtime";

vi.mock("@/supabase/client", () => {
  const listeners: Record<string, (payload: any) => void> = {};
  const channel = {
    on: vi.fn().mockImplementation((_ev: any, filter: any, cb: any) => {
      listeners[filter.event] = cb;
      return channel;
    }),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    getSupabaseBrowserClient: () => ({
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { access_token: "t" } } }),
        onAuthStateChange: vi
          .fn()
          .mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
          }),
      },
      realtime: { setAuth: vi.fn() },
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
      __listeners: listeners,
    }),
  };
});

describe("useGameRealtime (hook)", () => {
  test("wires auth and updates cache on game hand change", async () => {
    let cache: any = {
      game: { id: "g", handId: 1 },
      players: [{ id: "p1", leaveAfterHand: true }],
      cards: [{ id: 1 }],
      actions: [],
    };
    const setCache = (updater: (prev: any) => any) => {
      cache = updater(cache);
    };
    const onHandTransition = vi.fn();
    renderHook(() =>
      useGameRealtime("g", setCache, undefined, onHandTransition)
    );

    const { getSupabaseBrowserClient } = await import("@/supabase/client");
    const supa: any = getSupabaseBrowserClient();
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
    expect(cache.players.find((p: any) => p.leaveAfterHand)).toBeUndefined();
    expect(onHandTransition).toHaveBeenCalledTimes(1);
  });
});
