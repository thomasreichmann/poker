import { createTRPCRouter, publicProcedure } from "../trpc";

export const tableRouter = createTRPCRouter({
	hello: publicProcedure.query(async ({ ctx }) => {
		return "world";
	}),
	query: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.query.publicTables.findMany();
	}),
});
