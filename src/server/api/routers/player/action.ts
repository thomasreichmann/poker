import { z } from "zod";
import { handleAction } from "~/lib/poker/engine";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { ActionTypeSchema } from "~/server/db/actions";

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

const actInput = z.object({ tableId: z.string() }).and(actSchema);
export type ActInput = z.infer<typeof actInput>;

export const actionRouter = createTRPCRouter({
	act: privateProcedure.input(actInput).mutation(({ ctx, input }) => {
		return handleAction(ctx, input);
	}),
});
