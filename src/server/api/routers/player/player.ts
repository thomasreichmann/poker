import { z } from "zod";
import { actionRouter } from "~/server/api/routers/player/action";
import { cardsRouter } from "~/server/api/routers/player/cards";
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
	getAllGames: privateProcedure
		.input(
			z
				.object({
					joinedOnly: z.boolean().optional().default(false),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db.query.games.findMany({
				with: {
					players: {
						with: {
							cards: true,
						},
					},
					cards: {
						where: (cards, { isNull }) => isNull(cards.playerId),
					},
				},
			});

			return rows
				.map((row) => {
					const callerPlayer = row.players.find(
						(player) => player.userId === ctx.user.id,
					);
					const hasJoined = !!callerPlayer;
					return {
						...row,
						hasJoined,
						communityCards: row.cards.filter((card) => !!card.gameId),
						callerPlayer,
					};
				})
				.filter((game) => (input?.joinedOnly ? game.hasJoined : true));
		}),
	action: actionRouter,
	cards: cardsRouter,
});

export type PublicGame = Awaited<ReturnType<typeof playerRouter.getAllGames>>[number];
