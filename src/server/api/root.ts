import { createCallerFactory, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { playerRouter } from "./routers/player/player";
import { oldTableRouter, tableRouter } from "./routers/table";
export const sanityRouter = createTRPCRouter({
	hello: publicProcedure.query(async () => {
		return "world";
	}),
});

export const appRouter = createTRPCRouter({
	sanity: sanityRouter,
	_old_table: oldTableRouter,
	table: tableRouter,
	player: playerRouter,
	admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
