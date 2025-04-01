import { eq } from "drizzle-orm";
import { actionRouter } from "~/server/api/routers/player/action";
import { type SelectGameWithPlayers } from "~/server/db/schema";
import { createTRPCRouter, privateProcedure } from "../../trpc";

export const playerRouter = createTRPCRouter({
	tables: privateProcedure.query(async ({ ctx }) => {
		const tables = await ctx.db.query.players.findMany({
			where: (player) => eq(player.userId, ctx.user.id),
			with: {
				game: true,
			},
		});

		return tables;
	}),
	playerViews: privateProcedure.query(async ({ ctx }) => {
		const tables = await ctx.db.query.games.findMany({
			with: {
				players: true,
			},
			where: (game) => {
				const typed = game as unknown as SelectGameWithPlayers;
				return eq(typed.players.find((p) => p.userId === ctx.user.id)!.userId, ctx.user.id);
			},
		});

		return tables;
	}),
	action: actionRouter,
});

export type PlayerView = Awaited<ReturnType<typeof playerRouter.playerViews>>[number];
