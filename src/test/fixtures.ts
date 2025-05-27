import type { Card } from "~/server/db/schema/cards";
import { type GameWithCards } from "~/server/db/schema/games";
import { type PlayerWithCards } from "~/server/db/schema/players";

export const createTestGame = (overrides: Partial<GameWithCards> = {}): GameWithCards => ({
	id: "test-game-id",
	status: "active",
	currentRound: "showdown",
	currentHighestBet: 100,
	currentPlayerTurn: "player1",
	pot: 1000,
	updatedAt: new Date(),
	cards: createTestCards([
		["A", "hearts"],
		["K", "hearts"],
		["Q", "hearts"],
		["J", "hearts"],
		["10", "hearts"],
	]),
	...overrides,
});

export const createTestPlayer = (overrides: Partial<PlayerWithCards> = {}): PlayerWithCards => ({
	id: "player1",
	userId: "user1",
	gameId: "test-game-id",
	seat: 1,
	stack: 1000,
	currentBet: 100,
	hasFolded: false,
	isConnected: true,
	isButton: false,
	lastSeen: new Date(),
	...overrides,
});

type CardTuple = [Card["rank"], Card["suit"]];

type CardOptions = { gameId?: string | null; playerId?: string | null };

export const createTestCards = (cards: CardTuple[], options: CardOptions = {}): Card[] => {
	return cards.map(([rank, suit]) => createTestCard([rank, suit], options));
};

const createTestCard = ([rank, suit]: CardTuple, { gameId, playerId }: CardOptions = {}): Card => {
	return {
		id: 1,
		gameId: (gameId ?? gameId === null) ? gameId : "test-game-id",
		playerId: (playerId ?? playerId === null) ? playerId : "player1",
		rank,
		suit,
	};
};
