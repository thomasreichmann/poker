import { db } from "@/db";
import { actions } from "@/db/schema/actions";
import { cards } from "@/db/schema/cards";
import { games } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { users } from "@/db/schema/users";
import {
  advanceGameStatePure,
  handleActionPure,
  handleJoinGamePure,
  leaveGamePure,
  resetGamePure,
} from "@/lib/poker/engineAdapter";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";

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

      const gamePlayersJoined = await db
        .select({
          player: players,
          email: users.email,
        })
        .from(players)
        .leftJoin(users, eq(players.userId, users.id))
        .where(eq(players.gameId, game.id))
        .orderBy(players.seat);

      const gamePlayers = gamePlayersJoined.map((row) => ({
        ...row.player,
        email: row.email ?? null,
      }));

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

  // Join game (creates a player and may start the game)
  join: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        stack: z.number().int().positive().default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await handleJoinGamePure(
        ctx.user.id,
        input.gameId,
        input.stack
      );
      return player;
    }),

  // Act in game
  act: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        action: z.enum(["bet", "check", "call", "raise", "fold"]),
        amount: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(players)
        .where(
          and(eq(players.gameId, input.gameId), eq(players.userId, ctx.user.id))
        )
        .limit(1);
      const player = rows[0];
      if (!player) throw new Error("Player not found in this game");
      return await handleActionPure({ ...input, playerId: player.id });
    }),

  // Advance game state (next player/round/showdown)
  advance: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return await advanceGameStatePure(input.gameId);
    }),

  // Reset a game back to initial state and optionally auto-start if >= 2 players
  reset: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return await resetGamePure(input.gameId);
    }),

  // Leave a game (removes player's seat; advances turn or awards pot if needed)
  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await leaveGamePure(ctx.user.id, input.gameId);
    }),
});
