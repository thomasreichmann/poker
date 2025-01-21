import { createTRPCRouter, privateProcedure, publicProcedure } from "../trpc";

export const tableRouter = createTRPCRouter({
	hello: publicProcedure.query(async ({ ctx }) => {
		return "world";
	}),
	getAllPublic: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.publicTables.findMany();
	}),
	playerTables: privateProcedure.query(async ({ ctx }) => {
		console.log(ctx.user.id);
		// Get all tables that the user has a private state for (should be all tables that he is playing)
		const userId = ctx.user.id;
		const privatePlayerState = await ctx.db.query.privatePlayerState.findMany({
			with: {
				publicTable: true,
			},
			where: (privateState, { eq }) => eq(privateState.userId, userId),
		});

		return privatePlayerState;
	}),
	getPrivateState: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.privateTableState.findMany();
	}),
	getPrivatePlayerState: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.privatePlayerState.findMany();
	}),
});
