import type { GameEvent } from "@/lib/realtime/publisher";
import { mockBroadcastScript, mockGameSnapshot } from "../fixtures/mockGame";
import type { BroadcastPayload, GameDataTransport } from "../types";

export class MockTransport implements GameDataTransport {
  readonly kind = "mock" as const;
  private timers: Array<ReturnType<typeof setTimeout>> = [];

  async start({
    onBroadcast,
    onSnapshot,
    onCustomEvent,
  }: {
    gameId: string;
    onBroadcast: (payload: BroadcastPayload) => void;
    onSnapshot?: (snapshot: typeof mockGameSnapshot) => void;
    onCustomEvent?: (event: GameEvent) => void;
  }) {
    onSnapshot?.(mockGameSnapshot);
    this.timers = mockBroadcastScript.map((event) =>
      setTimeout(() => {
        if (event.kind === "broadcast") {
          onBroadcast(event.payload);
        } else if (event.kind === "custom") {
          onCustomEvent?.(event.event);
        }
      }, event.delayMs)
    );
  }

  async stop() {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }
}
