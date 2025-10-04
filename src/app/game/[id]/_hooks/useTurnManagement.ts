"use client";

import { useTurnTimeout } from "@/lib/useTurnTimeout";
import { useCallback, useEffect, useMemo, useRef } from "react";

export type TurnContext = {
  meId?: string | null;
  gameId?: string | null;
  handId?: number | null;
  status?: string | null;
  currentRound?: string | null;
  currentPlayerTurn?: string | null;
  turnMs?: number | null;
  turnTimeoutAt?: Date | string | number | null;
};

export function computeBackupDelayMs(
  turnTimeoutAt?: Date | string | number | null
) {
  if (!turnTimeoutAt) return null;
  let deadline: number | null = null;
  if (turnTimeoutAt instanceof Date) deadline = turnTimeoutAt.getTime();
  else if (typeof turnTimeoutAt === "number") deadline = turnTimeoutAt;
  else if (typeof turnTimeoutAt === "string") {
    const s = turnTimeoutAt;
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
    const source = hasTz ? s : `${s}Z`;
    const parsed = Date.parse(source);
    deadline = Number.isFinite(parsed) ? parsed : null;
  }
  if (deadline == null) return null;
  const now = Date.now();
  // Small grace to let the primary (turn holder) win; keep UX snappy
  const GRACE_MS = 300;
  return Math.max(150, deadline - now + GRACE_MS);
}

export function useTurnManagement(
  ctx: TurnContext,
  isYourTurn: boolean,
  onTurnTimeout: () => void | Promise<void>
) {
  // Primary timer (turn holder at absolute deadline)
  useTurnTimeout({
    gameId: ctx.gameId,
    handId: ctx.handId,
    playerId: ctx.currentPlayerTurn ?? undefined,
    round: ctx.currentRound ?? undefined,
    // Enable when it's your turn regardless of whether server populated a deadline yet
    enabled: Boolean(ctx.status === "active" && isYourTurn),
    durationMs: Math.max(1_000, Number(ctx.turnMs ?? 30_000)),
    deadlineAt: ctx.turnTimeoutAt ?? null,
    onTimeoutAction: onTurnTimeout,
  });

  // Fallback timer for non-turn holders: if no absolute deadline, use turnMs + grace
  const backupDelayMs = useMemo(() => {
    const fromDeadline = computeBackupDelayMs(ctx.turnTimeoutAt);
    if (fromDeadline != null) return fromDeadline;
    const base = Math.max(1_000, Number(ctx.turnMs ?? 30_000));
    return base + 1_250;
  }, [ctx.turnTimeoutAt, ctx.turnMs]);

  useTurnTimeout({
    gameId: ctx.gameId,
    handId: ctx.handId,
    playerId: ctx.currentPlayerTurn ?? undefined,
    round: ctx.currentRound ?? undefined,
    enabled: Boolean(ctx.status === "active" && !isYourTurn),
    durationMs: backupDelayMs,
    deadlineAt: null,
    onTimeoutAction: onTurnTimeout,
  });

  // Proactive catch-up for missed deadline
  const lastCatchupKeyRef = useRef<string | null>(null);
  const checkAndTimeoutIfOverdue = useCallback(() => {
    if (
      !ctx.gameId ||
      !isYourTurn ||
      !ctx.turnTimeoutAt ||
      !ctx.currentPlayerTurn
    )
      return;
    const key = `${ctx.gameId}:${String(ctx.handId ?? "")}:${String(
      ctx.currentPlayerTurn ?? ""
    )}`;
    const now = Date.now();
    let deadlineMs: number | null = null;
    if (ctx.turnTimeoutAt instanceof Date)
      deadlineMs = ctx.turnTimeoutAt.getTime();
    else if (typeof ctx.turnTimeoutAt === "number")
      deadlineMs = ctx.turnTimeoutAt;
    else if (typeof ctx.turnTimeoutAt === "string") {
      const s = ctx.turnTimeoutAt;
      const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
      const source = hasTz ? s : `${s}Z`;
      const parsed = Date.parse(source);
      deadlineMs = Number.isFinite(parsed) ? parsed : null;
    }
    if (deadlineMs == null) return;
    if (now >= deadlineMs + 300) {
      if (lastCatchupKeyRef.current !== key) {
        lastCatchupKeyRef.current = key;
        void onTurnTimeout();
      }
    }
  }, [
    ctx.gameId,
    ctx.handId,
    ctx.turnTimeoutAt,
    ctx.currentPlayerTurn,
    isYourTurn,
    onTurnTimeout,
  ]);

  useEffect(() => {
    checkAndTimeoutIfOverdue();
  }, [checkAndTimeoutIfOverdue]);

  useEffect(() => {
    const handler = () => checkAndTimeoutIfOverdue();
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", handler);
      window.addEventListener("online", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("visibilitychange", handler);
        window.removeEventListener("online", handler);
      }
    };
  }, [checkAndTimeoutIfOverdue]);

  // Watchdog: while it's your turn, periodically re-check overdue to guard against missed timers
  useEffect(() => {
    if (!(ctx.status === "active" && isYourTurn)) return;
    const interval = setInterval(() => {
      checkAndTimeoutIfOverdue();
    }, 1000);
    return () => clearInterval(interval);
  }, [ctx.status, isYourTurn, checkAndTimeoutIfOverdue]);
}
