import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { type ActInput } from "~/server/api/routers/player/action";
import { type AuthenticatedTRPCContext as Context } from "~/server/api/trpc";
import { createPlayer, getActivePlayersWithCards } from "~/server/db/repos/playerRepository";
import { evaluateHand, generateDeck, getAvailableCards, getRandomCards } from "./cards";

import { type Action, actions, ActionTypeSchema } from "~/server/db/schema/actions";
import { cards } from "~/server/db/schema/cards";
import { type Game, games, type GameWithCards, type roundTypeEnum } from "~/server/db/schema/games";
import { type Player, players, type PlayerWithCards } from "~/server/db/schema/players";

export async function handleJoinGame(ctx: Context, gameId: string, stack: number): Promise<Player> {
	const maxPositionResult = await ctx.db
		.select({ maxPosition: sql<number>`COALESCE(MAX(${players.seat}), -1)` })
		.from(players)
		.where(eq(players.gameId, gameId));

	const newPosition = (maxPositionResult[0]?.maxPosition ?? -1) + 1;

	const player = await createPlayer(ctx, {
		gameId,
		userId: ctx.user.id,
		seat: newPosition,
		stack,
	});

	const [playersInGameResult] = await ctx.db
		.select({ count: sql<number>`COUNT(*)` })
		.from(players)
		.where(eq(players.gameId, gameId));

	if (playersInGameResult?.count == 2) {
		await startGame(ctx, gameId);
	}

	return player;
}

export async function startGame(ctx: Context, gameId: string) {
	let game = await ctx.db.query.games.findFirst({
		where: eq(games.id, gameId),
	});

	if (!game) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Game not found" });
	}

	game = await nextPlayer(ctx, game, {
		status: "active",
		currentRound: "pre-flop",
		currentHighestBet: 0,
		pot: 0,
	});

	if (!game) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to start game, game not returned from update",
		});
	}

	await dealCards(ctx, game);

	return game;
}

export async function handleAction(ctx: Context, input: ActInput): Promise<Game> {
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

/**
 * Validates a bet action against the current game state and player state
 * @throws {TRPCError} If the bet is invalid
 */
async function validateBet(
	ctx: Context,
	action: Action,
	game: Game,
	player: Player,
): Promise<void> {
	if (!action.amount) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Bet amount is required" });
	}

	// Validate the bet amount
	if (action.amount <= 0) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Bet amount must be positive" });
	}

	if (action.amount > player.stack) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Bet amount exceeds player's stack" });
	}

	// Calculate the minimum valid bet
	const minValidBet = game.currentHighestBet + game.bigBlind;
	if (action.amount < game.currentHighestBet) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Bet must be at least ${game.currentHighestBet} (current highest bet)`,
		});
	}

	// If the bet is more than the current highest bet, it must be at least minValidBet
	if (
		action.amount > game.currentHighestBet &&
		action.amount < minValidBet &&
		action.amount !== player.stack
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Bet must be at least ${minValidBet} (current highest bet + big blind)`,
		});
	}

	// Validate that the bet is a multiple of the big blind
	if (action.amount % game.bigBlind !== 0 && action.amount !== player.stack) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Bet must be a multiple of ${game.bigBlind}`,
		});
	}
}

export async function handleBet(ctx: Context, action: Action): Promise<Game> {
	// Get the current game state
	const game = await ctx.db.query.games.findFirst({
		where: eq(games.id, action.gameId),
	});

	if (!game) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Game not found" });
	}

	// Get the player's current state
	const player = await ctx.db.query.players.findFirst({
		where: eq(players.id, action.playerId),
	});

	if (!player) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Player not found" });
	}

	// Validate the bet
	await validateBet(ctx, action, game, player);

	// Process the bet
	await ctx.db
		.update(players)
		.set({
			stack: sql`${players.stack} - ${action.amount}`,
			currentBet: sql`COALESCE(${players.currentBet}, 0) + ${action.amount}`,
		})
		.where(eq(players.id, action.playerId));

	const updatedGame = (
		await ctx.db
			.update(games)
			.set({
				pot: sql`${games.pot} + ${action.amount}`,
				currentHighestBet: sql`CASE WHEN ${games.currentHighestBet} < ${action.amount} THEN ${action.amount} ELSE ${games.currentHighestBet} END`,
			})
			.where(eq(games.id, action.gameId))
			.returning()
	)[0];

	if (!updatedGame) {
		throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update game" });
	}

	return updatedGame;
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

/**
 * Handles the case where only one player remains in the game (everyone else has folded)
 * @returns The completed game state
 */
async function handleSinglePlayerWin(
	ctx: Context,
	game: Game,
	winner: { id: string; stack: number },
): Promise<Game> {
	// Update both player and game state in parallel
	const [completedGame] = await Promise.all([
		ctx.db
			.update(games)
			.set({
				status: "completed",
				currentRound: "showdown",
				updatedAt: new Date(),
			})
			.where(eq(games.id, game.id))
			.returning(),
		ctx.db
			.update(players)
			.set({
				stack: sql`${players.stack} + ${game.pot}`,
				hasWon: true,
			})
			.where(eq(players.id, winner.id))
			.returning(),
	]);

	if (!completedGame?.[0]) {
		throw new Error("Failed to complete game");
	}

	return completedGame[0];
}

export async function advanceGameState(ctx: Context, game: Game): Promise<Game> {
	// Get all active players and their current bets in a single query
	const activePlayers = await ctx.db
		.select({
			id: players.id,
			stack: players.stack,
			currentBet: players.currentBet,
		})
		.from(players)
		.where(and(eq(players.gameId, game.id), eq(players.hasFolded, false)));

	if (activePlayers.length === 1) {
		return handleSinglePlayerWin(ctx, game, activePlayers[0]!);
	}

	// Check if all players have acted in the current round
	const unactedPlayers = activePlayers.filter(
		(player) => !player.currentBet || player.currentBet !== game.currentHighestBet,
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

	// Handle both special cases first
	switch (nextRound) {
		case "showdown":
			return handleShowdown(ctx, game);
		case null:
			return resetGame(ctx, game.id);
	}

	// Reset current bets for the new round and advance to next round in parallel
	const [updatedGame] = await Promise.all([
		ctx.db
			.update(games)
			.set({
				currentRound: nextRound,
				currentHighestBet: 0,
			})
			.where(eq(games.id, game.id))
			.returning(),
		ctx.db
			.update(players)
			.set({ currentBet: null })
			.where(eq(players.gameId, game.id))
			.returning(),
	]);

	if (!updatedGame?.[0]) {
		throw new Error("Failed to update game state");
	}

	await dealCards(ctx, updatedGame[0]);

	// Set the next player to act in the new round
	return nextPlayer(ctx, updatedGame[0]);
}

/**
 * Handles all card dealing, including the community cards and hole cards.
 * @param ctx - The context object
 * @param game - The game object
 */
async function dealCards(ctx: Context, game: Game) {
	const activePlayers = await getActivePlayersWithCards(ctx, game.id);

	if (activePlayers.length === 0) {
		throw new Error("No active players found");
	}

	// Get all cards already dealt in this game
	const dealtCards = await ctx.db.query.cards.findMany({
		where: eq(cards.gameId, game.id),
	});

	// Generate a full deck and get available cards
	const deck = generateDeck();
	const availableCards = getAvailableCards(deck, dealtCards);

	// Deal cards based on the current round
	switch (game.currentRound) {
		case "pre-flop":
			// Deal 2 hole cards to each player
			for (const player of activePlayers) {
				const holeCards = getRandomCards(availableCards, 2);
				await ctx.db.insert(cards).values(
					holeCards.map((card) => ({
						...card,
						gameId: game.id,
						playerId: player.id,
					})),
				);
			}
			break;

		case "flop":
			// Deal 3 community cards
			const flopCards = getRandomCards(availableCards, 3);
			await ctx.db.insert(cards).values(
				flopCards.map((card) => ({
					...card,
					gameId: game.id,
					playerId: null,
				})),
			);
			break;

		case "turn":
			// Deal 1 community card
			const turnCard = getRandomCards(availableCards, 1)[0];
			if (turnCard) {
				await ctx.db.insert(cards).values({
					...turnCard,
					gameId: game.id,
					playerId: null,
				});
			}
			break;

		case "river":
			// Deal 1 community card
			const riverCard = getRandomCards(availableCards, 1)[0];
			if (riverCard) {
				await ctx.db.insert(cards).values({
					...riverCard,
					gameId: game.id,
					playerId: null,
				});
			}
			break;

		default:
			throw new Error(`Invalid round for dealing cards: ${game.currentRound}`);
	}
}

/**
 * Finds the winner or winners of the game and their hand evaluations
 * by comparing the highest hand of each player
 */
export async function findWinners(
	game: GameWithCards,
	activePlayers: PlayerWithCards[],
): Promise<{
	winners: PlayerWithCards[];
	evaluations: Array<{ player: PlayerWithCards; evaluation: ReturnType<typeof evaluateHand> }>;
}> {
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
		return {
			winners: [bestHands[0]!.player],
			evaluations: playerHands,
		};
	}

	// If multiple players have the same hand rank, compare their hand values
	const bestValue = Math.max(...bestHands.map((ph) => ph.evaluation.value));
	const winners = bestHands
		.filter((ph) => ph.evaluation.value === bestValue)
		.map((ph) => ph.player);

	return {
		winners,
		evaluations: playerHands,
	};
}

async function handleShowdown(ctx: Context, game: Game) {
	// If we're at showdown, complete the game
	const activePlayers = await getActivePlayersWithCards(ctx, game.id);

	if (activePlayers.length === 0) {
		throw new Error("No active players found");
	}

	const gameWithCards = await ctx.db.query.games.findFirst({
		where: eq(games.id, game.id),
		with: {
			cards: {
				where: isNull(cards.playerId),
			},
		},
	});

	if (!gameWithCards) {
		throw new Error("Game with cards not found");
	}

	// Find winners and get all hand evaluations
	const { winners, evaluations } = await findWinners(gameWithCards, activePlayers);

	// Determine which players need to show their cards
	// 1. All winners must show their cards
	// 2. Players who bet/raised in the last round must show their cards
	// 3. Players who called the last bet must show their cards
	const lastRoundActions = await ctx.db.query.actions.findMany({
		where: and(
			eq(actions.gameId, game.id),
			or(
				eq(actions.actionType, ActionTypeSchema.enum.bet),
				eq(actions.actionType, ActionTypeSchema.enum.call),
			),
		),
		orderBy: desc(actions.createdAt),
	});

	const playersWhoActed = new Set(lastRoundActions.map((action) => action.playerId));
	const playersToShowCards = new Set([...winners.map((w) => w.id), ...playersWhoActed]);

	// Update player states with hand information and visibility
	for (const { player, evaluation } of evaluations) {
		await ctx.db
			.update(players)
			.set({
				hasWon: winners.some((w) => w.id === player.id),
				showCards: playersToShowCards.has(player.id),
				handRank: evaluation.rank,
				handValue: evaluation.value,
				handName: evaluation.name,
			})
			.where(eq(players.id, player.id));
	}

	// Calculate pot distribution
	const potPerWinner = Math.floor(game.pot / winners.length);
	const remainder = game.pot % winners.length;

	// Update winner stacks and log results
	for (const [index, winner] of winners.entries()) {
		// Add pot share to winner's stack
		const extraChip = index < remainder ? 1 : 0; // Distribute remainder chips one by one
		await ctx.db
			.update(players)
			.set({
				stack: sql`${players.stack} + ${potPerWinner + extraChip}`,
			})
			.where(eq(players.id, winner.id));

		// Log winner details
		const winnerEval = evaluations.find((e) => e.player.id === winner.id);
		console.log(`Winner ${winner.id}:`);
		console.log(`- Hand: ${winner.cards?.map((card) => `${card.rank}${card.suit}`).join(" ")}`);
		console.log(`- Hand Name: ${winnerEval?.evaluation.name}`);
		console.log(`- Won: ${potPerWinner + extraChip} chips`);
		console.log(`- New stack: ${winner.stack + potPerWinner + extraChip}`);
	}

	const [completedGame] = await ctx.db
		.update(games)
		.set({
			status: "completed",
			currentRound: "showdown",
			updatedAt: new Date(),
		})
		.where(eq(games.id, game.id))
		.returning();

	if (!completedGame) {
		throw new Error("Failed to complete game");
	}

	return completedGame;
}

/**
 * Gets the first player to act in a new game (player to the left of the button)
 */
async function getFirstPlayer(
	ctx: Context,
	game: Game,
	activePlayers: PlayerWithCards[],
): Promise<PlayerWithCards> {
	let buttonPlayer = activePlayers.find((p) => p.isButton);
	if (!buttonPlayer) {
		// Assign the first player to be the button player

		const firstPlayer = activePlayers[0];
		if (!firstPlayer) {
			throw new Error("No first player found for button assignment");
		}

		await ctx.db.update(players).set({ isButton: true }).where(eq(players.id, firstPlayer.id));

		buttonPlayer = firstPlayer;
	}

	// Find the index of the button player
	const buttonIndex = activePlayers.findIndex((p) => p.id === buttonPlayer.id);
	// The player to the left of the button (small blind) is the next player
	const nextPlayerIndex = (buttonIndex + 1) % activePlayers.length;
	const nextPlayer = activePlayers[nextPlayerIndex];

	if (!nextPlayer) {
		throw new Error("No next player found");
	}

	return nextPlayer;
}

/**
 * Advances the game state to the next player
 */
export async function nextPlayer(
	ctx: Context,
	game: Game,
	extraGameUpdate?: Partial<Game>,
): Promise<Game> {
	// Get all active players in the game
	const activePlayers = await ctx.db
		.select()
		.from(players)
		.where(and(eq(players.gameId, game.id), eq(players.hasFolded, false)))
		.orderBy(asc(players.seat));

	if (activePlayers.length === 0) {
		throw new Error("No active players found");
	}

	// Get the next player based on whether this is the first turn or not
	const nextPlayer = !game.currentPlayerTurn
		? await getFirstPlayer(ctx, game, activePlayers)
		: activePlayers[
				(activePlayers.findIndex((p) => p.id === game.currentPlayerTurn) + 1) %
					activePlayers.length
			];

	if (!nextPlayer) {
		throw new Error("No next player found");
	}

	// Update the game with the next player's turn
	const [updatedGame] = await ctx.db
		.update(games)
		.set({
			currentPlayerTurn: nextPlayer.id,
			updatedAt: new Date(),
			...extraGameUpdate,
		})
		.where(eq(games.id, game.id))
		.returning();

	if (!updatedGame) {
		throw new Error("Failed to update game state");
	}

	return updatedGame;
}

export async function resetGame(ctx: Context, gameId: string): Promise<Game> {
	const [game] = await ctx.db
		.update(games)
		.set({
			status: "waiting",
			currentRound: "pre-flop",
			currentHighestBet: 0,
			pot: 0,
			currentPlayerTurn: null,
		})
		.where(eq(games.id, gameId))
		.returning();

	const updatedPlayers = await ctx.db
		.update(players)
		.set({
			hasFolded: false,
			currentBet: null,
			isButton: false,
			stack: 1000,
			showCards: false,
			handRank: null,
			handValue: null,
			handName: null,
		})
		.where(eq(players.gameId, gameId))
		.returning();

	await ctx.db.delete(cards).where(eq(cards.gameId, gameId));

	if (!game) {
		throw new Error("Failed to reset game");
	}

	if (updatedPlayers.length > 1) {
		await startGame(ctx, gameId);
	}

	return game;
}
