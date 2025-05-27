import { describe, expect, it } from "vitest";
import { type Player } from "~/server/db/schema/players";
import { createTestCards, createTestGame, createTestPlayer } from "~/test/fixtures";
import { findWinners } from "./engine";

describe("Game Engine", () => {
	describe("findWinners", () => {
		it("should find a single winner with the best hand", async () => {
			const mockGame = createTestGame({
				cards: createTestCards([
					["A", "spades"],
					["K", "spades"],
					["Q", "spades"],
					["7", "spades"],
					["4", "spades"],
				]),
			});

			const activePlayers: Player[] = [
				createTestPlayer({
					id: "player1",
					cards: createTestCards([
						["10", "spades"],
						["J", "spades"],
					]),
				}),
				createTestPlayer({
					id: "player2",
					cards: createTestCards([
						["2", "hearts"],
						["3", "hearts"],
					]),
				}),
			];

			const winners = await findWinners(mockGame, activePlayers);
			expect(winners).toHaveLength(1);
			expect(winners[0]?.id).toBe("player1"); // Player 1 has a straight flush with 9 high
		});

		it("should find multiple winners with equal hands", async () => {
			const mockGame = createTestGame();

			const activePlayers: Player[] = [
				createTestPlayer({
					id: "player1",
					cards: createTestCards([
						["2", "spades"],
						["3", "spades"],
					]),
				}),
				createTestPlayer({
					id: "player2",
					cards: createTestCards([
						["2", "spades"],
						["3", "spades"],
					]),
				}),
			];

			const winners = await findWinners(mockGame, activePlayers);
			expect(winners).toHaveLength(2);
			expect(winners.map((winner) => winner.id)).toContain("player1");
			expect(winners.map((winner) => winner.id)).toContain("player2");
		});

		it("should throw error for no active players", async () => {
			const mockGame = createTestGame();
			const activePlayers: Player[] = [];
			await expect(findWinners(mockGame, activePlayers)).rejects.toThrow(
				"No active players to find winners",
			);
		});

		it("should throw error for player without hole cards", async () => {
			const mockGame = createTestGame();

			const activePlayers: Player[] = [
				createTestPlayer({
					cards: undefined,
				}),
			];

			await expect(findWinners(mockGame, activePlayers)).rejects.toThrow(
				"Player player1 has no hole cards",
			);
		});

		it("should throw error for player without game ID", async () => {
			const mockGame = createTestGame();

			const activePlayers: Player[] = [
				createTestPlayer({
					gameId: undefined,
				}),
			];

			await expect(findWinners(mockGame, activePlayers)).rejects.toThrow(
				"First player has no game ID",
			);
		});
	});
});
