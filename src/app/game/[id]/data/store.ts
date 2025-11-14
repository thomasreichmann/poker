import type { Card } from "@/db/schema/cards";
import type { CachedGameData } from "../_hooks/realtime/applyBroadcastToCache";
import {
  normalizeCards,
  type CachedGameData as CachedData,
} from "../_hooks/realtime/applyBroadcastToCache";
import { applyBroadcastToCachedState } from "../_hooks/realtime/reducers";
import type { BroadcastPayload } from "./types";

type Listener = () => void;

type HandTransitionHook = () => void;

type MergePrivateCardsOptions = {
  userId?: string | null;
  handId?: number | null;
  cards: Card[] | null | undefined;
};

export class GameDataStore {
  private snapshot: CachedGameData | null = null;
  private listeners = new Set<Listener>();

  getSnapshot = (): CachedGameData | null => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  hydrate(snapshot: CachedGameData | null) {
    this.commit(snapshot);
  }

  clear() {
    if (this.snapshot === null) return;
    this.commit(null);
  }

  applyBroadcast(payload: BroadcastPayload, hooks?: { onHandTransition?: HandTransitionHook }) {
    if (!this.snapshot) return;
    const next = applyBroadcastToCachedState(
      this.snapshot,
      payload.table,
      payload.event,
      payload.newRow,
      payload.oldRow,
      () => hooks?.onHandTransition?.()
    );
    this.commit(next);
  }

  mergePrivateCards(options: MergePrivateCardsOptions) {
    if (!this.snapshot) return;
    const { userId, handId, cards } = options;
    if (!userId || !handId || !Array.isArray(cards) || cards.length === 0) {
      return;
    }
    const me = this.snapshot.players.find((p) => p.userId === userId);
    if (!me) return;
    const privateCards = cards.filter(
      (c) => c.playerId === me.id && c.handId === handId
    );
    if (privateCards.length === 0) return;
    const withoutMine = this.snapshot.cards.filter((c) => c.playerId !== me.id);
    const merged = normalizeCards([
      ...withoutMine,
      ...privateCards,
    ] as CachedData["cards"]);
    this.commit({ ...this.snapshot, cards: merged });
  }

  private commit(next: CachedGameData | null) {
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}

export function createGameDataStore(initial?: CachedGameData | null) {
  const store = new GameDataStore();
  if (initial) {
    store.hydrate(initial);
  }
  return store;
}
