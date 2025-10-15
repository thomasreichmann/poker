import {
  type CachedGameData,
  normalizeCards,
  removeById,
  toCamelObject,
  upsertById,
} from "./applyBroadcastToCache";

export type TableName =
  | "poker_games"
  | "poker_players"
  | "poker_cards"
  | "poker_actions";

export type BroadcastEvent = "INSERT" | "UPDATE" | "DELETE";

export function applyBroadcastToCachedState(
  prev: CachedGameData,
  table: TableName,
  event: BroadcastEvent,
  newRow: Record<string, unknown>,
  oldRow: Record<string, unknown>,
  onHandTransition?: () => void
): CachedGameData {
  switch (table) {
    case "poker_games": {
      const game = newRow ?? oldRow;
      const mapped = toCamelObject(game) as CachedGameData["game"];
      const prevGame = prev.game;
      const nextGame = { ...prevGame, ...mapped };
      const transitionedToNewHand = prevGame.handId !== nextGame.handId;
      if (transitionedToNewHand) {
        try {
          onHandTransition?.();
        } catch {}
        return {
          ...prev,
          game: nextGame,
          cards: [],
          players: prev.players.filter((p) => !p.leaveAfterHand),
        };
      }
      return { ...prev, game: nextGame };
    }
    case "poker_players": {
      if (event === "DELETE") {
        const row = oldRow ?? newRow;
        const idToRemove = row.id as string;
        return { ...prev, players: removeById(prev.players, idToRemove) };
      }
      const mapped = toCamelObject(newRow) as CachedGameData["players"][number];
      return {
        ...prev,
        players: upsertById(prev.players, mapped).sort(
          (a, b) => a.seat - b.seat
        ),
      };
    }
    case "poker_cards": {
      if (event === "DELETE") {
        const idToRemove = (oldRow?.id as string) ?? (newRow?.id as string);
        const next = removeById(prev.cards, idToRemove);
        return { ...prev, cards: normalizeCards(next) };
      }
      const mapped = toCamelObject(newRow) as CachedGameData["cards"][number];
      const next = upsertById(prev.cards, mapped);
      return { ...prev, cards: normalizeCards(next) };
    }
    case "poker_actions": {
      const mapped = toCamelObject(newRow) as CachedGameData["actions"][number];
      if (event === "INSERT") {
        const next = [mapped, ...prev.actions].slice(0, 50);
        return { ...prev, actions: next };
      }
      if (event === "UPDATE") {
        return { ...prev, actions: upsertById(prev.actions, mapped) };
      }
      if (event === "DELETE") {
        const idToRemove = (oldRow?.id as string) ?? (newRow?.id as string);
        return { ...prev, actions: removeById(prev.actions, idToRemove) };
      }
      return prev;
    }
    default:
      return prev;
  }
}
