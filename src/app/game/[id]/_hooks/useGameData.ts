"use client";

import { useToast } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export function useGameData(id: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me } = useQuery(trpc.auth.me.queryOptions());
  const { data: gameData } = useQuery(trpc.game.getById.queryOptions({ id }));

  const dbGame = gameData?.game ?? null;
  const dbPlayers = gameData?.players ?? [];
  const dbCards = gameData?.cards ?? [];

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
          suit: c.suit as any,
          rank: c.rank as any,
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
    const map = new Map<string, { suit: string; rank: string; id: string }[]>();
    const counters = new Map<string, number>();
    for (const c of dbCards) {
      if (!c.playerId) continue;
      const idx = (counters.get(c.playerId) ?? 0) + 1;
      counters.set(c.playerId, idx);
      const arr = map.get(c.playerId) ?? [];
      arr.push({
        suit: c.suit as any,
        rank: c.rank as any,
        id: `${c.rank}-${c.suit}-${c.playerId}-${idx - 1}`,
      });
      map.set(c.playerId, arr);
    }
    return map;
  }, [dbCards]);

  const phaseLabel = useMemo(() => {
    const map: Record<string, string> = {
      "pre-flop": "Preflop",
      flop: "Flop",
      turn: "Turn",
      river: "River",
      showdown: "Showdown",
    };
    return dbGame ? map[dbGame.currentRound ?? "pre-flop"] ?? "Preflop" : "";
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

  const invalidateGame = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.game.getById.queryKey({ id }),
    });

  const joinMutation = useMutation(trpc.game.join.mutationOptions());
  const actMutation = useMutation(trpc.game.act.mutationOptions());
  const advanceMutation = useMutation(trpc.game.advance.mutationOptions());
  const resetMutation = useMutation(trpc.game.reset.mutationOptions());
  const leaveMutation = useMutation(trpc.game.leave.mutationOptions());

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
    } catch (e: any) {
      showError(e?.message ?? "Ocorreu um erro. Tente novamente.");
    }
  };

  const actions = {
    join: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await joinMutation.mutateAsync({ gameId: dbGame!.id, stack: 1000 });
          await invalidateGame();
        }
      );
    },
    act: async (
      action: "check" | "call" | "fold" | "raise" | "bet",
      totalAmount?: number
    ) => {
      if (!dbGame || !yourDbPlayer) return;
      const payload: { gameId: string; action: any; amount?: number } = {
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
      await invalidateGame();
    },
    advance: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await advanceMutation.mutateAsync({ gameId: dbGame!.id });
          await invalidateGame();
        }
      );
    },
    reset: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true },
        async () => {
          await resetMutation.mutateAsync({ gameId: dbGame!.id });
          await invalidateGame();
        }
      );
    },
    leave: async () => {
      await withPreconditions(
        { requiresAuth: true, requiresGame: true, requiresPlayer: true },
        async () => {
          await leaveMutation.mutateAsync({ gameId: dbGame!.id });
          await invalidateGame();
        }
      );
    },
  };

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
  } as const;
}
