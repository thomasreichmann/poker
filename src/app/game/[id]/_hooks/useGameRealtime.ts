"use client";

import { getSupabaseBrowserClient } from "@/supabase/client";
import { AUTH_SET_DEBOUNCE_MS } from "@/supabase/constants";
// import { debug } from "@/supabase/debug";
import { logger } from "@/logger/client";
import { acquireTopicChannel } from "@/supabase/realtimeHelpers";
import { realtimeStatusStore } from "@/supabase/realtimeStatus";
import { useEffect, useRef } from "react";
import { type CachedGameData } from "./realtime/applyBroadcastToCache";
import { applyBroadcastToCachedState } from "./realtime/reducers";

type BackendEventPayload = {
  event: {
    type: string;
    gameId: string;
    lastActionId: number | null;
    updatedAt: string;
    payload: Record<string, unknown>;
  };
};

export function useGameRealtime(
  id: string,
  setCache: (
    updater: (prev: CachedGameData | null) => CachedGameData | null
  ) => void,
  onAuthToken?: (token: string) => void,
  onHandTransition?: () => void
) {
  const onAuthTokenRef = useRef(onAuthToken);
  const onHandTransitionRef = useRef(onHandTransition);
  const setCacheRef = useRef(setCache);
  onAuthTokenRef.current = onAuthToken;
  onHandTransitionRef.current = onHandTransition;
  setCacheRef.current = setCache;
  const stoppedRef = useRef(false);
  const retryDelayRef = useRef(1000);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const socketListenersAttachedRef = useRef(false);
  const lastAuthTokenRef = useRef<string | undefined>(undefined);
  const lastSetAuthAtRef = useRef<number>(0);

  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();
    let authUnsub: (() => void) | undefined;

    function applyBroadcast(
      event: string,
      table: string,
      newRow: Record<string, unknown>,
      oldRow: Record<string, unknown>
    ) {
      setCacheRef.current?.((prev) => {
        if (!prev) return prev;
        return applyBroadcastToCachedState(
          prev,
          table as
            | "poker_games"
            | "poker_players"
            | "poker_cards"
            | "poker_actions",
          event as "INSERT" | "UPDATE" | "DELETE",
          newRow,
          oldRow,
          () => onHandTransitionRef.current?.()
        );
      });
    }

    function onBroadcast(payload: { payload: unknown; event: string }) {
      const maybeBackend = payload?.payload as BackendEventPayload;
      const event = maybeBackend?.event;
      if (event && event.gameId === id) {
        // Backend-driven event path: rely on summary payload
        if (process.env.NODE_ENV !== "production") {
          logger.debug({ event }, "realtime.backend_event");
        }
        // Minimal application: just invalidate snapshot on hand transitions; otherwise let UI refetch when needed
        setCacheRef.current?.((prev) => prev);
        return;
      }

      // Fallback: legacy DB-broadcast path (kept for shadow mode)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = payload?.payload as any;
      if (!p) return;
      if (p.schema !== "public" || !p.table) return;
      applyBroadcast(payload.event, p.table, p.record, p.old_record);
    }

    const topic = `topic:${id}`;

    let removeChannel: (() => void) | undefined;

    const removeExistingChannels = async () => {
      try {
        const s = supabase as unknown as {
          getChannels?: () => Array<{ topic?: string }>;
          removeChannel: (ch: { topic?: string }) => Promise<void> | void;
        };
        const existing = s.getChannels?.() ?? [];
        for (const ch of existing) {
          if (ch && ch.topic === topic) {
            await s.removeChannel(ch);
          }
        }
      } catch {}
    };

    const setupChannel = () =>
      acquireTopicChannel(
        supabase,
        topic,
        (status) => {
          try {
            realtimeStatusStore.recordLifecycle(topic, status);
          } catch {}
          if (status === "SUBSCRIBED") retryDelayRef.current = 1000;
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = (payload as any)?.payload;
          if (p?.table && typeof p.table === "string") {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const evt = (payload as any)?.event;
              if (evt) realtimeStatusStore.recordBroadcast(evt, p.table);
            } catch {}
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onBroadcast(payload as any);
        }
      );

    const setup = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const now = Date.now();
        if (
          lastAuthTokenRef.current !== token &&
          now - lastSetAuthAtRef.current > AUTH_SET_DEBOUNCE_MS
        ) {
          lastAuthTokenRef.current = token;
          lastSetAuthAtRef.current = now;
          supabase.realtime.setAuth(token);
        }
        try {
          onAuthTokenRef.current?.(token);
        } catch {}
      }
      const authListener = supabase.auth.onAuthStateChange(
        (_event, session) => {
          const t = session?.access_token;
          if (t) {
            const now = Date.now();
            if (
              lastAuthTokenRef.current !== t &&
              now - lastSetAuthAtRef.current > AUTH_SET_DEBOUNCE_MS
            ) {
              lastAuthTokenRef.current = t;
              lastSetAuthAtRef.current = now;
              supabase.realtime.setAuth(t);
            }
            try {
              onAuthTokenRef.current?.(t);
            } catch {}
          }
        }
      );
      authUnsub = () => authListener.data?.subscription.unsubscribe();
      await removeExistingChannels();
      removeChannel = setupChannel();

      // Attach socket-level listeners once for diagnostics
      if (!socketListenersAttachedRef.current) {
        socketListenersAttachedRef.current = true;
        try {
          const r = (
            supabase as unknown as {
              realtime: {
                onOpen?: (cb: () => void) => void;
                onClose?: (cb: (ev?: unknown) => void) => void;
                onError?: (cb: (err?: unknown) => void) => void;
              };
            }
          ).realtime;
          r.onOpen?.(() => {
            try {
              realtimeStatusStore.recordLifecycle("socket", "OPEN");
            } catch {}
          });
          r.onClose?.((ev) => {
            try {
              const details =
                ev && typeof ev === "object"
                  ? JSON.stringify(ev)
                  : String(ev ?? "");
              realtimeStatusStore.recordLifecycle("socket", `CLOSE:${details}`);
            } catch {}
          });
          r.onError?.((err) => {
            try {
              const details =
                err && typeof err === "object"
                  ? JSON.stringify(err)
                  : String(err ?? "");
              realtimeStatusStore.recordLifecycle("socket", `ERROR:${details}`);
            } catch {}
          });
        } catch {}
      }
    };

    stoppedRef.current = false;
    retryDelayRef.current = 1000;
    void setup();

    return () => {
      stoppedRef.current = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = undefined;
      }
      try {
        removeChannel?.();
      } catch {}
      try {
        authUnsub?.();
      } catch {}
    };
  }, [id]);
}
