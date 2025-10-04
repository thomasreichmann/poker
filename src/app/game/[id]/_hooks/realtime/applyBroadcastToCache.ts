import { type Action } from "@/db/schema/actions";
import { type Card } from "@/db/schema/cards";
import { type Game } from "@/db/schema/games";
import { type Player } from "@/db/schema/players";

export function toCamelObject(obj: Record<string, unknown>) {
  const toCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [toCamel(k), v])
  );
}

export function upsertById<T extends { id: string | number }>(
  list: T[],
  item: T
) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

export function removeById<T extends { id: string | number }>(
  list: T[],
  id: string | number
) {
  return list.filter((x) => x.id !== id);
}

export function normalizeCards(cardsList: Card[]) {
  const byPlayer = new Map<string, Card[]>();
  const community: Card[] = [];
  for (const c of cardsList) {
    if (c.playerId) {
      const pid = String(c.playerId);
      const arr = byPlayer.get(pid) ?? [];
      arr.push(c);
      byPlayer.set(pid, arr);
    } else {
      community.push(c);
    }
  }
  const limited: Card[] = [];
  for (const [, arr] of byPlayer) {
    arr.sort((a, b) => Number(a.id) - Number(b.id));
    const kept = arr.slice(-2);
    for (const c of kept) limited.push(c);
  }
  community.sort((a, b) => Number(a.id) - Number(b.id));
  for (const c of community.slice(-5)) limited.push(c);
  return limited;
}

export type CachedGameData = {
  game: Game;
  players: Player[];
  cards: Card[];
  actions: Action[];
};
