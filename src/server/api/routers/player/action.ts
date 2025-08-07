import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { handleActionPure } from "~/lib/poker/engineAdapter";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { ActionTypeSchema } from "~/server/db/schema/actions";
import { players } from "~/server/db/schema/players";

const actSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal(ActionTypeSchema.enum.bet),
		amount: z.number(),
	}),
	z.object({
		action: z.literal(ActionTypeSchema.enum.fold),
	}),
	z.object({
		action: z.literal(ActionTypeSchema.enum.check),
	}),
]);

export type Act = z.infer<typeof actSchema>;

const actInput = z.object({ gameId: z.string() }).and(actSchema);
export type ActInput = z.infer<typeof actInput>;

export const actionRouter = createTRPCRouter({
	act: privateProcedure.input(actInput).mutation(async ({ ctx, input }) => {
		const userId = ctx.user.id;

		const player = await ctx.db.query.players.findFirst({
			where: and(eq(players.userId, userId), eq(players.gameId, input.gameId)),
		});

		if (!player) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Player not in game" });
		}

		return handleActionPure(ctx, input, player.id);
	}),
});
