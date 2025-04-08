import { describe, expect, it } from "vitest";
import { evaluateHand, type Card } from "./cards";

describe("Card Evaluation", () => {
	describe("Straight Flush", () => {
		it("should detect a straight flush", () => {
			const cards: Card[] = ["A♠", "K♠", "Q♠", "J♠", "10♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(8);
			expect(result.name).toBe("Straight Flush");
			expect(result.value).toBe(14); // Ace high
		});

		it("should detect a lower straight flush", () => {
			const cards: Card[] = ["9♥", "8♥", "7♥", "6♥", "5♥"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(8);
			expect(result.name).toBe("Straight Flush");
			expect(result.value).toBe(9);
		});
	});

	describe("Four of a Kind", () => {
		it("should detect four of a kind", () => {
			const cards: Card[] = ["A♠", "A♥", "A♦", "A♣", "K♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(7);
			expect(result.name).toBe("Four of a Kind");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Full House", () => {
		it("should detect a full house", () => {
			const cards: Card[] = ["A♠", "A♥", "A♦", "K♠", "K♥"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(6);
			expect(result.name).toBe("Full House");
			expect(result.value).toBe(1413); // Ace high full of Kings
		});
	});

	describe("Flush", () => {
		it("should detect a flush", () => {
			const cards: Card[] = ["A♠", "J♠", "8♠", "6♠", "2♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(5);
			expect(result.name).toBe("Flush");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Straight", () => {
		it("should detect a straight", () => {
			const cards: Card[] = ["A♠", "K♥", "Q♦", "J♣", "10♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(4);
			expect(result.name).toBe("Straight");
			expect(result.value).toBe(14); // Ace high
		});

		it("should detect an Ace-low straight", () => {
			const cards: Card[] = ["A♠", "2♥", "3♦", "4♣", "5♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(4);
			expect(result.name).toBe("Straight");
			expect(result.value).toBe(5); // 5 high
		});
	});

	describe("Three of a Kind", () => {
		it("should detect three of a kind", () => {
			const cards: Card[] = ["A♠", "A♥", "A♦", "K♠", "Q♥"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(3);
			expect(result.name).toBe("Three of a Kind");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Two Pair", () => {
		it("should detect two pair", () => {
			const cards: Card[] = ["A♠", "A♥", "K♦", "K♣", "Q♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(2);
			expect(result.name).toBe("Two Pair");
			expect(result.value).toBe(1413); // Ace high pair with King high pair
		});
	});

	describe("One Pair", () => {
		it("should detect one pair", () => {
			const cards: Card[] = ["A♠", "A♥", "K♦", "Q♣", "J♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(1);
			expect(result.name).toBe("One Pair");
			expect(result.value).toBe(14); // Ace high pair
		});
	});

	describe("High Card", () => {
		it("should detect high card", () => {
			const cards: Card[] = ["A♠", "K♥", "Q♦", "J♣", "9♠"];
			const result = evaluateHand(cards);
			expect(result.rank).toBe(0);
			expect(result.name).toBe("High Card");
			expect(result.value).toBe(14); // Ace high
		});
	});

	describe("Error Cases", () => {
		it("should throw error for less than 5 cards", () => {
			const cards: Card[] = ["A♠", "K♥", "Q♦", "J♣"];
			expect(() => evaluateHand(cards)).toThrow("Need at least 5 cards to evaluate a hand");
		});
	});
});
