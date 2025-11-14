import type { GameEvent } from "@/lib/realtime/publisher";
import type { SubscribeStatus } from "@/supabase/realtimeHelpers";
import type { CachedGameData } from "../_hooks/realtime/applyBroadcastToCache";
import type {
  BroadcastEvent,
  TableName,
} from "../_hooks/realtime/reducers";

export type GameDataTransportKind = "supabase" | "mock";

export type BroadcastPayload = {
  table: TableName;
  event: BroadcastEvent;
  newRow: Record<string, unknown>;
  oldRow: Record<string, unknown>;
};

export type TransportLifecycleStatus = SubscribeStatus | string;

export type TransportLifecycleListener = (
  topic: string,
  status: TransportLifecycleStatus
) => void;

export type TransportCustomEventListener = (event: GameEvent) => void;

export type TransportSnapshotListener = (snapshot: CachedGameData) => void;

export type TransportBroadcastListener = (
  payload: BroadcastPayload
) => void;

export interface GameDataTransport {
  readonly kind: GameDataTransportKind;
  start(params: {
    gameId: string;
    onBroadcast: TransportBroadcastListener;
    onLifecycle?: TransportLifecycleListener;
    onCustomEvent?: TransportCustomEventListener;
    onSnapshot?: TransportSnapshotListener;
  }): void | Promise<void>;
  stop(): void | Promise<void>;
}

export type GameDataStoreSnapshot = CachedGameData | null;

export type GameDataSourceOption =
  | GameDataTransportKind
  | undefined
  | null;
