"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type GameSnapshot } from "./types";

export function useGameQuery(gameId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: me } = useQuery(trpc.auth.me.queryOptions());
  const gameQueryOptions = trpc.game.getById.queryOptions({ id: gameId });
  const { data: gameData } = useQuery({
    ...gameQueryOptions,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const snapshot: GameSnapshot | null = gameData
    ? {
        game: gameData.game,
        players: gameData.players,
        cards: gameData.cards,
        actions: gameData.actions,
      }
    : null;

  // Use the actual tRPC query key to ensure cache updates hit the right entry
  const getByIdKey = trpc.game.getById.queryKey({ id: gameId });
  return { me, snapshot, queryClient, trpc, getByIdKey } as const;
}
