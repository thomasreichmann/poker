"use client";

import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { createClient } from "~/supabase/client";

const supabase = createClient();

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, any>>;

interface PokerRealtimeStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionErrors: number;
}

export function usePokerRealtime() {
  const utils = api.useUtils();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [status, setStatus] = useState<PokerRealtimeStatus>({
    isConnected: false,
    lastUpdate: null,
    connectionErrors: 0,
  });

  // Debounce invalidation to prevent too many simultaneous requests
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInvalidationsRef = useRef<Set<string>>(new Set());

  const performInvalidation = useCallback(async () => {
    const invalidations = Array.from(pendingInvalidationsRef.current);
    pendingInvalidationsRef.current.clear();

    try {
      console.log("Performing realtime invalidations for:", invalidations);
      
      // Always invalidate the main game queries
      await Promise.all([
        utils.player.getAllGames.invalidate(),
        utils.game.getAll.invalidate(),
      ]);

      setStatus(prev => ({ 
        ...prev, 
        lastUpdate: new Date(),
        connectionErrors: 0 
      }));
    } catch (error) {
      console.error("Error invalidating queries after realtime update:", error);
      setStatus(prev => ({ 
        ...prev, 
        connectionErrors: prev.connectionErrors + 1 
      }));
    }
  }, [utils.player.getAllGames, utils.game.getAll]);

  const scheduleInvalidation = useCallback((source: string) => {
    pendingInvalidationsRef.current.add(source);
    
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }

    // Debounce by 100ms to batch multiple rapid changes
    invalidationTimeoutRef.current = setTimeout(() => {
      void performInvalidation();
    }, 100);
  }, [performInvalidation]);

  useEffect(() => {
    console.log("Setting up poker realtime subscriptions...");

    const channel = supabase
      .channel("poker-realtime")
      // Games table changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_games",
        },
        (payload: RealtimePayload) => {
          const gameId = payload.new && 'id' in payload.new ? String(payload.new.id) : 'unknown';
          console.log("Game state changed:", payload.eventType, gameId);
          scheduleInvalidation(`games:${gameId}`);
        }
      )
      // Players table changes  
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_players",
        },
        (payload: RealtimePayload) => {
          const gameId = payload.new && 'game_id' in payload.new ? String(payload.new.game_id) : 'unknown';
          console.log("Player state changed:", payload.eventType, gameId);
          scheduleInvalidation(`players:${gameId}`);
        }
      )
      // Actions table changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public", 
          table: "poker_actions",
        },
        (payload: RealtimePayload) => {
          const gameId = payload.new && 'game_id' in payload.new ? String(payload.new.game_id) : 'unknown';
          console.log("Action recorded:", payload.eventType, gameId);
          scheduleInvalidation(`actions:${gameId}`);
        }
      )
      // Cards table changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_cards",
        },
        (payload: RealtimePayload) => {
          const gameId = payload.new && 'game_id' in payload.new ? String(payload.new.game_id) : 'unknown';
          console.log("Cards changed:", payload.eventType, gameId);
          scheduleInvalidation(`cards:${gameId}`);
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log("Poker realtime subscription status:", subscriptionStatus);
        setStatus(prev => ({
          ...prev,
          isConnected: subscriptionStatus === "SUBSCRIBED",
        }));
      });

    channelRef.current = channel;

    return () => {
      console.log("Cleaning up poker realtime subscriptions...");
      
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
        invalidationTimeoutRef.current = null;
      }

      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      setStatus({
        isConnected: false,
        lastUpdate: null,
        connectionErrors: 0,
      });
    };
  }, [scheduleInvalidation]);

  return status;
}