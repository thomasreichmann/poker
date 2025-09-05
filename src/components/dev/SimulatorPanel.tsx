"use client";

import { useGameData } from "@/app/game/[id]/_hooks/useGameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PokerAction } from "@/db/schema/actionTypes";
import { useDevAccess } from "@/hooks/useDevAccess";
import type {
  GameState as PureGameState,
  Player as PurePlayer,
} from "@/lib/poker/types";
import { makeRng } from "@/lib/simulator/rng";
import { makeStrategy } from "@/lib/simulator/strategies";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const STRATEGIES = [
  { id: "human", label: "Human (manual)" },
  { id: "always_fold", label: "Always Fold" },
  { id: "call_any", label: "Call Any" },
  { id: "tight_aggro", label: "Tight Aggro" },
  { id: "loose_passive", label: "Loose Passive" },
  { id: "scripted", label: "Scripted" },
] as const;

type StrategyId = (typeof STRATEGIES)[number]["id"];

type SimulatorPanelProps = {
  tableId: string;
  players: { id: string; displayName?: string | null }[];
  floating?: boolean;
  embedded?: boolean;
};

export function SimulatorPanel({
  tableId,
  players,
  floating = true,
  embedded = false,
}: SimulatorPanelProps) {
  const { canShowDevFeatures } = useDevAccess();
  const trpc = useTRPC();
  const actAsPlayerMutation = useMutation(
    trpc.dev.actAsPlayer.mutationOptions()
  );

  const { dbGame, dbPlayers, yourDbPlayer } = useGameData(tableId);

  const [enabled, setEnabled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  // pause removed from UI; simulator runs when enabled
  const [seed, setSeed] = useState("");
  const [minDelay, setMinDelay] = useState(200);
  const [maxDelay, setMaxDelay] = useState(800);
  const [defaultStrategy, setDefaultStrategy] =
    useState<StrategyId>("call_any");
  const [perSeat, setPerSeat] = useState<Record<string, StrategyId | "">>({});
  const [perSeatHydrated, setPerSeatHydrated] = useState(false);

  useEffect(() => {
    // Preserve selections, add new players, prune removed
    if (!players || players.length === 0) return;
    setPerSeat((prev) => {
      const next: Record<string, StrategyId | ""> = { ...prev };
      for (const p of players) {
        if (!(p.id in next)) next[p.id] = "";
      }
      for (const key of Object.keys(next)) {
        if (!players.find((p) => p.id === key)) delete next[key];
      }
      return next;
    });
  }, [players]);

  // NOTE: hooks must remain unconditional; we gate rendering below

  const onToggleEnable = async () => {
    setEnabled((v) => !v);
  };

  // persistence key for per-seat overrides (per table)
  const perSeatStorageKey = `dev.simulator.perSeat.${tableId}`;
  const defaultStrategyStorageKey = `dev.simulator.defaultStrategy.${tableId}`;
  const enabledStorageKey = `dev.simulator.enabled.${tableId}`;

  // hydrate enabled from storage
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(enabledStorageKey);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "boolean") setEnabled(parsed);
      }
    } catch {}
  }, [enabledStorageKey]);

  // persist enabled when it changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(enabledStorageKey, JSON.stringify(enabled));
      }
    } catch {}
  }, [enabled, enabledStorageKey]);

  // hydrate per-seat overrides from storage
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" &&
        localStorage.getItem(perSeatStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, StrategyId | "">;
        if (parsed && typeof parsed === "object") {
          setPerSeat(parsed);
        }
      }
    } catch {}
    setPerSeatHydrated(true);
  }, [perSeatStorageKey]);

  // persist per-seat overrides whenever they change
  useEffect(() => {
    try {
      if (!perSeatHydrated) return;
      if (typeof window !== "undefined") {
        localStorage.setItem(perSeatStorageKey, JSON.stringify(perSeat));
      }
    } catch {}
  }, [perSeat, perSeatStorageKey, perSeatHydrated]);

  // hydrate default strategy from storage
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(defaultStrategyStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed === "human" ||
          parsed === "always_fold" ||
          parsed === "call_any" ||
          parsed === "tight_aggro" ||
          parsed === "loose_passive" ||
          parsed === "scripted"
        ) {
          setDefaultStrategy(parsed);
        }
      }
    } catch {}
  }, [defaultStrategyStorageKey]);

  // persist default strategy when it changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          defaultStrategyStorageKey,
          JSON.stringify(defaultStrategy)
        );
      }
    } catch {}
  }, [defaultStrategy, defaultStrategyStorageKey]);

  // Build a minimal pure game state for strategy evaluation
  const pureState: PureGameState | null = useMemo(() => {
    if (!dbGame) return null;
    const purePlayers: PurePlayer[] = dbPlayers.map((p) => ({
      id: String(p.id),
      seat: p.seat,
      stack: p.stack ?? 0,
      currentBet: p.currentBet ?? 0,
      hasFolded: Boolean(p.hasFolded),
      isButton: Boolean(p.isButton),
      hasWon: Boolean(p.hasWon),
      showCards: Boolean(p.showCards),
      holeCards: [],
    }));
    const state: PureGameState = {
      id: String(dbGame.id),
      status: (dbGame.status as PureGameState["status"]) ?? "active",
      currentRound:
        (dbGame.currentRound as PureGameState["currentRound"]) ?? "pre-flop",
      currentHighestBet: dbGame.currentHighestBet ?? 0,
      currentPlayerTurn: dbGame.currentPlayerTurn
        ? String(dbGame.currentPlayerTurn)
        : undefined,
      pot: dbGame.pot ?? 0,
      bigBlind: dbGame.bigBlind ?? 0,
      smallBlind: dbGame.smallBlind ?? 0,
      lastAction: (dbGame.lastAction as PureGameState["lastAction"]) ?? "check",
      lastBetAmount: dbGame.lastBetAmount ?? 0,
      players: purePlayers,
      communityCards: [],
      deck: [],
      handId: dbGame.handId ?? 0,
    };
    return state;
  }, [dbGame, dbPlayers]);

  // Orchestrator: the client who enabled acts as the master scheduler
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTurnRef = useRef<string | null>(null);
  const rngRef = useRef<() => number>(() => Math.random());

  useEffect(() => {
    rngRef.current = makeRng(seed || undefined);
  }, [seed]);

  // Clear pending timer on unmount or when disabling
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!canShowDevFeatures) return;
    if (!enabled) return;
    if (!pureState || !pureState.currentPlayerTurn) return;

    const currentTurn = pureState.currentPlayerTurn;

    // Skip if it's our own turn (master remains manual)
    if (yourDbPlayer && currentTurn === String(yourDbPlayer.id)) return;

    // Resolve strategy for the current seat
    const overrideStrategy = perSeat[currentTurn];
    const seatStrategy: StrategyId | undefined =
      (overrideStrategy !== "" ? overrideStrategy : defaultStrategy) || undefined;

    if (!seatStrategy || seatStrategy === "human") return;

    const strat = makeStrategy({ id: seatStrategy });
    const decision = strat.decide({ game: pureState, playerId: currentTurn });
    if (!decision) return;

    // Capture the latest observed turn for race-free validation later
    latestTurnRef.current = currentTurn;

    const floorMin = Math.max(0, Math.min(minDelay, maxDelay));
    const ceilMax = Math.max(0, Math.max(minDelay, maxDelay));
    const jitter =
      floorMin +
      Math.floor(rngRef.current() * Math.max(0, ceilMax - floorMin + 1));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      // Bail if turn changed since scheduling
      if (latestTurnRef.current !== currentTurn) return;
      // Also bail if the master is now up (no auto-acting for master)
      if (yourDbPlayer && latestTurnRef.current === String(yourDbPlayer.id)) return;
      await actAsPlayerMutation.mutateAsync({
        gameId: tableId,
        targetPlayerId: currentTurn,
        action: decision.action as PokerAction,
        amount: decision.amount,
        actorSource: "bot",
        botStrategy: seatStrategy,
      });
    }, Math.max(0, jitter));

    // Cleanup: cancel any pending scheduled action when dependencies change
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [
    canShowDevFeatures,
    enabled,
    pureState?.id,
    pureState?.currentPlayerTurn,
    pureState?.currentHighestBet,
    defaultStrategy,
    perSeat,
    minDelay,
    maxDelay,
    yourDbPlayer,
    tableId,
    actAsPlayerMutation,
    pureState,
  ]);

  if (!canShowDevFeatures) return null;

  const body = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">Min delay (ms)</label>
          <Input
            type="number"
            value={minDelay}
            onChange={(e) => setMinDelay(Number(e.target.value) || 0)}
            className="bg-slate-700 border-slate-600 text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs">Max delay (ms)</label>
          <Input
            type="number"
            value={maxDelay}
            onChange={(e) => setMaxDelay(Number(e.target.value) || 0)}
            className="bg-slate-700 border-slate-600 text-xs h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">Seed</label>
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="optional"
            className="bg-slate-700 border-slate-600 text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs">Default strategy</label>
          <Select
            value={defaultStrategy}
            onValueChange={(v: StrategyId) => setDefaultStrategy(v)}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 h-8 text-xs">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs">Per-seat overrides</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 min-w-0">
              <div className="truncate text-[10px] text-slate-400 min-w-0 flex-1">
                {p.displayName || p.id}
              </div>
              <div className="flex-none">
                <Select
                  value={perSeat[p.id] || "inherit"}
                  onValueChange={(v) =>
                    setPerSeat((prev) => ({
                      ...prev,
                      [p.id]: v === "inherit" ? "" : (v as StrategyId),
                    }))
                  }
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">inherit</SelectItem>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={onToggleEnable}
          className={
            enabled
              ? "flex-1 bg-emerald-600 border-emerald-600"
              : "flex-1 bg-slate-700 border-slate-600 text-white"
          }
        >
          {enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <Card
      className={cn(
        "w-96 bg-slate-800 border-slate-700 text-white shadow-xl z-50",
        floating && "fixed top-20 right-4"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <CardTitle className="text-sm">Simulator</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && <CardContent className="space-y-3">{body}</CardContent>}
    </Card>
  );
}
