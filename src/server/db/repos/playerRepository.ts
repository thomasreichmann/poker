import { and, desc, eq } from "drizzle-orm";
import { type AuthenticatedTRPCContext as Context } from "~/server/api/trpc";
import { players } from "~/server/db/schema/players";

export async function getActivePlayersWithCards(ctx: Context, gameId: string) {
	return ctx.db.query.players.findMany({
		where: and(eq(players.gameId, gameId), eq(players.hasFolded, false)),
		with: {
			cards: true,
		},
		orderBy: desc(players.seat),
	});
}
