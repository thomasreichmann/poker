import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { cards } from "~/server/db/schema/cards";
import { players } from "~/server/db/schema/players";

const getCommunityCardsInput = z.object({
	gameId: z.string(),
});

export const cardsRouter = createTRPCRouter({
	getCommunityCards: privateProcedure
		.input(getCommunityCardsInput)
		.query(async ({ ctx, input }) => {
			const userId = ctx.user.id;

			// Verify the user is a player in this game
			const player = await ctx.db.query.players.findFirst({
				where: and(eq(players.userId, userId), eq(players.gameId, input.gameId)),
			});

			if (!player) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Player not in game",
				});
			}

			// Get community cards (cards without a playerId)
			const communityCards = await ctx.db.query.cards.findMany({
				where: and(eq(cards.gameId, input.gameId), isNull(cards.playerId)),
			});

			return communityCards;
		}),
});

export type CommunityCards = Awaited<ReturnType<typeof cardsRouter.getCommunityCards>>;
