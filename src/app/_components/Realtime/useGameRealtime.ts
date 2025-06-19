"use client";

import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { createClient } from "~/supabase/client";

const supabase = createClient();

type GameRealtimePayload = RealtimePostgresChangesPayload<{
  id: string;
  status: string;
  current_round: string;
  current_highest_bet: number;
  current_player_turn: string;
  pot: number;
  updated_at: string;
  [key: string]: any;
}>;

export function useGameRealtime() {
  const utils = api.useUtils();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Create a channel for listening to games table changes
    const channel = supabase
      .channel("games-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "poker_games", // Specifically listen to the games table
        },
        async (payload: GameRealtimePayload) => {
          console.log("Game state changed:", payload);
          
          // Invalidate relevant tRPC queries to trigger refetch
          try {
            await Promise.all([
              utils.player.getAllGames.invalidate(),
              utils.game.getAll.invalidate(),
            ]);
          } catch (error) {
            console.error("Error invalidating queries after realtime update:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("Games realtime subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [utils.player.getAllGames, utils.game.getAll]);

  return {
    // Return any useful status if needed
    isConnected: channelRef.current?.state === "joined",
  };
}