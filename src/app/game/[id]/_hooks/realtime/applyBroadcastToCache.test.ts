import { type Card } from "@/db/schema/cards";
import { describe, expect, test } from "vitest";
import {
  normalizeCards,
  removeById,
  toCamelObject,
  upsertById,
} from "./applyBroadcastToCache";

describe("applyBroadcastToCache helpers", () => {
  test("toCamelObject converts snake_case keys", () => {
    const result = toCamelObject({
      current_round: "flop",
      turn_timeout_at: "...",
    });
    expect(Object.keys(result)).toContain("currentRound");
    expect(Object.keys(result)).toContain("turnTimeoutAt");
  });

  test("toCamelObject preserves non-snake keys and values", () => {
    const src: Record<string, unknown> = {
      id: 1,
      foo: "bar",
      created_at: 123,
      nested_key: { a: 1 },
    };
    const res = toCamelObject(src) as Record<string, unknown>;
    expect(res.id).toBe(1);
    expect(res.foo).toBe("bar");
    expect(res.createdAt).toBe(123);
    // shallow transform only, nested left as-is
    expect(res.nestedKey).toEqual({ a: 1 });
  });

  test("upsertById inserts and updates by id", () => {
    const a = [{ id: 1, v: 1 }];
    const afterInsert = upsertById(a, { id: 2, v: 2 });
    expect(afterInsert).toHaveLength(2);
    const afterUpdate = upsertById(afterInsert, { id: 2, v: 3 });
    expect(afterUpdate.find((x) => x.id === 2)?.v).toBe(3);
  });

  test("removeById removes entries by id", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const next = removeById(a, 2);
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe(1);
  });

  test("normalizeCards limits to 2 hole cards per player and 5 community", () => {
    const cards: Card[] = [
      // player A has 3 cards, should trim to last 2
      {
        id: 1,
        gameId: "g",
        handId: 1,
        playerId: "A",
        rank: "2",
        suit: "hearts",
        revealAtShowdown: false,
      },
      {
        id: 2,
        gameId: "g",
        handId: 1,
        playerId: "A",
        rank: "3",
        suit: "hearts",
        revealAtShowdown: false,
      },
      {
        id: 3,
        gameId: "g",
        handId: 1,
        playerId: "A",
        rank: "4",
        suit: "hearts",
        revealAtShowdown: false,
      },
      // community 6 cards, should trim to last 5
      {
        id: 10,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "2",
        suit: "spades",
        revealAtShowdown: false,
      },
      {
        id: 11,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "3",
        suit: "spades",
        revealAtShowdown: false,
      },
      {
        id: 12,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "4",
        suit: "spades",
        revealAtShowdown: false,
      },
      {
        id: 13,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "5",
        suit: "spades",
        revealAtShowdown: false,
      },
      {
        id: 14,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "6",
        suit: "spades",
        revealAtShowdown: false,
      },
      {
        id: 15,
        gameId: "g",
        handId: 1,
        playerId: null,
        rank: "7",
        suit: "spades",
        revealAtShowdown: false,
      },
    ];

    const normalized = normalizeCards(cards);
    const aCards = normalized.filter((c) => c.playerId === "A");
    const community = normalized.filter((c) => c.playerId === null);
    expect(aCards).toHaveLength(2);
    expect(community).toHaveLength(5);
  });

  test("normalizeCards is idempotent when re-run on normalized list", () => {
    const cards = [
      { id: 1, gameId: "g", handId: 1, playerId: "A", rank: "2", suit: "h" },
      { id: 2, gameId: "g", handId: 1, playerId: "A", rank: "3", suit: "h" },
      { id: 10, gameId: "g", handId: 1, playerId: null, rank: "2", suit: "s" },
      { id: 11, gameId: "g", handId: 1, playerId: null, rank: "3", suit: "s" },
      { id: 12, gameId: "g", handId: 1, playerId: null, rank: "4", suit: "s" },
      { id: 13, gameId: "g", handId: 1, playerId: null, rank: "5", suit: "s" },
      { id: 14, gameId: "g", handId: 1, playerId: null, rank: "6", suit: "s" },
    ];
    const once = normalizeCards(cards as unknown as Card[]);
    const twice = normalizeCards(once as unknown as Card[]);
    expect(twice).toEqual(once);
  });
});
