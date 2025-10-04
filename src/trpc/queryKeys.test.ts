import { describe, expect, test } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  test("getById produces stable key shape", () => {
    const key1 = queryKeys.game.getById("abc");
    const key2 = queryKeys.game.getById("abc");
    expect(Array.isArray(key1)).toBe(true);
    expect(key1).toHaveLength(1);
    expect(key1[0]).toEqual({
      scope: "trpc",
      route: "game.getById",
      id: "abc",
    });
    expect(key1).toEqual(key2);
  });
});
