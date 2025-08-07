import { TRPCError } from "@trpc/server";
import type { ActInput } from "~/server/api/routers/player/action";
import type { AuthenticatedTRPCContext as Context } from "~/server/api/trpc";

import { actions, ActionTypeSchema } from "~/server/db/schema/actions";

export class ActionRepository {
  constructor(private ctx: Context) {}

  async createAction(
    gameId: string, 
    playerId: string, 
    input: ActInput
  ) {
    const [action] = await this.ctx.db
      .insert(actions)
      .values({
        gameId,
        playerId,
        actionType: input.action,
        amount: input.action === ActionTypeSchema.enum.bet ? input.amount : null,
      })
      .returning();

    if (!action) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create action" });
    }

    return action;
  }
}