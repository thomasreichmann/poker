"use client";

import { useToast } from "@/components/ui/toast";
import { evaluateHand } from "@/lib/poker/cards";
import { useTurnTimeout } from "@/lib/useTurnTimeout";
import { getSupabaseBrowserClient } from "@/supabase/client";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { Action } from "@/db/schema/actions";
import { PokerAction } from "@/db/schema/actionTypes";
import { Card } from "@/db/schema/cards";
import { Game } from "@/db/schema/games";
import { Player } from "@/db/schema/players";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";

type BroadcastPayload = {
  event: string;
  payload: {
    id: string;
    old_record: never;
    operation: string;
    record: never;
    schema: string;
    table: string;
  };
  type: string;
};

export function useGameData(id: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me } = useQuery(trpc.auth.me.queryOptions());
  const gameQueryOptions = trpc.game.getById.queryOptions({ id });
  const { data: gameData } = useQuery({
    ...gameQueryOptions,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const getHoleCards = useQuery(
    trpc.game.getHoleCards.queryOptions({ gameId: id })
  );

  const dbGame = useMemo(() => gameData?.game ?? null, [gameData?.game]);
  const dbPlayers = useMemo(() => gameData?.players ?? [], [gameData?.players]);
  const dbCards = useMemo(() => gameData?.cards ?? [], [gameData?.cards]);

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

  const joinMutation = useMutation(trpc.game.join.mutationOptions());
  const actMutation = useMutation(trpc.game.act.mutationOptions());
  const advanceMutation = useMutation(trpc.game.advance.mutationOptions());
  const resetMutation = useMutation(trpc.game.reset.mutationOptions());
  const leaveMutation = useMutation(trpc.game.leave.mutationOptions());
  const timeoutMutation = useMutation(trpc.game.timeout.mutationOptions());

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

  useEffect(() => {
    // Update the player hole cards in the getById query
    if (!getHoleCards.data) {
      return;
    }
    queryClient.setQueryData(trpc.game.getById.queryKey({ id }), (prev) => {
      if (!prev) return prev;
      // Merge and de-duplicate cards by id
      const mergedCards = [...prev.cards, ...getHoleCards.data];
      const dedupedCards = Array.from(
        new Map(mergedCards.map((card) => [card.id, card])).values()
      );
      return { ...prev, cards: dedupedCards };
    });
  }, [getHoleCards.data, id, queryClient, trpc.game.getById]);

  // Realtime Broadcast subscription (private channel per game)
  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();

    // Ensure Realtime Authorization token is set for private channels
    const unsubscribeAuth = () => {
      authListener?.subscription.unsubscribe();
    };
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) {
        supabase.realtime.setAuth(token);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const token = session?.access_token;
        if (token) {
          supabase.realtime.setAuth(token);
        }
      }
    );

    // Utilities to update the TRPC cache directly from broadcast payloads
    const queryKey = trpc.game.getById.queryKey({ id });
    const toCamel = (s: string) =>
      s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const toCamelObject = (obj: Record<string, unknown>) => {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [toCamel(k), v])
      );
    };

    const upsertById = <T extends { id: string | number }>(
      list: T[],
      item: T
    ) => {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx === -1) return [...list, item];
      const copy = list.slice();
      copy[idx] = item;
      return copy;
    };
    const removeById = <T extends { id: string | number }>(
      list: T[],
      id: string | number
    ) => list.filter((x) => x.id !== id);

    function applyBroadcast(
      event: string,
      table: string,
      newRow: { id: string },
      oldRow: { id: string }
    ) {
      queryClient.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        switch (table) {
          case "poker_games": {
            // New and old game FROM DB broadcast
            const game = newRow ?? oldRow;
            const mapped = toCamelObject(game) as Game;

            // Next and previous game from TRPC cache
            const prevGame = prev.game as Game;
            const nextGame = { ...prevGame, ...mapped };
            const transitionedToNewHand = prevGame.handId !== nextGame.handId;
            if (transitionedToNewHand) {
              // Clear all cards at hand reset; Will need to manually re-fetch hole cards
              // Also drop players flagged to leaveAfterHand to reflect server removals immediately
              void getHoleCards.refetch();
              const filteredPlayers = prev.players.filter(
                (p) => !p.leaveAfterHand
              );

              return {
                ...prev,
                game: nextGame,
                cards: [],
                players: filteredPlayers,
              };
            }
            return { ...prev, game: nextGame };
          }
          case "poker_players": {
            if (event === "DELETE") {
              const row = oldRow ?? newRow;
              const idToRemove = row.id;
              return { ...prev, players: removeById(prev.players, idToRemove) };
            }
            const mapped = toCamelObject(newRow) as Player;
            return {
              ...prev,
              players: upsertById(prev.players, mapped).sort(
                (a, b) => a.seat - b.seat
              ),
            };
          }
          case "poker_cards": {
            const normalize = (cardsList: Card[]) => {
              const byPlayer = new Map<string, Card[]>();
              const community: Card[] = [];
              for (const c of cardsList) {
                if (c.playerId) {
                  const pid = String(c.playerId);
                  const arr = byPlayer.get(pid) ?? [];
                  arr.push(c);
                  byPlayer.set(pid, arr);
                } else {
                  community.push(c);
                }
              }
              const limited: Card[] = [];
              for (const [, arr] of byPlayer) {
                arr.sort((a, b) => Number(a.id) - Number(b.id));
                const kept = arr.slice(-2);
                for (const c of kept) limited.push(c);
              }
              community.sort((a, b) => Number(a.id) - Number(b.id));
              for (const c of community.slice(-5)) limited.push(c);
              return limited;
            };

            if (event === "DELETE") {
              const idToRemove = oldRow?.id;
              const next = removeById(prev.cards, idToRemove);
              return { ...prev, cards: normalize(next) };
            }
            const mapped = toCamelObject(newRow) as Card;
            const next = upsertById(prev.cards, mapped);
            return { ...prev, cards: normalize(next) };
          }
          case "poker_actions": {
            const mapped = toCamelObject(newRow) as Action;

            if (event === "INSERT") {
              const next = [mapped, ...prev.actions].slice(0, 50);
              return { ...prev, actions: next };
            }
            if (event === "UPDATE") {
              return { ...prev, actions: upsertById(prev.actions, mapped) };
            }
            if (event === "DELETE") {
              const idToRemove = oldRow?.id;
              return { ...prev, actions: removeById(prev.actions, idToRemove) };
            }
            return prev;
          }
          default:
            return prev;
        }
      });
    }

    function onBroadcast(payload: BroadcastPayload) {
      const p = payload.payload;
      if (p.schema !== "public") return;
      if (!p.table) return;
      applyBroadcast(payload.event, p.table, p.record, p.old_record);
    }

    const channel = supabase
      .channel(`topic:${id}`, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, onBroadcast)
      .on("broadcast", { event: "UPDATE" }, onBroadcast)
      .on("broadcast", { event: "DELETE" }, onBroadcast)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      unsubscribeAuth?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Show showdown feedback and auto-advance to next hand
  const showdownHandledRef = useRef<string | null>(null);
  const showdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Turn timeout: schedule once per game/hand/player; auto-clears on change
  // Stagger timeout requests by seat distance from the active player (500ms per seat)
  const TURN_TIMEOUT_BASE_MS = 30_000;
  const STAGGER_MS = 500;
  const seatCount = playersBySeat.length;
  const seatDistanceFromActive =
    yourDbPlayer && seatCount > 0
      ? (selfSeatIndex - activePlayerIndex + seatCount) % seatCount
      : 0;
  const timeoutDurationMs = TURN_TIMEOUT_BASE_MS + seatDistanceFromActive * STAGGER_MS;

  useTurnTimeout({
    gameId: dbGame?.id ?? null,
    handId: dbGame?.handId ?? null,
    playerId: dbGame?.currentPlayerTurn ?? null,
    round: dbGame?.currentRound ?? null,
    enabled: Boolean(me && yourDbPlayer && dbGame?.status === "active"),
    durationMs: timeoutDurationMs,
    onTimeoutAction: async () => {
      if (!dbGame?.id || !dbGame.currentPlayerTurn) return;
      await timeoutMutation.mutateAsync({
        gameId: dbGame.id,
        playerId: String(dbGame.currentPlayerTurn),
      });
    },
  });

  useEffect(() => {
    if (!dbGame) return;
    const isShowdown = (dbGame.currentRound ?? "pre-flop") === "showdown";
    if (!isShowdown) {
      showdownHandledRef.current = null;
      // Clear any pending showdown timeout
      if (showdownTimeoutRef.current) {
        clearTimeout(showdownTimeoutRef.current);
        showdownTimeoutRef.current = null;
      }
      return;
    }

    const key = `${dbGame.id}-${String(dbGame.handId ?? "")}`;
    if (showdownHandledRef.current === key) return;

    // Clear any existing timeout to restart the debounce period
    if (showdownTimeoutRef.current) {
      clearTimeout(showdownTimeoutRef.current);
    }

    // Debounce showdown processing to wait for all related updates
    showdownTimeoutRef.current = setTimeout(() => {
      // Double-check we haven't already handled this showdown
      if (showdownHandledRef.current === key) return;
      showdownHandledRef.current = key;

      // Determine winners (prefer server flag, fallback to client eval)
      const community = dbCards.filter((c) => c.playerId === null);
      const activePlayers = dbPlayers.filter(
        (p) => p.hasFolded === false || p.hasFolded === null
      );
      let winners = dbPlayers.filter((p) => p.hasWon);
      let handName: string | undefined;

      try {
        if (winners.length === 0 && activePlayers.length > 0) {
          // If only one player remains (others folded), they win by default
          if (activePlayers.length === 1) {
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          } else {
            // Multiple players remain, evaluate hands
            const evals = activePlayers.map((p) => {
              const hole = dbCards.filter((c) => c.playerId === p.id);
              return {
                player: p,
                eval: evaluateHand([...hole, ...community]),
              };
            });
            const bestRank = Math.max(...evals.map((e) => e.eval.rank));
            const bests = evals.filter((e) => e.eval.rank === bestRank);
            const bestValue = Math.max(...bests.map((e) => e.eval.value));
            const finalWinners = bests.filter(
              (e) => e.eval.value === bestValue
            );
            winners = finalWinners.map((e) => e.player);
            handName = finalWinners[0]?.eval.name;
          }
        } else if (winners[0]) {
          const hole = dbCards.filter((c) => c.playerId === winners[0]!.id);
          const ev = evaluateHand([...hole, ...community]);
          handName = ev.name;
        }
      } catch {
        // ignore eval errors - fallback to single non-folded player if we still have none
        if (winners.length === 0 && activePlayers.length > 0) {
          if (activePlayers.length === 1) {
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          } else {
            // Multiple active players but eval failed - pick first non-folded as fallback
            winners = [activePlayers[0]!];
            handName = "Winner by default";
          }
        }
      }

      // Show all identified winners for debugging purposes
      const winnerNames = winners
        .map((p) => (p.displayName ? p.displayName : `Player ${p.seat}`))
        .join(", ");

      // Fallback if we still don't have winners for some reason
      const finalWinnerNames = winnerNames || "Unknown Player";

      const description = handName
        ? `Winner: ${finalWinnerNames} — ${handName}`
        : `Winner: ${finalWinnerNames}`;
      toast({
        variant: "success",
        title: "Showdown",
        description,
        duration: 5000,
        groupId: `showdown-${dbGame.id}-${String(dbGame.handId ?? "")}`,
      });

      // Schedule immediate advance when the client receives showdown state
      // Use a short delay to let the toast render, but don't wait for it to finish
      const advanceTimer = setTimeout(() => {
        void actions.advance();
      }, 2000);

      // Clear advance timer on cleanup (though this timeout function will complete)
      setTimeout(() => clearTimeout(advanceTimer), 3000);
    }, 150); // 150ms debounce delay to wait for related player/card updates

    // Remove debug logs

    // Cleanup function
    return () => {
      if (showdownTimeoutRef.current) {
        clearTimeout(showdownTimeoutRef.current);
        showdownTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbGame?.id, dbGame?.currentRound, dbGame?.handId, dbPlayers, dbCards]);

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
