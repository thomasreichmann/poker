import { db } from "@/db";
import { actions } from "@/db/schema/actions";
import { cards } from "@/db/schema/cards";
import { games } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";

export const gameRouter = createTRPCRouter({
  // List games with basic info and player counts
  list: baseProcedure.query(async () => {
    const rows = await db
      .select({
        id: games.id,
        status: games.status,
        currentRound: games.currentRound,
        pot: games.pot,
        bigBlind: games.bigBlind,
        smallBlind: games.smallBlind,
        playersCount: count(players.id).as("playersCount"),
      })
      .from(games)
      .leftJoin(players, eq(players.gameId, games.id))
      .groupBy(
        games.id,
        games.status,
        games.currentRound,
        games.pot,
        games.bigBlind,
        games.smallBlind
      )
      .orderBy(desc(games.updatedAt));

    return rows;
  }),

  // Get a single game with players and cards
  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [game] = await db
        .select()
        .from(games)
        .where(eq(games.id, input.id))
        .limit(1);

      if (!game) return null;

      const gamePlayers = await db
        .select()
        .from(players)
        .where(eq(players.gameId, game.id));

      const gameCards = await db
        .select()
        .from(cards)
        .where(eq(cards.gameId, game.id));

      const recentActions = await db
        .select()
        .from(actions)
        .where(eq(actions.gameId, game.id))
        .orderBy(desc(actions.createdAt))
        .limit(50);

      return {
        game,
        players: gamePlayers,
        cards: gameCards,
        actions: recentActions,
      };
    }),
});
