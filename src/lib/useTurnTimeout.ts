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
  // Optional absolute deadline from server; if provided, overrides durationMs
  deadlineAt?: Date | number | null;
  onTimeoutAction: () => void | Promise<void>;
};

export function useTurnTimeout(options: TurnTimeoutOptions) {
  const { gameId, handId, playerId, round, enabled = true } = options;
  const duration = options.durationMs ?? 30_000;
  const deadlineAt = options.deadlineAt ?? null;
  const onTimeout = options.onTimeoutAction;

  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledKeyRef = useRef<string | null>(null);
  const ownerIdRef = useRef<string | null>(null);
  const didScheduleRef = useRef<boolean>(false);
  const latestPlayerRef = useRef<string | null>(null);
  const onTimeoutRef = useRef<TurnTimeoutOptions["onTimeoutAction"] | null>(
    null
  );

  // Track the latest player turn for race-free validation in setTimeout callback
  useEffect(() => {
    latestPlayerRef.current = playerId ?? null;
  }, [playerId]);

  // Keep latest timeout handler without re-scheduling timers on identity changes
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

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

    didScheduleRef.current = false;
    ownerIdRef.current = null;

    // Compute delay from absolute deadline if provided
    const now = Date.now();
    const absoluteMs =
      typeof deadlineAt === "number"
        ? deadlineAt
        : deadlineAt instanceof Date
        ? deadlineAt.getTime()
        : null;
    let delayMs = duration;
    if (absoluteMs != null) {
      delayMs = absoluteMs - now;
      if (delayMs <= 0) {
        // If already overdue (e.g., refresh mid-turn), fire in 1s
        delayMs = 1_000;
      }
    }

    if (registry) {
      // If a timer for this turn already exists, don't schedule another
      const existing = registry.get(key);
      if (existing) {
        // We did not schedule a timer in this effect run
        return () => {
          // Cleanup: only clear local timer; never clear shared registry if we don't own it
          if (localTimerRef.current) {
            try {
              clearTimeout(localTimerRef.current);
            } catch {}
            localTimerRef.current = null;
          }
        };
      }
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
        const fn = onTimeoutRef.current;
        if (fn) void fn();
      }, Math.max(0, delayMs));

      registry.set(key, { ownerId, timer });
      localTimerRef.current = timer;
      ownerIdRef.current = ownerId;
      didScheduleRef.current = true;
    } else {
      // Fallback: still schedule a local timer
      localTimerRef.current = setTimeout(() => {
        if (
          scheduledKeyRef.current !==
          makeTurnKey(gameId, handId ?? "", latestPlayerRef.current ?? "")
        )
          return;
        const fn = onTimeoutRef.current;
        if (fn) void fn();
      }, Math.max(0, delayMs));
      didScheduleRef.current = true;
    }

    return () => {
      // Clear local timer always
      if (localTimerRef.current) {
        try {
          clearTimeout(localTimerRef.current);
        } catch {}
        localTimerRef.current = null;
      }
      // Only clear the shared registry entry if we are the owner that scheduled it
      const registry = getTurnTimeoutRegistry();
      if (registry && didScheduleRef.current && ownerIdRef.current) {
        const keyToClear = scheduledKeyRef.current ?? "";
        const entry = registry.get(keyToClear);
        if (entry && entry.ownerId === ownerIdRef.current) {
          try {
            clearTimeout(entry.timer);
          } catch {}
          registry.delete(keyToClear);
        }
      }
      // Reset scheduling refs
      didScheduleRef.current = false;
      ownerIdRef.current = null;
    };
  }, [enabled, gameId, handId, playerId, round, duration, deadlineAt]);
}
