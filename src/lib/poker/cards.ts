export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type Card = `${Rank}${Suit}`;

export type HandRank = {
	rank: number; // Higher number means better hand
	value: number; // For comparing hands of the same rank
	name: string;
};

// Convert card string to rank value (2-14, where 14 is Ace)
export function getRankValue(card: Card): number {
	const rank = card.slice(0, -1);
	switch (rank) {
		case "A":
			return 14;
		case "K":
			return 13;
		case "Q":
			return 12;
		case "J":
			return 11;
		default:
			return parseInt(rank);
	}
}

// Get suit from card string
export function getSuit(card: Card): Suit {
	return card.slice(-1) as Suit;
}

// Sort cards by rank (highest to lowest)
export function sortCards(cards: Card[]): Card[] {
	return [...cards].sort((a, b) => getRankValue(b) - getRankValue(a));
}

// Check for straight
export function isStraight(cards: Card[]): boolean {
	const sortedValues = [...new Set(cards.map(getRankValue))].sort((a, b) => b - a);

	// Check for Ace-low straight (A-2-3-4-5)
	if (sortedValues.includes(14)) {
		const lowStraight = [2, 3, 4, 5].every((val) => sortedValues.includes(val));
		if (lowStraight) return true;
	}

	// Check for regular straights
	for (let i = 0; i <= sortedValues.length - 5; i++) {
		const diff = sortedValues[i]! - sortedValues[i + 4]!;
		if (diff === 4) {
			return true;
		}
	}
	return false;
}

// Check for flush
export function isFlush(cards: Card[]): boolean {
	const suits = cards.map(getSuit);
	return suits.some((suit) => suits.filter((s) => s === suit).length >= 5);
}

// Get hand rank and value
export function evaluateHand(cards: Card[]): HandRank {
	if (cards.length < 5) {
		throw new Error("Need at least 5 cards to evaluate a hand");
	}

	const sortedCards = sortCards(cards);
	const values = sortedCards.map(getRankValue);
	const suits = sortedCards.map(getSuit);

	// Count occurrences of each rank
	const rankCounts = new Map<number, number>();
	values.forEach((value) => {
		rankCounts.set(value, (rankCounts.get(value) ?? 0) + 1);
	});

	// Check for straight flush
	if (isStraight(cards) && isFlush(cards)) {
		return {
			rank: 8,
			value: Math.max(...values),
			name: "Straight Flush",
		};
	}

	// Check for four of a kind
	for (const [value, count] of rankCounts) {
		if (count === 4) {
			return {
				rank: 7,
				value: value,
				name: "Four of a Kind",
			};
		}
	}

	// Check for full house
	let hasThree = false;
	let hasPair = false;
	let threeValue = 0;
	let pairValue = 0;
	for (const [value, count] of rankCounts) {
		if (count === 3) {
			hasThree = true;
			threeValue = value;
		} else if (count >= 2) {
			hasPair = true;
			pairValue = Math.max(pairValue, value);
		}
	}
	if (hasThree && hasPair) {
		return {
			rank: 6,
			value: threeValue * 100 + pairValue,
			name: "Full House",
		};
	}

	// Check for flush
	if (isFlush(cards)) {
		const flushCards = sortedCards.filter((card) => getSuit(card) === suits[0]);
		if (flushCards.length > 0) {
			return {
				rank: 5,
				value: getRankValue(flushCards[0]!),
				name: "Flush",
			};
		}
	}

	// Check for straight
	if (isStraight(cards)) {
		// For Ace-low straight, use 5 as the value
		if (values.includes(14) && [2, 3, 4, 5].every((val) => values.includes(val))) {
			return {
				rank: 4,
				value: 5,
				name: "Straight",
			};
		}
		return {
			rank: 4,
			value: Math.max(...values),
			name: "Straight",
		};
	}

	// Check for three of a kind
	if (hasThree) {
		return {
			rank: 3,
			value: threeValue,
			name: "Three of a Kind",
		};
	}

	// Check for two pair
	const pairs = Array.from(rankCounts.entries())
		.filter(([_, count]) => count >= 2)
		.map(([value]) => value)
		.sort((a, b) => b - a);
	if (pairs.length >= 2) {
		return {
			rank: 2,
			value: (pairs[0] ?? 0) * 100 + (pairs[1] ?? 0),
			name: "Two Pair",
		};
	}

	// Check for one pair
	if (pairs.length === 1) {
		return {
			rank: 1,
			value: pairs[0] ?? 0,
			name: "One Pair",
		};
	}

	// High card
	return {
		rank: 0,
		value: values[0] ?? 0,
		name: "High Card",
	};
}

// Compare two hands and return 1 if hand1 wins, -1 if hand2 wins, 0 if tie
export function compareHands(hand1: Card[], hand2: Card[]): number {
	const evaluation1 = evaluateHand(hand1);
	const evaluation2 = evaluateHand(hand2);

	if (evaluation1.rank !== evaluation2.rank) {
		return evaluation1.rank - evaluation2.rank;
	}

	return evaluation1.value - evaluation2.value;
}
