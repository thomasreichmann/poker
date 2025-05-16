import { TRPCError } from "@trpc/server";
import { and, asc, eq, not, sql } from "drizzle-orm";
import { type ActInput } from "~/server/api/routers/player/action";
import { type AuthenticatedTRPCContext as Context } from "~/server/api/trpc";
import { getActivePlayersWithCards } from "~/server/db/repos/playerRepository";
import { evaluateHand } from "./cards";

import { type Action, actions, ActionTypeSchema } from "~/server/db/schema/actions";
import { type Game, games, type GameWithCards, type roundTypeEnum } from "~/server/db/schema/games";
import { players, type PlayerWithCards } from "~/server/db/schema/players";

export async function handleAction(ctx: Context, input: ActInput) {
	const [action] = await ctx.db
		.insert(actions)
		.values({
			gameId: input.gameId,
			playerId: input.playerId,
			actionType: input.action,
			amount: input.action === ActionTypeSchema.enum.bet ? input.amount : null,
		})
		.returning();

	if (!action) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create action" });
	}

	const game = await handleActionType(ctx, action);

	return await advanceGameState(ctx, game);
}

export async function handleActionType(ctx: Context, action: Action): Promise<Game> {
	switch (action.actionType) {
		case ActionTypeSchema.enum.bet:
			return handleBet(ctx, action);
		case ActionTypeSchema.enum.fold:
			return handleFold(ctx, action);
		default:
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Invalid action OR not implemented",
			});
	}
}

export async function handleBet(ctx: Context, action: Action): Promise<Game> {
	if (!action.amount) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Bet amount is required" });
	}

	await ctx.db
		.update(players)
		.set({
			stack: sql`${players.currentBet} - ${players.stack} - ${action.amount}`,
			currentBet: sql`${players.currentBet} + ${action.amount}`,
		})
		.where(eq(players.id, action.playerId));

	const game = (
		await ctx.db
			.update(games)
			.set({
				pot: sql`${games.pot} + ${action.amount}`,
				currentHighestBet: sql`CASE WHEN ${games.currentHighestBet} < ${action.amount} THEN ${action.amount} ELSE ${games.currentHighestBet} END`,
			})
			.where(eq(games.id, action.gameId))
			.returning()
	)[0];

	if (!game) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update game" });
	}

	return game;
}

export async function handleFold(ctx: Context, action: Action): Promise<Game> {
	await ctx.db
		.update(players)
		.set({
			hasFolded: true,
		})
		.where(eq(players.id, action.playerId));

	// TODO: Remove this, the update is unnecessary, it only exists to make the return type standard for later use.
	const game = (
		await ctx.db
			.update(games)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(games.id, action.gameId))
			.returning()
	)[0];

	if (!game) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update game" });
	}

	return game;
}

export type RoundType = (typeof roundTypeEnum.enumValues)[number];

export const ROUND_PROGRESSION: Record<RoundType, RoundType | null> = {
	"pre-flop": "flop",
	flop: "turn",
	turn: "river",
	river: "showdown",
	showdown: null,
};

export async function advanceGameState(ctx: Context, game: Game): Promise<Game> {
	// Check if all players have acted in the current round
	const unactedPlayers = await ctx.db
		.select()
		.from(players)
		.where(
			and(
				eq(players.gameId, game.id),
				eq(players.hasFolded, false),
				not(eq(players.currentBet, game.currentHighestBet)),
			),
		);

	const allPlayersActed = unactedPlayers.length === 0;

	if (!allPlayersActed) {
		// If not all players have acted, advance to the next player
		return nextPlayer(ctx, game);
	}

	if (!game.currentRound) {
		throw new Error("Game has no current round");
	}

	const nextRound = ROUND_PROGRESSION[game.currentRound];

	if (!nextRound) {
		// If we're at showdown, complete the game
		const activePlayers = await getActivePlayersWithCards(ctx, game.id);

		if (activePlayers.length === 0) {
			throw new Error("No active players found");
		}

		const winners = await findWinners(game, activePlayers);
		// TODO: Handle winners
		console.log("winners", winners);

		const [completedGame] = await ctx.db
			.update(games)
			.set({
				status: "completed",
				updatedAt: new Date(),
			})
			.where(eq(games.id, game.id))
			.returning();

		if (!completedGame) {
			throw new Error("Failed to complete game");
		}

		return completedGame;
	}

	// Reset current bets for the new round
	await ctx.db.update(players).set({ currentBet: null }).where(eq(players.gameId, game.id));

	// Advance to the next round
	const [updatedGame] = await ctx.db
		.update(games)
		.set({
			currentRound: nextRound,
			currentHighestBet: 0,
		})
		.where(eq(games.id, game.id))
		.returning();

	if (!updatedGame) {
		throw new Error("Failed to update game state");
	}

	return updatedGame;
}

/**
 * Advances the game state to the next player
 */
export async function nextPlayer(ctx: Context, game: Game): Promise<Game> {
	// Get all active players in the game
	const activePlayers = await ctx.db
		.select()
		.from(players)
		.where(and(eq(players.gameId, game.id), eq(players.hasFolded, false)))
		.orderBy(asc(players.seat));

	if (activePlayers.length === 0) {
		throw new Error("No active players found");
	}

	// Find the current player's index
	const currentPlayerIndex = activePlayers.findIndex((p) => p.id === game.currentPlayerTurn);

	// Get the next player's index (wrap around to start if at end)
	const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
	const nextPlayer = activePlayers[nextPlayerIndex];

	if (!nextPlayer) {
		throw new Error("No next player found");
	}

	// Update the game with the next player's turn
	const [updatedGame] = await ctx.db
		.update(games)
		.set({
			currentPlayerTurn: nextPlayer.id,
			updatedAt: new Date(),
		})
		.where(eq(games.id, game.id))
		.returning();

	if (!updatedGame) {
		throw new Error("Failed to update game state");
	}

	return updatedGame;
}

/**
 * Finds the winner or winners of the game
 * by comparing the highest hand of each player
 */
export async function findWinners(
	game: GameWithCards,
	activePlayers: PlayerWithCards[],
): Promise<PlayerWithCards[]> {
	if (activePlayers.length === 0) {
		throw new Error("No active players to find winners");
	}

	const firstPlayer = activePlayers[0];
	if (!firstPlayer?.gameId) {
		throw new Error("First player has no game ID");
	}

	// Evaluate each player's hand
	const playerHands = activePlayers.map((player) => {
		if (!player.cards) {
			throw new Error(`Player ${player.id} has no hole cards`);
		}
		const allCards = [...player.cards, ...(game.cards ?? [])];
		return {
			player,
			evaluation: evaluateHand(allCards),
		};
	});

	// Find the best hand rank
	const bestRank = Math.max(...playerHands.map((ph) => ph.evaluation.rank));

	// Filter players with the best hand rank
	const bestHands = playerHands.filter((ph) => ph.evaluation.rank === bestRank);

	// If only one player has the best hand, they win
	if (bestHands.length === 1) {
		const winner = bestHands[0]?.player;
		if (!winner) {
			throw new Error("No winner found");
		}
		return [winner];
	}

	// If multiple players have the same hand rank, compare their hand values
	const bestValue = Math.max(...bestHands.map((ph) => ph.evaluation.value));
	const winners = bestHands
		.filter((ph) => ph.evaluation.value === bestValue)
		.map((ph) => ph.player);

	return winners;
}
