"use client";

import { getSupabaseBrowserClient } from "@/supabase/client";
import { useEffect } from "react";
import {
  type CachedGameData,
  normalizeCards,
  removeById,
  toCamelObject,
  upsertById,
} from "./realtime/applyBroadcastToCache";

type BroadcastPayload = {
  event: string;
  payload: {
    id: string;
    old_record: Record<string, unknown>;
    operation: string;
    record: Record<string, unknown>;
    schema: string;
    table: string;
  };
  type: string;
};

export function useGameRealtime(
  id: string,
  setCache: (
    updater: (prev: CachedGameData | null) => CachedGameData | null
  ) => void,
  onAuthToken?: (token: string) => void,
  onHandTransition?: () => void
) {
  useEffect(() => {
    if (!id) return;

    const supabase = getSupabaseBrowserClient();

    const unsubscribeAuth = () => {
      authListener?.subscription.unsubscribe();
    };
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) {
        supabase.realtime.setAuth(token);
        onAuthToken?.(token);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const token = session?.access_token;
        if (token) {
          supabase.realtime.setAuth(token);
          onAuthToken?.(token);
        }
      }
    );

    function applyBroadcast(
      event: string,
      table: string,
      newRow: Record<string, unknown>,
      oldRow: Record<string, unknown>
    ) {
      setCache((prev) => {
        if (!prev) return prev;
        switch (table) {
          case "poker_games": {
            const game = newRow ?? oldRow;
            const mapped = toCamelObject(game) as CachedGameData["game"];
            const prevGame = prev.game;
            const nextGame = { ...prevGame, ...mapped };
            const transitionedToNewHand = prevGame.handId !== nextGame.handId;
            if (transitionedToNewHand) {
              try {
                onHandTransition?.();
              } catch {}
              return {
                ...prev,
                game: nextGame,
                cards: [],
                players: prev.players.filter((p) => !p.leaveAfterHand),
              };
            }
            return { ...prev, game: nextGame };
          }
          case "poker_players": {
            if (event === "DELETE") {
              const row = oldRow ?? newRow;
              const idToRemove = row.id as string;
              return { ...prev, players: removeById(prev.players, idToRemove) };
            }
            const mapped = toCamelObject(
              newRow
            ) as CachedGameData["players"][number];
            return {
              ...prev,
              players: upsertById(prev.players, mapped).sort(
                (a, b) => a.seat - b.seat
              ),
            };
          }
          case "poker_cards": {
            if (event === "DELETE") {
              const idToRemove = oldRow?.id as string;
              const next = removeById(prev.cards, idToRemove);
              return { ...prev, cards: normalizeCards(next) };
            }
            const mapped = toCamelObject(
              newRow
            ) as CachedGameData["cards"][number];
            const next = upsertById(prev.cards, mapped);
            return { ...prev, cards: normalizeCards(next) };
          }
          case "poker_actions": {
            const mapped = toCamelObject(
              newRow
            ) as CachedGameData["actions"][number];
            if (event === "INSERT") {
              const next = [mapped, ...prev.actions].slice(0, 50);
              return { ...prev, actions: next };
            }
            if (event === "UPDATE") {
              return { ...prev, actions: upsertById(prev.actions, mapped) };
            }
            if (event === "DELETE") {
              const idToRemove = oldRow?.id as string;
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
      console.log("Received payload", p);
      if (p.schema !== "public") {
        console.log("schema not public", p.schema);
        return;
      }
      if (!p.table) {
        console.log("table not found", p.table);
        return;
      }
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
  }, [id, setCache, onAuthToken, onHandTransition]);
}
