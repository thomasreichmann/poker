import { actionRouter } from "~/server/api/routers/player/action";
import { createTRPCRouter, privateProcedure } from "../../trpc";

export const playerRouter = createTRPCRouter({
	getPlayerGames: privateProcedure.query(async ({ ctx }) => {
		const games = await ctx.db.query.games.findMany({
			with: {
				players: {
					where: (players, { eq }) => eq(players.userId, ctx.user.id),
				},
			},
		});

		return games;
	}),
	getAllGames: privateProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.games.findMany({
			with: {
				players: {
					where: (players, { eq }) => eq(players.userId, ctx.user.id),
				},
			},
		});
		return rows.map((row) => {
			const hasJoined = row.players.find((player) => player.userId === ctx.user.id);
			return {
				...row,
				hasJoined: hasJoined ? true : false,
			};
		});
	}),
	action: actionRouter,
});

export type PublicGame = Awaited<ReturnType<typeof playerRouter.getAllGames>>[number];
