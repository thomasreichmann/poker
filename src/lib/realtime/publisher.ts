import { broadcast } from "./adapter";

export type GameEventType =
  | "state-updated"
  | "hand-started"
  | "bet-placed"
  | "call-made"
  | "check-made"
  | "raise-made"
  | "player-folded"
  | "showdown"
  | "game-ended";

export type GameEvent = {
  type: GameEventType;
  gameId: string;
  lastActionId: number | null;
  updatedAt: string;
  payload: Record<string, unknown>;
};

export async function publishGameEvent(gameId: string, event: GameEvent) {
  const topic = `topic:${gameId}`;
  await broadcast(topic, "UPDATE", { event });
}
