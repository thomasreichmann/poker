import type { Game } from "~/server/db/games";
import type { Player } from "~/server/db/players";

export const createTestGame = (overrides: Partial<Game> = {}): Game => ({
	id: "test-game-id",
	status: "active",
	currentRound: "showdown",
	currentHighestBet: 100,
	currentPlayerTurn: "player1",
	pot: 1000,
	communityCards: ["A♠", "K♠", "Q♠", "J♠", "10♠"],
	updatedAt: new Date(),
	...overrides,
});
export const createTestPlayer = (overrides: Partial<Player> = {}): Player => ({
	id: "player1",
	userId: "user1",
	gameId: "test-game-id",
	seat: 1,
	stack: 1000,
	holeCards: ["2♠", "3♠"],
	currentBet: 100,
	hasFolded: false,
	isConnected: true,
	lastSeen: new Date(),
	...overrides,
});
