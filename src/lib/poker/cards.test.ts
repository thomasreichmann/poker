import { describe, expect, it } from "vitest";
import { type Card } from "~/server/db/schema/cards";
import { createTestCards } from "~/test/fixtures";
import { evaluateHand } from "./cards";

describe("Card Evaluation", () => {
	describe("Straight Flush", () => {
		it("should detect a straight flush", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["K", "spades"],
				["Q", "spades"],
				["J", "spades"],
				["10", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(8);
			expect(result.name).toBe("Straight Flush");
			expect(result.value).toBe(14); // Ace high
		});

		it("should detect a lower straight flush", () => {
			const cards: Card[] = createTestCards([
				["9", "hearts"],
				["8", "hearts"],
				["7", "hearts"],
				["6", "hearts"],
				["5", "hearts"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(8);
			expect(result.name).toBe("Straight Flush");
			expect(result.value).toBe(9);
		});
	});

	describe("Four of a Kind", () => {
		it("should detect four of a kind", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["A", "hearts"],
				["A", "diamonds"],
				["A", "clubs"],
				["K", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(7);
			expect(result.name).toBe("Four of a Kind");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Full House", () => {
		it("should detect a full house", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["A", "hearts"],
				["A", "diamonds"],
				["K", "spades"],
				["K", "hearts"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(6);
			expect(result.name).toBe("Full House");
			expect(result.value).toBe(1413); // Ace high full of Kings
		});
	});

	describe("Flush", () => {
		it("should detect a flush", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["J", "spades"],
				["8", "spades"],
				["6", "spades"],
				["2", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(5);
			expect(result.name).toBe("Flush");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Straight", () => {
		it("should detect a straight", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["K", "hearts"],
				["Q", "diamonds"],
				["J", "clubs"],
				["10", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(4);
			expect(result.name).toBe("Straight");
			expect(result.value).toBe(14); // Ace high
		});

		it("should detect an Ace-low straight", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["2", "hearts"],
				["3", "diamonds"],
				["4", "clubs"],
				["5", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(4);
			expect(result.name).toBe("Straight");
			expect(result.value).toBe(5); // 5 high
		});
	});

	describe("Three of a Kind", () => {
		it("should detect three of a kind", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["A", "hearts"],
				["A", "diamonds"],
				["K", "spades"],
				["Q", "hearts"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(3);
			expect(result.name).toBe("Three of a Kind");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Two Pair", () => {
		it("should detect two pair", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["A", "hearts"],
				["K", "diamonds"],
				["K", "clubs"],
				["Q", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(2);
			expect(result.name).toBe("Two Pair");
			expect(result.value).toBe(1413); // Ace high pair with King high pair
		});
	});

	describe("One Pair", () => {
		it("should detect one pair", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["A", "hearts"],
				["K", "diamonds"],
				["Q", "clubs"],
				["J", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(1);
			expect(result.name).toBe("One Pair");
			expect(result.value).toBe(14); // Ace high pair
		});
	});

	describe("High Card", () => {
		it("should detect high card", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["K", "hearts"],
				["Q", "diamonds"],
				["J", "clubs"],
				["9", "spades"],
			]);
			const result = evaluateHand(cards);
			expect(result.rank).toBe(0);
			expect(result.name).toBe("High Card");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Error Cases", () => {
		it("should throw error for less than 5 cards", () => {
			const cards: Card[] = createTestCards([
				["A", "spades"],
				["K", "hearts"],
				["Q", "diamonds"],
				["J", "clubs"],
			]);
			expect(() => evaluateHand(cards)).toThrow("Need at least 5 cards to evaluate a hand");
		});
	});
});
