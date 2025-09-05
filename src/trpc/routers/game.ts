import { db } from "@/db";
import { actions, ActionTypeSchema } from "@/db/schema/actions";
import { cards } from "@/db/schema/cards";
import { games, type Game } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { users } from "@/db/schema/users";
import {
  advanceGameStatePure,
  handleActionPure,
  handleJoinGamePure,
  leaveGamePure,
  resetGamePure,
} from "@/lib/poker/engineAdapter";
import { and, count, desc, eq, isNull } from "drizzle-orm";
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
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const [gameRow] = await db
        .select({
          id: games.id,
          handId: games.handId,
          status: games.status,
          currentRound: games.currentRound,
          currentHighestBet: games.currentHighestBet,
          currentPlayerTurn: games.currentPlayerTurn,
          lastAggressorId: games.lastAggressorId,
          pot: games.pot,
          bigBlind: games.bigBlind,
          smallBlind: games.smallBlind,
          updatedAt: games.updatedAt,
          lastAction: games.lastAction,
          lastBetAmount: games.lastBetAmount,
          simulatorConfig: games.simulatorConfig,
          // Intentionally omit games.turnMs until DB migration is applied
        })
        .from(games)
        .where(eq(games.id, input.id))
        .limit(1);

      if (!gameRow) return null;

      // Provide a stable shape matching Game with a safe fallback for turnMs
      const game: Game = { ...gameRow, turnMs: 30_000 } as Game;

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
        displayName:
          row.player.displayName ??
          (row.email ? row.email.split("@")[0] + "@" : null),
      }));

      const gameCards = await db
        .select()
        .from(cards)
        .where(and(eq(cards.gameId, game.id), isNull(cards.playerId)));

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
      // If the user already has a seat, just flip the leave flag off and mark connected
      const existing = await db
        .select()
        .from(players)
        .where(
          and(eq(players.gameId, input.gameId), eq(players.userId, ctx.user.id))
        )
        .limit(1);
      const found = existing[0];
      if (found) {
        await db
          .update(players)
          .set({
            leaveAfterHand: false,
            isConnected: true,
            lastSeen: new Date(),
          })
          .where(eq(players.id, found.id));
        return { ...found, leaveAfterHand: false, isConnected: true };
      }
      // Otherwise, add a new seat (and possibly auto-start)
      const player = await handleJoinGamePure(
        ctx.user.id,
        input.gameId,
        input.stack
      );
      // Attempt to set displayName from user profile (email fallback)
      const name = ctx.user.user_metadata?.displayName
        ? String(ctx.user.user_metadata.displayName)
        : ctx.user.email
        ? String(ctx.user.email).split("@")[0] + "@"
        : null;
      if (name) {
        await db
          .update(players)
          .set({ displayName: name })
          .where(eq(players.id, player.id));
      }
      return player;
    }),

  // Act in game
  act: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        action: ActionTypeSchema,
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
      return await handleActionPure({
        ...input,
        playerId: player.id,
        actorSource: "human",
      });
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

  // Leave a game (fold immediately if active; remove after hand)
  leave: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await leaveGamePure(ctx.user.id, input.gameId);
    }),

  // Get player's hole cards
  getHoleCards: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [player] = await db
        .select()
        .from(players)
        .where(
          and(eq(players.gameId, input.gameId), eq(players.userId, ctx.user.id))
        )
        .limit(1);
      if (!player) throw new Error("Player not found in this game");

      const holeCards = await db
        .select()
        .from(cards)
        .where(
          and(eq(cards.gameId, input.gameId), eq(cards.playerId, player.id))
        );

      return holeCards;
    }),
  // Ask the server to timeout a player
  timeout: protectedProcedure
    .input(z.object({ gameId: z.uuid(), playerId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return "ok";
    }),
});
