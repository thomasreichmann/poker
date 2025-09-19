import { db } from "@/db";
import { ZodActionSchema } from "@/db/schema/actionTypes";
import { players } from "@/db/schema/players";
import { requireDevAccess } from "@/lib/permissions";
import {
  advanceGameStatePure,
  handleActionPure,
  leaveGamePure,
  resetGamePure,
} from "@/lib/poker/engineAdapter";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const devRouter = createTRPCRouter({
  // Check if current user has dev access
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    try {
      const permissionContext = await requireDevAccess(ctx.user.id);
      return {
        hasAccess: true,
        role: permissionContext.userRole,
      };
    } catch {
      return {
        hasAccess: false,
        role: null,
      };
    }
  }),

  // Execute action as any player (for dev testing)
  actAsPlayer: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        targetPlayerId: z.string().uuid(),
        action: ZodActionSchema,
        amount: z.number().int().positive().optional(),
        actorSource: z.enum(["human", "bot"]).optional(),
        botStrategy: z
          .enum([
            "always_fold",
            "call_any",
            "tight_aggro",
            "loose_passive",
            "human",
            "scripted",
          ])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify dev access
      await requireDevAccess(ctx.user.id);

      // Verify the target player exists in the game
      const targetPlayer = await db
        .select()
        .from(players)
        .where(
          and(
            eq(players.id, input.targetPlayerId),
            eq(players.gameId, input.gameId)
          )
        )
        .limit(1);

      if (!targetPlayer[0]) {
        throw new Error("Target player not found in this game");
      }

      // Execute the action as the target player (optionally annotate as bot)
      return await handleActionPure({
        gameId: input.gameId,
        playerId: input.targetPlayerId,
        action: input.action,
        amount: input.amount,
        actorSource: input.actorSource ?? "human",
        botStrategy: input.botStrategy ?? undefined,
      } as unknown as Parameters<typeof handleActionPure>[0]);
    }),

  // Advance game state (dev only)
  advanceGame: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify dev access
      await requireDevAccess(ctx.user.id);

      return await advanceGameStatePure(input.gameId);
    }),

  // Reset game (dev only)
  resetGame: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify dev access
      await requireDevAccess(ctx.user.id);

      return await resetGamePure(input.gameId);
    }),

  // Force a player to leave the game using the same flow as normal leave
  forceLeavePlayer: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        targetUserId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify dev access
      await requireDevAccess(ctx.user.id);

      // Ensure the target player exists in this game
      const targetPlayer = await db
        .select()
        .from(players)
        .where(
          and(
            eq(players.gameId, input.gameId),
            eq(players.userId, input.targetUserId)
          )
        )
        .limit(1);

      if (!targetPlayer[0]) {
        throw new Error("Target player not found in this game");
      }

      // Reuse the standard leave flow
      return await leaveGamePure(input.targetUserId, input.gameId);
    }),

  // Get all players in a game (for dev panel player selection)
  getGamePlayers: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify dev access
      await requireDevAccess(ctx.user.id);

      return await db
        .select()
        .from(players)
        .where(eq(players.gameId, input.gameId))
        .orderBy(players.seat);
    }),
});
