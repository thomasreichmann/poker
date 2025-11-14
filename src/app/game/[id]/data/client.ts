import type { Card } from "@/db/schema/cards";
import type { CachedGameData } from "../_hooks/realtime/applyBroadcastToCache";
import { createGameDataStore, GameDataStore } from "./store";
import { createTransport } from "./transports";
import type { GameDataTransportKind } from "./types";
import type { GameEvent } from "@/lib/realtime/publisher";

type LifecycleUnsub = () => void;

type HandTransitionListener = () => void;

type MergeCardsOptions = {
  userId?: string | null;
  handId?: number | null;
  cards: Card[] | null | undefined;
};

export class GameDataClient {
  readonly kind: GameDataTransportKind;
  private store: GameDataStore;
  private transportCleanup: LifecycleUnsub | null = null;
  private currentGameId: string | null = null;
  private handTransitionListeners = new Set<HandTransitionListener>();

  constructor(options: { kind: GameDataTransportKind; initialSnapshot?: CachedGameData | null }) {
    this.kind = options.kind;
    this.store = createGameDataStore(options.initialSnapshot ?? null);
  }

  connect(gameId: string) {
    if (!gameId) return;
    if (this.currentGameId === gameId && this.transportCleanup) {
      return;
    }
    this.disconnect();
    this.currentGameId = gameId;
    const transport = createTransport(this.kind);
    void transport.start({
      gameId,
      onBroadcast: (payload) => {
        this.store.applyBroadcast(payload, {
          onHandTransition: () => this.notifyHandTransition(),
        });
      },
      onSnapshot: (snapshot) => {
        this.store.hydrate(snapshot);
      },
      onCustomEvent: (event) => this.handleCustomEvent(event),
    });
    this.transportCleanup = () => {
      void transport.stop();
    };
  }

  disconnect() {
    this.transportCleanup?.();
    this.transportCleanup = null;
    this.currentGameId = null;
  }

  dispose() {
    this.disconnect();
    this.store.clear();
    this.handTransitionListeners.clear();
  }

  hydrate(snapshot: CachedGameData | null) {
    this.store.hydrate(snapshot);
  }

  clearSnapshot() {
    this.store.clear();
  }

  mergePrivateCards(options: MergeCardsOptions) {
    this.store.mergePrivateCards(options);
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  getSnapshot = () => this.store.getSnapshot();

  onHandTransition(listener: HandTransitionListener): () => void {
    this.handTransitionListeners.add(listener);
    return () => {
      this.handTransitionListeners.delete(listener);
    };
  }

  private notifyHandTransition() {
    this.handTransitionListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // no-op
      }
    });
  }

  // Placeholder for future custom event routing; currently no-ops.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleCustomEvent(_event: GameEvent) {
    // Custom events (e.g., batched game notifications) can be handled here later.
  }
}

export function createGameDataClient(kind: GameDataTransportKind) {
  return new GameDataClient({ kind });
}
