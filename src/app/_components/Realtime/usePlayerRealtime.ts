"use client";

import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { createClient } from "~/supabase/client";

const supabase = createClient();

type PlayerRealtimePayload = RealtimePostgresChangesPayload<{
  id: string;
  game_id: string;
  user_id: string;
  stack: number;
  current_bet: number;
  has_folded: boolean;
  seat: number;
  [key: string]: any;
}>;

export function usePlayerRealtime() {
  const utils = api.useUtils();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Create a channel for listening to player and action changes
    const channel = supabase
      .channel("players-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public", 
          table: "poker_players", // Listen to players table changes
        },
        async (payload: PlayerRealtimePayload) => {
          console.log("Player state changed:", payload);
          
          // Invalidate game queries when player state changes
          try {
            await utils.player.getAllGames.invalidate();
          } catch (error) {
            console.error("Error invalidating queries after player realtime update:", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_actions", // Listen to actions table changes
        },
        async (payload) => {
          console.log("Action recorded:", payload);
          
          // Invalidate game queries when new actions are recorded
          try {
            await utils.player.getAllGames.invalidate();
          } catch (error) {
            console.error("Error invalidating queries after action realtime update:", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_cards", // Listen to cards table changes
        },
        async (payload) => {
          console.log("Cards changed:", payload);
          
          // Invalidate game queries when cards are dealt/changed
          try {
            await utils.player.getAllGames.invalidate();
          } catch (error) {
            console.error("Error invalidating queries after cards realtime update:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("Players realtime subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [utils.player.getAllGames]);

  return {
    isConnected: channelRef.current?.state === "joined",
  };
}