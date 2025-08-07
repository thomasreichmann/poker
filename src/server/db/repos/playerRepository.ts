import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { type AuthenticatedTRPCContext as Context } from "~/server/api/trpc";
import { type InsertPlayer, players } from "~/server/db/schema/players";

export class PlayerRepository {
  constructor(private ctx: Context) {}

  async getActivePlayersWithCards(gameId: string) {
    return this.ctx.db.query.players.findMany({
      where: and(eq(players.gameId, gameId), eq(players.hasFolded, false)),
      with: {
        cards: true,
      },
      orderBy: desc(players.seat),
    });
  }

  async createPlayer(values: InsertPlayer) {
    const [player] = await this.ctx.db.insert(players).values(values).returning();

    if (!player) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create player" });
    }

    return player;
  }
}

// Legacy exports for backward compatibility
export async function getActivePlayersWithCards(ctx: Context, gameId: string) {
	return new PlayerRepository(ctx).getActivePlayersWithCards(gameId);
}

export async function createPlayer(ctx: Context, values: InsertPlayer) {
	return new PlayerRepository(ctx).createPlayer(values);
}
