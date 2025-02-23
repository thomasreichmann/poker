import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { publicTables } from "~/server/db/schema";

const actSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("bet"),
		amount: z.number(),
	}),
	z.object({
		action: z.literal("fold"),
	}),
	z.object({
		action: z.literal("check"),
	}),
]);

export type Action = z.infer<typeof actSchema>;

export const actionRouter = createTRPCRouter({
	act: privateProcedure
		.input(z.object({ tableId: z.number() }).and(actSchema))
		.mutation(async ({ ctx, input }) => {
			if (input.action === "bet") {
				await ctx.db
					.update(publicTables)
					.set({
						pot: sql`${publicTables.pot} + ${input.amount}`,
					})
					.where(eq(publicTables.id, input.tableId));

				return `${input.amount} bet`;
			} else if (input.action === "fold") {
				return `${input.action}`;
			} else if (input.action === "check") {
				return `${input.action}`;
			} else {
				throw new Error("Invalid action");
			}
		}),
});
