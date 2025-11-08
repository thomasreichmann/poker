import { type Action } from "@/db/schema/actions";
import { type Card } from "@/db/schema/cards";
import { type Game } from "@/db/schema/games";
import { type Player } from "@/db/schema/players";
import { type GameEvent } from "@/lib/realtime/publisher";

export type GameSnapshot = {
  game: Game;
  players: Player[];
  cards: Card[];
  actions: Action[];
};

export type GameViewModel = {
  yourDbPlayer: Player | null;
  isYourTurn: boolean;
  playersBySeat: Player[];
  playersByView: Player[];
  activePlayerIndex: number;
  activePlayerIndexByView: number;
  phaseLabel: string;
  callAmount: number;
  minRaiseTotal: number;
  maxRaiseTotal: number;
  canCheck: boolean;
  canCall: boolean;
  connectedCount: number;
  playerIdToCards: Map<string, { suit: string; rank: string; id: string }[]>;
  communityCards: { suit: string; rank: string; id: string }[];
};

export type LegacyDbBroadcastPayload = {
  schema: string;
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown>;
  old_record: Record<string, unknown>;
};

export type CustomBroadcastPayload = {
  event: GameEvent;
};

export type LegacyDbBroadcastEvent = {
  event: string;
  payload: LegacyDbBroadcastPayload;
};

export type CustomBroadcastEvent = {
  event: string;
  payload: CustomBroadcastPayload;
};

export type RealtimeEventData =
  | LegacyDbBroadcastEvent
  | CustomBroadcastEvent
  | { event: string; payload?: unknown };

export function isLegacyDbBroadcast(
  data: RealtimeEventData
): data is LegacyDbBroadcastEvent {
  if (!data.payload || typeof data.payload !== "object") {
    return false;
  }
  return (
    "schema" in data.payload &&
    "table" in data.payload &&
    "event" in data.payload &&
    "record" in data.payload &&
    "old_record" in data.payload &&
    typeof data.payload.schema === "string" &&
    data.payload.schema === "public" &&
    typeof data.payload.table === "string"
  );
}

export function isCustomBroadcast(
  data: RealtimeEventData
): data is CustomBroadcastEvent {
  if (!data.payload || typeof data.payload !== "object") {
    return false;
  }
  return (
    "event" in data.payload &&
    typeof data.payload.event === "object" &&
    data.payload.event !== null &&
    "type" in data.payload.event &&
    "gameId" in data.payload.event &&
    typeof data.payload.event.type === "string" &&
    typeof data.payload.event.gameId === "string"
  );
}
