"use client";

import { useToast } from "@/components/ui/toast";
import { logger } from "@/logger/client";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { PokerAction } from "@/db/schema/actionTypes";
import {
  normalizeCards,
  type CachedGameData,
} from "./realtime/applyBroadcastToCache";
import { buildGameDerivedState } from "../data/selectors";
import { createGameDataClient } from "../data/client";
import type { GameDataTransportKind } from "../data/types";
import {
  ensureLiveTransportAction,
  isMockTransport,
} from "../data/guards";
import { useGameActions } from "./useGameActions";
import { useGameQuery } from "./useGameQuery";
import { useShowdownEffects } from "./useShowdownEffects";
import { useTurnManagement } from "./useTurnManagement";

type UseGameDataOptions = {
  dataSource?: GameDataTransportKind;
};

function resolveTransportKind(
  override?: GameDataTransportKind | null
): GameDataTransportKind {
  if (override) return override;
  const env = process.env
    .NEXT_PUBLIC_GAME_DATA_SOURCE as GameDataTransportKind | undefined;
  return env ?? "supabase";
}

export function useGameData(id: string, options?: UseGameDataOptions) {
  const transportKind = resolveTransportKind(options?.dataSource);
  const mockMode = isMockTransport(transportKind);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { me, snapshot, getByIdKey, isLoading, isNotFound } = useGameQuery(id);

  const clientRef = useRef<ReturnType<typeof createGameDataClient> | null>(null);
  if (!clientRef.current || clientRef.current.kind !== transportKind) {
    clientRef.current?.dispose();
    clientRef.current = createGameDataClient(transportKind);
  }
  const client = clientRef.current;

  useEffect(() => {
    if (!id) return;
    client.connect(id);
    return () => {
      client.disconnect();
    };
  }, [client, id]);

  useEffect(
    () => () => {
      client.dispose();
    },
    [client]
  );

  useEffect(() => {
    if (mockMode) return;
    if (!snapshot) {
      if (!isLoading && snapshot === null) {
        client.clearSnapshot();
      }
      return;
    }
    client.hydrate(snapshot as CachedGameData);
  }, [client, snapshot, isLoading, mockMode]);

  const subscribe = useCallback(
    (listener: () => void) => client.subscribe(listener),
    [client]
  );
  const getSnapshot = useCallback(() => client.getSnapshot(), [client]);
  const storeSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  const cachedData =
    storeSnapshot ?? ((snapshot as CachedGameData | null) ?? null);
  const dbGame = cachedData?.game ?? null;
  const dbPlayers = cachedData?.players ?? [];
  const dbCards = cachedData?.cards ?? [];

  const derived = useMemo(
    () => buildGameDerivedState(cachedData, me?.id ?? null),
    [cachedData, me?.id]
  );

  const {
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
  } = derived;

  const seatsCount = playersBySeat.length;
  const nextToActSeat = useMemo(() => {
    const player = playersBySeat.find(
      (p) => p.id === dbGame?.currentPlayerTurn
    );
    return player?.seat ?? null;
  }, [playersBySeat, dbGame?.currentPlayerTurn]);
  const mySeatNo = yourDbPlayer?.seat ?? null;

  const holeCardsEnabled =
    !mockMode &&
    !isLoading &&
    !isNotFound &&
    (!!snapshot?.game || !!dbGame);

  const getHoleCards = useQuery({
    ...trpc.game.getHoleCards.queryOptions({ gameId: id }),
    enabled: holeCardsEnabled,
  });

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

  useEffect(() => {
    if (!holeCardsEnabled || !getHoleCards.data) return;
    queryClient.setQueryData(getByIdKey, (prev) => {
      return ensureHoleCardsMerged(prev as CachedGameData | null);
    });
  }, [
    holeCardsEnabled,
    getHoleCards.data,
    getByIdKey,
    queryClient,
    ensureHoleCardsMerged,
  ]);

  useEffect(() => {
    if (!holeCardsEnabled) return;
    client.mergePrivateCards({
      userId: me?.id,
      handId: dbGame?.handId ?? null,
      cards: Array.isArray(getHoleCards.data) ? getHoleCards.data : [],
    });
  }, [
    client,
    dbGame?.handId,
    getHoleCards.data,
    holeCardsEnabled,
    me?.id,
  ]);

  useEffect(() => {
    if (isNotFound || isLoading || mockMode) return;
    queryClient.setQueryData(getByIdKey, (prev) => {
      if (!prev) return prev;
      return ensureHoleCardsMerged(prev as CachedGameData);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotFound, isLoading, snapshot?.game?.handId, mockMode]);

  useEffect(() => {
    if (!cachedData || mockMode) return;
    queryClient.setQueryData(getByIdKey, cachedData);
  }, [cachedData, mockMode, queryClient, getByIdKey]);

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
    if (!ensureLiveTransportAction({ isMock: mockMode, notify: showError })) {
      return;
    }
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
      const payload: { gameId: string; action: PokerAction; amount?: number } = {
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

  const refetchHoleCardsWithRetry = useCallback(async () => {
    if (mockMode) return;
    try {
      const currentHandId = dbGame?.handId;
      const myId = yourDbPlayer?.id;
      if (!currentHandId || !myId) return;
      const haveTwoAlready =
        dbCards.filter(
          (c) => c.playerId === myId && c.handId === currentHandId
        ).length >= 2;
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
      // ignore transient errors
    }
  }, [getHoleCards, yourDbPlayer?.id, dbGame?.handId, dbCards, mockMode]);

  useEffect(() => {
    if (mockMode || isNotFound || isLoading || !dbGame || !yourDbPlayer)
      return;
    const myCurrentHandCount = dbCards.filter(
      (c) => c.playerId === yourDbPlayer.id && c.handId === dbGame.handId
    ).length;
    if (myCurrentHandCount < 2) {
      void refetchHoleCardsWithRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockMode, isNotFound, isLoading, dbGame?.handId, yourDbPlayer?.id]);

  useEffect(() => {
    const unsubscribe = client.onHandTransition(() => {
      if (mockMode) return;
      void queryClient.invalidateQueries({ queryKey: getByIdKey });
      void refetchHoleCardsWithRetry();
    });
    return unsubscribe;
  }, [client, mockMode, queryClient, getByIdKey, refetchHoleCardsWithRetry]);

  const onTurnTimeout = useCallback(async () => {
    if (mockMode || !dbGame?.id || !dbGame.currentPlayerTurn) return;
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
          {
            playerId: dbGame.currentPlayerTurn,
            isValid: res?.isValid,
            error: res?.error,
          },
          "timeout.result"
        );
      } catch (err) {
        logger.error({ err }, "timeout.request_failed");
      }
      return;
    }

    const requests = Array.from({ length: fanout }, () =>
      timeoutMutation.mutateAsync(payload)
    );
    const results = await Promise.allSettled(requests);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    logger.info(
      {
        fanout,
        playerId: dbGame.currentPlayerTurn,
        ok: succeeded,
        fail: failed,
      },
      "timeout.fanout"
    );
  }, [mockMode, dbGame?.id, dbGame?.currentPlayerTurn, timeoutMutation]);

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

  useShowdownEffects(dbGame, dbPlayers, dbCards, () => actions.advance());

  const effectiveIsLoading = mockMode && cachedData ? false : isLoading;
  const effectiveIsNotFound = mockMode && cachedData ? false : isNotFound;

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
    isLoading: effectiveIsLoading,
    isNotFound: effectiveIsNotFound,
    dataSource: transportKind,
  } as const;
}
