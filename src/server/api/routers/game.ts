import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { handleJoinGame, nextPlayer } from "~/lib/poker/engine";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { games } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";

export const gameRouter = createTRPCRouter({
	getAll: privateProcedure.query(async ({ ctx }) => {
		const games = await ctx.db.query.games.findMany();
		return games;
	}),
	get: privateProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
		const game = await ctx.db.query.games.findFirst({
			where: (games, { eq }) => eq(games.id, input.id),
		});
		return game;
	}),
	create: privateProcedure.mutation(async ({ ctx }) => {
		return await ctx.db.insert(games).values({}).returning();
	}),
	delete: privateProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.delete(games).where(eq(games.id, input.id));
		}),
	join: privateProcedure
		.input(z.object({ gameId: z.string(), stack: z.number().default(1000) }))
		.mutation(async ({ ctx, input }) => {
			return await handleJoinGame(ctx, input.gameId, input.stack);
		}),
	leave: privateProcedure
		.input(z.object({ gameId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const game = await ctx.db.query.games.findFirst({
				where: (g, { eq }) => eq(g.id, input.gameId),
				with: {
					players: true,
				},
			});

			if (game?.currentPlayerTurn === ctx.user.id) {
				await nextPlayer(ctx, game);
			}

			await ctx.db
				.delete(players)
				.where(and(eq(players.userId, ctx.user.id), eq(players.gameId, input.gameId)));
		}),
});
