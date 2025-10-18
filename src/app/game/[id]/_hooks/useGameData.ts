"use client";

import { useToast } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useGameActions } from "./useGameActions";
import { useGameQuery } from "./useGameQuery";
import { useGameRealtime } from "./useGameRealtime";
import { useShowdownEffects } from "./useShowdownEffects";
import { useTurnManagement } from "./useTurnManagement";
import { logger } from "@/logger";

import { PokerAction } from "@/db/schema/actionTypes";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import {
  normalizeCards,
  type CachedGameData,
} from "./realtime/applyBroadcastToCache";

export function useGameData(id: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { me, snapshot, getByIdKey } = useGameQuery(id);

  const getHoleCards = useQuery(
    trpc.game.getHoleCards.queryOptions({ gameId: id })
  );

  // Merge helper: ensure private hole cards are present for the current hand
  const ensureHoleCardsMerged = useCallback(
    (prevIn: CachedGameData | null): CachedGameData | null => {
      if (!prevIn) return prevIn;
      const prev = prevIn as CachedGameData;
      const myUserId = me?.id;
      const myPlayer = myUserId
        ? prev.players.find((p) => p.userId === myUserId)
        : undefined;
      const handId = prev.game?.handId;
      if (!myPlayer || handId == null) return prev;

      const privateCards = Array.isArray(getHoleCards.data)
        ? getHoleCards.data.filter(
            (c) => c.playerId === myPlayer.id && c.handId === handId
          )
        : [];
      if (privateCards.length === 0) return prev;

      const withoutMine = prev.cards.filter((c) => c.playerId !== myPlayer.id);
      const merged = normalizeCards([
        ...withoutMine,
        ...privateCards,
      ] as unknown as CachedGameData["cards"]);
      return { ...prev, cards: merged };
    },
    [getHoleCards.data, me?.id]
  );

  const dbGame = useMemo(() => snapshot?.game ?? null, [snapshot?.game]);
  const dbPlayers = useMemo(() => snapshot?.players ?? [], [snapshot?.players]);
  const dbCards = useMemo(() => snapshot?.cards ?? [], [snapshot?.cards]);

  const yourDbPlayer = useMemo(
    () => dbPlayers.find((p) => p.userId === me?.id) || null,
    [dbPlayers, me?.id]
  );

  const isYourTurn = useMemo(() => {
    if (!dbGame || !yourDbPlayer) return false;
    return dbGame.currentPlayerTurn === yourDbPlayer.id;
  }, [dbGame, yourDbPlayer]);

  const communityCards = useMemo(
    () =>
      dbCards
        .filter((c) => c.playerId === null)
        .map((c, idx) => ({
          suit: c.suit as IPlayingCard["suit"],
          rank: c.rank as IPlayingCard["rank"],
          id: `${c.rank}-${c.suit}-${idx}`,
        })),
    [dbCards]
  );

  const playersBySeat = useMemo(() => {
    return [...dbPlayers].sort((a, b) => a.seat - b.seat);
  }, [dbPlayers]);

  const activePlayerIndex = useMemo(() => {
    const idx = playersBySeat.findIndex(
      (p) => p.id === dbGame?.currentPlayerTurn
    );
    return idx === -1 ? 0 : idx;
  }, [playersBySeat, dbGame?.currentPlayerTurn]);

  const selfSeatIndex = useMemo(() => {
    const idx = playersBySeat.findIndex((p) => p.id === yourDbPlayer?.id);
    return idx === -1 ? 0 : idx;
  }, [playersBySeat, yourDbPlayer?.id]);

  // Seat context for timeout staggering
  const seatsCount = useMemo(
    () => playersBySeat.length,
    [playersBySeat.length]
  );
  const nextToActSeat = useMemo(() => {
    const p = playersBySeat.find((pl) => pl.id === dbGame?.currentPlayerTurn);
    return p?.seat ?? null;
  }, [playersBySeat, dbGame?.currentPlayerTurn]);
  const mySeatNo = useMemo(
    () => yourDbPlayer?.seat ?? null,
    [yourDbPlayer?.seat]
  );

  function rotateArray<T>(arr: T[], offset: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const k = ((offset % n) + n) % n;
    return arr.slice(k).concat(arr.slice(0, k));
  }

  const playersByView = useMemo(
    () => rotateArray(playersBySeat, selfSeatIndex),
    [playersBySeat, selfSeatIndex]
  );

  const activePlayerIndexByView = useMemo(() => {
    if (playersBySeat.length === 0) return 0;
    return (
      (activePlayerIndex - selfSeatIndex + playersBySeat.length) %
      playersBySeat.length
    );
  }, [activePlayerIndex, selfSeatIndex, playersBySeat.length]);

  const connectedCount = useMemo(
    () => playersBySeat.filter((p) => p.isConnected).length,
    [playersBySeat]
  );

  const playerIdToCards = useMemo(() => {
    const map = new Map<string, IPlayingCard[]>();
    const counters = new Map<string, number>();
    for (const c of dbCards) {
      if (!c.playerId) continue;
      const idx = (counters.get(c.playerId) ?? 0) + 1;
      counters.set(c.playerId, idx);
      const arr = map.get(c.playerId) ?? [];
      arr.push({
        suit: c.suit as IPlayingCard["suit"],
        rank: c.rank as IPlayingCard["rank"],
        id: `${c.rank}-${c.suit}-${c.playerId}-${idx - 1}`,
      });
      map.set(c.playerId, arr);
    }
    return map;
  }, [dbCards]);

  const phaseLabel = useMemo(() => {
    const map: Record<string, string> = {
      "pre-flop": "Pré-flop",
      flop: "Flop",
      turn: "Turn",
      river: "River",
      showdown: "Showdown",
    };
    return dbGame ? map[dbGame.currentRound ?? "pre-flop"] ?? "Pré-flop" : "";
  }, [dbGame]);

  const callAmount = useMemo(() => {
    if (!dbGame || !yourDbPlayer) return 0;
    const diff =
      (dbGame.currentHighestBet ?? 0) - (yourDbPlayer.currentBet ?? 0);
    return Math.max(0, Math.min(diff, yourDbPlayer.stack));
  }, [dbGame, yourDbPlayer]);

  const minRaiseTotal = useMemo(() => {
    if (!dbGame) return 0;
    const tableBet = dbGame.currentHighestBet ?? 0;
    return tableBet === 0
      ? dbGame.bigBlind
      : Math.max(tableBet * 2, dbGame.bigBlind);
  }, [dbGame]);

  const maxRaiseTotal = useMemo(() => {
    if (!yourDbPlayer) return 0;
    return (yourDbPlayer.currentBet ?? 0) + (yourDbPlayer.stack ?? 0);
  }, [yourDbPlayer]);

  const canCheck = useMemo(() => {
    if (!dbGame || !yourDbPlayer) return false;
    return (dbGame.currentHighestBet ?? 0) <= (yourDbPlayer.currentBet ?? 0);
  }, [dbGame, yourDbPlayer]);

  const canCall = useMemo(() => {
    if (!dbGame || !yourDbPlayer) return false;
    const tableBet = dbGame.currentHighestBet ?? 0;
    return tableBet > (yourDbPlayer.currentBet ?? 0) && yourDbPlayer.stack > 0;
  }, [dbGame, yourDbPlayer]);

  const { mutations, isPending } = useGameActions();
  const joinMutation = mutations.joinMutation;
  const actMutation = mutations.actMutation;
  const advanceMutation = mutations.advanceMutation;
  const resetMutation = mutations.resetMutation;
  const leaveMutation = mutations.leaveMutation;
  const timeoutMutation = mutations.timeoutMutation;

  const isJoining = isPending.isJoining;
  const isActing = isPending.isActing;
  const isAdvancing = isPending.isAdvancing;
  const isResetting = isPending.isResetting;
  const isLeaving = isPending.isLeaving;
  const isTimingOut = isPending.isTimingOut;

  const showError = (message: string) => {
    toast({ variant: "destructive", description: message });
  };

  const withPreconditions = async (
    {
      requiresAuth = false,
      requiresGame = false,
      requiresPlayer = false,
    }: {
      requiresAuth?: boolean;
      requiresGame?: boolean;
      requiresPlayer?: boolean;
    },
    action: () => Promise<void>
  ) => {
    if (requiresGame && !dbGame) {
      showError("Mesa inválida ou não encontrada.");
      return;
    }
    if (requiresAuth && !me) {
      showError("Você precisa estar autenticado para executar esta ação.");
      return;
    }
    if (requiresPlayer && !yourDbPlayer) {
      showError("Você precisa estar sentado na mesa para executar esta ação.");
      return;
    }
    try {
      await action();
    } catch (e) {
      showError(
        e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente."
      );
    }
  };

  const actions = {
    join: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await joinMutation.mutateAsync({ gameId: dbGame!.id, stack: 1000 });
        }
      );
    },
    act: async (action: PokerAction, totalAmount?: number) => {
      if (!dbGame || !yourDbPlayer) return;
      const payload: { gameId: string; action: PokerAction; amount?: number } =
        {
          gameId: dbGame.id,
          action,
        };
      if (action === "raise" || action === "bet") {
        const targetTotal = Math.max(
          minRaiseTotal,
          Math.min(maxRaiseTotal, totalAmount ?? 0)
        );
        const delta =
          action === "bet"
            ? targetTotal
            : targetTotal - (yourDbPlayer.currentBet ?? 0);
        payload.amount = Math.max(1, delta);
      }
      await actMutation.mutateAsync(payload);
    },
    advance: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await advanceMutation.mutateAsync({ gameId: dbGame!.id });
        }
      );
    },
    reset: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await resetMutation.mutateAsync({ gameId: dbGame!.id });
        }
      );
    },
    leave: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true, requiresPlayer: true },
        async () => {
          await leaveMutation.mutateAsync({ gameId: dbGame!.id });
        }
      );
    },
  };

  // Robustly refetch your hole cards with retry/backoff until current-hand cards are present
  const refetchHoleCardsWithRetry = useCallback(async () => {
    try {
      // If we already have current-hand hole cards in the cache, skip refetching
      const currentHandId = dbGame?.handId;
      const myId = yourDbPlayer?.id;
      if (!currentHandId || !myId) return;
      const haveTwoAlready =
        dbCards.filter((c) => c.playerId === myId && c.handId === currentHandId)
          .length >= 2;
      if (haveTwoAlready) return;

      let attempt = 0;
      const maxAttempts = 3;
      let delayMs = 120;

      while (attempt < maxAttempts) {
        const res = await getHoleCards.refetch();
        const cards = Array.isArray(res.data) ? res.data : [];
        const hasCurrentHand = cards.some(
          (c) => c.playerId === myId && c.handId === currentHandId
        );
        if (hasCurrentHand) return;
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(1000, Math.floor(delayMs * 1.8));
        attempt += 1;
      }
    } catch {
      // swallow; subsequent broadcasts/effects will still populate
    }
  }, [getHoleCards, yourDbPlayer?.id, dbGame?.handId, dbCards]);

  // Ensure we fetch your current-hand hole cards after a hand change or initial mount
  useEffect(() => {
    if (!dbGame || !yourDbPlayer) return;
    const myCurrentHandCount = dbCards.filter(
      (c) => c.playerId === yourDbPlayer.id && c.handId === dbGame.handId
    ).length;
    if (myCurrentHandCount < 2) {
      void refetchHoleCardsWithRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbGame?.handId, yourDbPlayer?.id]);

  useEffect(() => {
    if (!getHoleCards.data) return;
    queryClient.setQueryData(getByIdKey, (prev) => {
      return ensureHoleCardsMerged(prev as CachedGameData | null);
    });
  }, [getHoleCards.data, getByIdKey, queryClient, ensureHoleCardsMerged]);

  // Realtime subscription and cache updates via helper hook
  useGameRealtime(
    id,
    (updater) => {
      queryClient.setQueryData<CachedGameData | null>(getByIdKey, (prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        // Re-apply private hole cards after public updates
        return ensureHoleCardsMerged(next as CachedGameData | null);
      });
    },
    undefined,
    () => {
      // Force a fast re-fetch of full game snapshot right after hand transition
      void queryClient.invalidateQueries({ queryKey: getByIdKey });
      void refetchHoleCardsWithRetry();
    }
  );

  // Also re-merge any time the snapshot hand changes and we have private cards cached
  useEffect(() => {
    queryClient.setQueryData(getByIdKey, (prev) => {
      if (!prev) return prev;
      return ensureHoleCardsMerged(prev as CachedGameData);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.game?.handId]);

  // Stable timeout handler to avoid effect churn in the hook
  const onTurnTimeout = useCallback(async () => {
    if (!dbGame?.id || !dbGame.currentPlayerTurn) return;
    // Do not pre-filter by local cache; server validation will reject if stale
    let fanout = 1;
    if (process.env.NODE_ENV !== "production") {
      try {
        if (typeof window !== "undefined") {
          const raw =
            window.sessionStorage.getItem("dev_timeout_fanout") ?? "1";
          const parsed = Number(raw);
          fanout = Number.isFinite(parsed)
            ? Math.max(1, Math.min(25, parsed))
            : 1;
        }
      } catch {}
    }

    const payload = {
      gameId: dbGame.id,
      playerId: String(dbGame.currentPlayerTurn),
    } as const;

    if (fanout <= 1) {
      try {
        const res = await timeoutMutation.mutateAsync(payload);
        logger.info(
          { playerId: dbGame.currentPlayerTurn, isValid: res?.isValid, error: res?.error },
          "timeout.result"
        );
      } catch (err) {
        logger.error({ err }, "timeout.request_failed");
      }
      return;
    }

    // Launch N parallel timeout requests for analysis
    const requests = Array.from({ length: fanout }, () =>
      timeoutMutation.mutateAsync(payload)
    );
    const results = await Promise.allSettled(requests);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    logger.info(
      { fanout, playerId: dbGame.currentPlayerTurn, ok: succeeded, fail: failed },
      "timeout.fanout"
    );
  }, [
    dbGame?.id,
    dbGame?.currentPlayerTurn,
    timeoutMutation,
    queryClient,
    getByIdKey,
  ]);

  // Turn timeout management and proactive catch-up
  useTurnManagement(
    {
      meId: me?.id,
      gameId: dbGame?.id ?? null,
      handId: dbGame?.handId ?? null,
      status: dbGame?.status ?? null,
      currentRound: dbGame?.currentRound ?? null,
      currentPlayerTurn: dbGame?.currentPlayerTurn ?? null,
      turnMs: dbGame?.turnMs ?? null,
      turnTimeoutAt: dbGame?.turnTimeoutAt ?? null,
      seatsCount,
      nextToActSeat,
      mySeatNo,
    },
    isYourTurn,
    onTurnTimeout
  );

  // Showdown effects
  useShowdownEffects(dbGame, dbPlayers, dbCards, () => actions.advance());

  return {
    me,
    dbGame,
    dbPlayers,
    dbCards,
    yourDbPlayer,
    isYourTurn,
    communityCards,
    playersBySeat,
    playersByView,
    activePlayerIndex,
    activePlayerIndexByView,
    phaseLabel,
    callAmount,
    minRaiseTotal,
    maxRaiseTotal,
    canCheck,
    canCall,
    connectedCount,
    playerIdToCards,
    actions,
    isJoining,
    isActing,
    isAdvancing,
    isResetting,
    isLeaving,
    isTimingOut,
  } as const;
}
