import { getSupabaseBrowserClient } from "@/supabase/client";
import { AUTH_SET_DEBOUNCE_MS } from "@/supabase/constants";
import { acquireTopicChannel } from "@/supabase/realtimeHelpers";
import { realtimeStatusStore } from "@/supabase/realtimeStatus";
import {
  isCustomBroadcast,
  isLegacyDbBroadcast,
  type RealtimeEventData,
} from "../../_hooks/types";
import type { GameEvent } from "@/lib/realtime/publisher";
import type {
  BroadcastPayload,
  GameDataTransport,
} from "../types";

export class SupabaseTransport implements GameDataTransport {
  readonly kind = "supabase" as const;
    private removeChannel: (() => void) | null = null;
    private removeAuthListener: (() => void) | null = null;
  private static socketListenersAttached = false;

  async start({
    gameId,
    onBroadcast,
    onCustomEvent,
  }: {
    gameId: string;
    onBroadcast: (payload: BroadcastPayload) => void;
    onCustomEvent?: (event: GameEvent) => void;
  }) {
    const supabase = getSupabaseBrowserClient();
    const topic = `topic:${gameId}`;

    const handleBroadcast = (raw: RealtimeEventData) => {
      if (isLegacyDbBroadcast(raw)) {
        try {
          realtimeStatusStore.recordBroadcast(
            raw.event,
            raw.payload.table
          );
        } catch {
          // no-op
        }
        onBroadcast({
          table: raw.payload.table as BroadcastPayload["table"],
          event: raw.payload.event as BroadcastPayload["event"],
          newRow: raw.payload.record,
          oldRow: raw.payload.old_record,
        });
        return;
      }

      if (isCustomBroadcast(raw)) {
        onCustomEvent?.(raw.payload.event);
        return;
      }

      throw new Error(`Unknown broadcast payload: ${JSON.stringify(raw)}`);
    };

    const removeExistingChannels = async () => {
      try {
        const anyClient = supabase as unknown as {
          getChannels?: () => Array<{ topic?: string }>;
          removeChannel: (channel: { topic?: string }) => Promise<void> | void;
        };
        const existing = anyClient.getChannels?.() ?? [];
        for (const ch of existing) {
          if (ch.topic === topic) {
            await anyClient.removeChannel(ch);
          }
        }
      } catch {
        // ignore best-effort cleanup
      }
    };

    const setupAuth = async () => {
      const state = {
        lastToken: "" as string | undefined,
        lastSetAt: 0,
      };
      const maybeSetAuth = (token?: string) => {
        if (!token) return;
        const now = Date.now();
        if (
          state.lastToken === token &&
          now - state.lastSetAt < AUTH_SET_DEBOUNCE_MS
        ) {
          return;
        }
        state.lastToken = token;
        state.lastSetAt = now;
        supabase.realtime.setAuth(token);
      };
      const session = await supabase.auth.getSession();
      maybeSetAuth(session.data.session?.access_token);
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        maybeSetAuth(newSession?.access_token);
      });
      this.removeAuthListener = () => {
        data.subscription.unsubscribe();
      };
    };

    await setupAuth();
    await removeExistingChannels();

    this.removeChannel = acquireTopicChannel(
      supabase,
      topic,
      (status) => {
        try {
          realtimeStatusStore.recordLifecycle(topic, status);
        } catch {
          // ignore telemetry errors
        }
      },
      (payload) => handleBroadcast(payload as RealtimeEventData)
    );

    if (!SupabaseTransport.socketListenersAttached) {
      SupabaseTransport.socketListenersAttached = true;
      try {
        const realtime = (supabase as unknown as {
          realtime: {
            onOpen?: (cb: () => void) => void;
            onClose?: (cb: (ev?: unknown) => void) => void;
            onError?: (cb: (err?: unknown) => void) => void;
          };
        }).realtime;
        realtime.onOpen?.(() => {
          realtimeStatusStore.recordLifecycle("socket", "OPEN");
        });
        realtime.onClose?.((ev) => {
          realtimeStatusStore.recordLifecycle(
            "socket",
            `CLOSE:${JSON.stringify(ev ?? {})}`
          );
        });
        realtime.onError?.((err) => {
          realtimeStatusStore.recordLifecycle(
            "socket",
            `ERROR:${JSON.stringify(err ?? {})}`
          );
        });
      } catch {
        // swallow telemetry wiring errors
      }
    }
  }

  async stop() {
    try {
      await this.removeChannel?.();
    } catch {
      // ignore cleanup errors
    }
    this.removeChannel = null;
    try {
      this.removeAuthListener?.();
    } catch {
      // ignore cleanup errors
    }
    this.removeAuthListener = null;
  }
}
