import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { privatePlayerState } from "~/server/db/schema";
import { createTRPCRouter, privateProcedure, publicProcedure } from "../trpc";

export const tableRouter = createTRPCRouter({
	hello: publicProcedure.query(async ({ ctx }) => {
		return "world";
	}),
	getAllPublic: privateProcedure
		.input(z.object({ notJoined: z.boolean() }))
		.query(async ({ ctx, input }) => {
			if (!input.notJoined) {
				return await ctx.db.query.publicTables.findMany();
			} else {
				// Get all tables that the user has a private state for (should be all tables that he is playing)
				const userId = ctx.user.id;
				const privatePlayerState = await ctx.db.query.privatePlayerState.findMany({
					with: {
						publicTable: true,
					},
					where: (privateState, { eq }) => eq(privateState.userId, userId),
				});

				const tables = await ctx.db.query.publicTables.findMany();
				return tables.filter(
					(table) => !privatePlayerState.some((state) => state.tableId === table.id),
				);
			}
		}),
	playerTables: privateProcedure.query(async ({ ctx }) => {
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
	joinTable: privateProcedure
		.input(z.object({ tableId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			return await ctx.db
				.insert(privatePlayerState)
				.values({
					userId: ctx.user.id,
					tableId: input.tableId,
				})
				.returning();
		}),
	leaveTable: privateProcedure
		.input(z.object({ tableId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			return await ctx.db
				.delete(privatePlayerState)
				.where(
					and(
						eq(privatePlayerState.userId, ctx.user.id),
						eq(privatePlayerState.tableId, input.tableId),
					),
				);
		}),
});
