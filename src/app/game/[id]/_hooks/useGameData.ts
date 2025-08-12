"use client";

import { useToast } from "@/components/ui/toast";
import { evaluateHand } from "@/lib/poker/cards";
import { getSupabaseBrowserClient } from "@/supabase/client";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

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
          suit: c.suit,
          rank: c.rank,
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
        suit: c.suit,
        rank: c.rank,
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

  // Fetch own hole cards on demand when missing (retry briefly at start of hand)
  const holeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holeRetryCountRef = useRef<number>(0);
  const holeFetchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!dbGame || !yourDbPlayer) return;
    const key = `${dbGame.id}:${dbGame.currentRound}:${yourDbPlayer.id}`;
    const fetchMine = async () => {
      const yourHoleCount = dbCards.filter((c) => c.playerId === yourDbPlayer.id).length;
      if (yourHoleCount >= 2) return true;
      try {
        const opts = trpc.game.getMyHoleCards.queryOptions({ gameId: dbGame.id });
        const mine = await queryClient.fetchQuery(opts);
        if (mine && mine.length > 0) {
          const queryKey = trpc.game.getById.queryKey({ id });
          queryClient.setQueryData(queryKey, (prev: any) => {
            if (!prev) return prev;
            const existingIds = new Set(prev.cards.map((c: any) => c.id));
            const merged = prev.cards.concat(mine.filter((c: any) => !existingIds.has(c.id)));
            return { ...prev, cards: merged };
          });
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    };

    const startRetriesIfNeeded = async () => {
      // Avoid re-running for the same hand
      if (holeFetchKeyRef.current === key) return;
      holeFetchKeyRef.current = key;
      holeRetryCountRef.current = 0;

      const attempt = async () => {
        const done = await fetchMine();
        if (done) return;
        holeRetryCountRef.current += 1;
        if (holeRetryCountRef.current > 5) return; // cap retries
        const delayMs = 300 * holeRetryCountRef.current; // 300ms, 600ms, ...
        holeRetryTimerRef.current = setTimeout(() => void attempt(), delayMs);
      };
      void attempt();
    };

    void startRetriesIfNeeded();
    return () => {
      if (holeRetryTimerRef.current) {
        clearTimeout(holeRetryTimerRef.current);
        holeRetryTimerRef.current = null;
      }
    };
  }, [dbGame?.id, dbGame?.currentRound, yourDbPlayer?.id, dbCards, id, queryClient, trpc.game]);

  // Realtime Broadcast subscription (private channel per game)
  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();

    // Ensure Realtime Authorization token is set for private channels
    let unsubscribeAuth: (() => void) | undefined;
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
    unsubscribeAuth = () => authListener?.subscription.unsubscribe();

    // Utilities to update the TRPC cache directly from broadcast payloads
    const queryKey = trpc.game.getById.queryKey({ id });
    const toCamel = (s: string) =>
      s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    const mapGameRow = (row: any) => ({
      id: row.id,
      status: row.status,
      currentRound: row.current_round,
      currentHighestBet: row.current_highest_bet,
      currentPlayerTurn: row.current_player_turn,
      pot: row.pot,
      bigBlind: row.big_blind,
      smallBlind: row.small_blind,
      updatedAt: row.updated_at,
      lastAction: row.last_action,
      lastBetAmount: row.last_bet_amount,
    });
    const mapPlayerRow = (row: any) => ({
      id: row.id,
      userId: row.user_id,
      gameId: row.game_id,
      seat: row.seat,
      stack: row.stack,
      currentBet: row.current_bet,
      hasFolded: row.has_folded,
      isConnected: row.is_connected,
      lastSeen: row.last_seen,
      isButton: row.is_button,
      hasWon: row.has_won,
      showCards: row.show_cards,
      displayName: row.display_name,
      handRank: row.hand_rank,
      handValue: row.hand_value,
      handName: row.hand_name,
    });
    const mapCardRow = (row: any) => ({
      id: row.id,
      gameId: row.game_id,
      playerId: row.player_id,
      rank: row.rank,
      suit: row.suit,
    });
    const mapActionRow = (row: any) => ({
      id: row.id,
      gameId: row.game_id,
      playerId: row.player_id,
      actionType: row.action_type,
      amount: row.amount,
      createdAt: row.created_at,
    });

    const upsertById = <T extends { id: any }>(list: T[], item: T) => {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx === -1) return [...list, item];
      const copy = list.slice();
      copy[idx] = item;
      return copy;
    };
    const removeById = <T extends { id: any }>(list: T[], id: any) =>
      list.filter((x) => x.id !== id);

    function applyBroadcast(
      event: string,
      table: string,
      newRow: any,
      oldRow: any
    ) {
      queryClient.setQueryData(queryKey, (prev: any) => {
        if (!prev) return prev;
        switch (table) {
          case "poker_games": {
            const row = (newRow ?? oldRow) as any;
            const mapped = mapGameRow(row);
            const prevGame = prev.game as any;
            const nextGame = { ...prevGame, ...mapped };
            const transitionedToNewHand =
              prevGame?.currentRound === "showdown" &&
              nextGame.currentRound === "pre-flop";
            if (transitionedToNewHand) {
              // Clear all cards at hand reset; fresh INSERTs will repopulate
              // Also drop players flagged to leaveAfterHand to reflect server removals immediately
              const filteredPlayers = (prev.players as any[]).filter(
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
              const idToRemove = oldRow?.id;
              return { ...prev, players: removeById(prev.players, idToRemove) };
            }
            const mapped = mapPlayerRow(newRow);
            return {
              ...prev,
              players: upsertById(prev.players, mapped).sort(
                (a, b) => a.seat - b.seat
              ),
            };
          }
          case "poker_cards": {
            const normalize = (cardsList: any[]) => {
              const byPlayer = new Map<string, any[]>();
              const community: any[] = [];
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
              const limited: any[] = [];
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
            const mapped = mapCardRow(newRow);
            const next = upsertById(prev.cards, mapped);
            return { ...prev, cards: normalize(next) };
          }
          case "poker_actions": {
            if (event === "INSERT") {
              const mapped = mapActionRow(newRow);
              const next = [mapped, ...prev.actions].slice(0, 50);
              return { ...prev, actions: next };
            }
            if (event === "UPDATE") {
              const mapped = mapActionRow(newRow);
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

    function onBroadcast(payload: any) {
      // payload structure from realtime.broadcast_changes
      const p = payload?.payload ?? payload;
      const event = p?.event || p?.operation || payload?.event || "";
      const table = p?.table || p?.table_name || "";
      const schema = p?.schema || p?.table_schema || "public";
      if (schema !== "public") return;
      const newRow = p?.new || p?.record || undefined;
      const oldRow = p?.old || undefined;
      if (!table) return;
      applyBroadcast(
        String(event).toUpperCase(),
        String(table),
        newRow,
        oldRow
      );
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
  useEffect(() => {
    if (!dbGame) return;
    const isShowdown = (dbGame.currentRound ?? "pre-flop") === "showdown";
    if (!isShowdown) {
      showdownHandledRef.current = null;
      return;
    }

    const key = `${dbGame.id}-${String((dbGame as any).updatedAt ?? "")}`;
    if (showdownHandledRef.current === key) return;
    showdownHandledRef.current = key;

    // Determine winners (prefer server flag, fallback to client eval)
    const community = dbCards.filter((c) => c.playerId === null);
    const activePlayers = dbPlayers.filter((p) => !p.hasFolded);
    let winners = dbPlayers.filter((p) => p.hasWon);
    let handName: string | undefined;

    try {
      if (winners.length === 0 && activePlayers.length > 0) {
        const evals = activePlayers.map((p) => {
          const hole = dbCards.filter((c) => c.playerId === p.id);
          return {
            player: p,
            eval: evaluateHand([...hole, ...community] as any),
          };
        });
        const bestRank = Math.max(...evals.map((e) => e.eval.rank));
        const bests = evals.filter((e) => e.eval.rank === bestRank);
        const bestValue = Math.max(...bests.map((e) => e.eval.value));
        const finalWinners = bests.filter((e) => e.eval.value === bestValue);
        winners = finalWinners.map((e) => e.player);
        handName = finalWinners[0]?.eval.name;
      } else if (winners[0]) {
        const hole = dbCards.filter((c) => c.playerId === winners[0]!.id);
        const ev = evaluateHand([...hole, ...community] as any);
        handName = ev.name;
      }
    } catch {
      // ignore eval errors
    }

    const winnerNames = winners
      .map((p) => (p.email ? p.email.split("@")[0] : `Player ${p.seat}`))
      .join(", ");
    const description = handName
      ? `Winner: ${winnerNames} — ${handName}`
      : `Winner: ${winnerNames}`;
    toast({
      variant: "success",
      title: "Showdown",
      description,
      duration: 5000,
    });

    // Schedule immediate advance when the client receives showdown state
    // Use a short delay to let the toast render, but don't wait for it to finish
    const timer = setTimeout(() => {
      void actions.advance();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbGame?.id, dbGame?.currentRound, (dbGame as any)?.updatedAt]);

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
