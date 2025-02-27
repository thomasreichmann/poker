import { eq } from "drizzle-orm";
import { actionRouter } from "~/server/api/routers/player/action";
import { publicTables } from "~/server/db/schema";
import { createTRPCRouter, privateProcedure } from "../../trpc";

export const playerRouter = createTRPCRouter({
	tables: privateProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.privatePlayerState.findMany({
			where: (state) => eq(state.userId, ctx.user.id),
			with: {
				publicTable: true,
			},
		});
	}),
	playerViews: privateProcedure.query(async ({ ctx }) => {
		const tables = await ctx.db.query.publicTables.findMany({
			with: {
				privatePlayerState: {
					where: (pPlayerState, { eq }) => eq(pPlayerState.tableId, publicTables.id),
					columns: {
						userId: true,
						folded: true,
						position: true,
					},
				},
			},
		});

		return tables;
	}),
	action: actionRouter,
});

export type PlayerView = Awaited<ReturnType<typeof playerRouter.playerViews>>[number];
