"use client";

import { usePokerRealtime } from "../Realtime/usePokerRealtime";
import { PublicGamesComponent } from "./PublicGames";

export function PublicGamesWithRealtime() {
  // Enable realtime updates for games list at this level
  const realtimeStatus = usePokerRealtime();

  return <PublicGamesComponent />;
}