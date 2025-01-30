import { eq } from "drizzle-orm";
import { createTRPCRouter, privateProcedure } from "../trpc";

export const playerRouter = createTRPCRouter({
	tables: privateProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.privatePlayerState.findMany({
			where: (state) => eq(state.userId, ctx.user.id),
			with: {
				publicTable: true,
			},
		});
	}),
});
