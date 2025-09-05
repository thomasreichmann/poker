"use client";

import { useEffect, useRef } from "react";
import { getTurnTimeoutRegistry, makeTurnKey } from "./utils";

export type TurnTimeoutOptions = {
  gameId?: string | null;
  handId?: string | number | null;
  playerId?: string | null;
  round?: string | null;
  enabled?: boolean;
  durationMs?: number; // default 30_000
  onTimeoutAction: () => void | Promise<void>;
};

export function useTurnTimeout(options: TurnTimeoutOptions) {
  const { gameId, handId, playerId, round, enabled = true } = options;
  const duration = options.durationMs ?? 30_000;
  const onTimeout = options.onTimeoutAction;

  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledKeyRef = useRef<string | null>(null);
  const latestPlayerRef = useRef<string | null>(null);

  // Track the latest player turn for race-free validation in setTimeout callback
  useEffect(() => {
    latestPlayerRef.current = playerId ?? null;
  }, [playerId]);

  useEffect(() => {
    if (!enabled) return;
    if (!gameId || !playerId) return;
    if (round === "showdown") return;

    // Clear any previous local timer first
    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }

    const key = makeTurnKey(gameId, handId ?? "", playerId);
    scheduledKeyRef.current = key;
    const registry = getTurnTimeoutRegistry();

    if (registry) {
      // If a timer for this turn already exists, don't schedule another
      const existing = registry.get(key);
      if (existing) return;
      const ownerId =
        typeof crypto !== "undefined" &&
        (crypto as unknown as { randomUUID?: () => string }).randomUUID
          ? (crypto as unknown as { randomUUID: () => string }).randomUUID()
          : Math.random().toString(36).slice(2);

      const timer = setTimeout(() => {
        // Bail if the turn changed since scheduling
        if (
          scheduledKeyRef.current !==
          makeTurnKey(gameId, handId ?? "", latestPlayerRef.current ?? "")
        ) {
          const cur = registry.get(key);
          if (cur && cur.ownerId === ownerId) registry.delete(key);
          return;
        }
        const cur = registry.get(key);
        if (!cur || cur.ownerId !== ownerId) return;
        registry.delete(key);
        void onTimeout();
      }, Math.max(0, duration));

      registry.set(key, { ownerId, timer });
      localTimerRef.current = timer;
    } else {
      // Fallback: still schedule a local timer
      localTimerRef.current = setTimeout(() => {
        if (
          scheduledKeyRef.current !==
          makeTurnKey(gameId, handId ?? "", latestPlayerRef.current ?? "")
        )
          return;
        void onTimeout();
      }, Math.max(0, duration));
    }

    return () => {
      // Clear local timer
      if (localTimerRef.current) {
        try {
          clearTimeout(localTimerRef.current);
        } catch {}
        localTimerRef.current = null;
      }
      // Also clear the registry entry if present
      const registry = getTurnTimeoutRegistry();
      if (registry) {
        const entry = registry.get(scheduledKeyRef.current ?? "");
        if (entry) {
          try {
            clearTimeout(entry.timer);
          } catch {}
          registry.delete(scheduledKeyRef.current ?? "");
        }
      }
    };
  }, [enabled, gameId, handId, playerId, round, duration, onTimeout]);
}
