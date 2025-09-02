import { Rank, Suit, type Card } from "@/db/schema/cards";

export type HandRank = {
  rank: number;
  value: number;
  name: string;
};

// Convert card string to rank value (2-14, where 14 is Ace)
export function getRankValue(card: Card): number {
  const rank = card.rank;
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
export function getSuit(card: Card) {
  return card.suit;
}

// Sort cards by rank (highest to lowest)
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getRankValue(b) - getRankValue(a));
}

// Check for straight
export function isStraight(cards: Card[]): boolean {
  const sortedValues = [...new Set(cards.map(getRankValue))].sort(
    (a, b) => b - a
  );

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

// Check for straight flush - 5 consecutive cards all of the same suit
export function isStraightFlush(cards: Card[]): boolean {
  const suits = Suit.enumValues;

  for (const suit of suits) {
    const suitCards = cards.filter((card) => getSuit(card) === suit);
    if (suitCards.length >= 5) {
      // Check if this suit has a straight
      const sortedValues = [...new Set(suitCards.map(getRankValue))].sort(
        (a, b) => b - a
      );

      // Check for Ace-low straight (A-2-3-4-5)
      if (sortedValues.includes(14)) {
        const lowStraight = [2, 3, 4, 5].every((val) =>
          sortedValues.includes(val)
        );
        if (lowStraight) return true;
      }

      // Check for regular straights
      for (let i = 0; i <= sortedValues.length - 5; i++) {
        const diff = sortedValues[i]! - sortedValues[i + 4]!;
        if (diff === 4) {
          return true;
        }
      }
    }
  }
  return false;
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
  if (isStraightFlush(cards)) {
    // For Ace-low straight flush, use 5 as the value
    if (
      values.includes(14) &&
      [2, 3, 4, 5].every((val) => values.includes(val))
    ) {
      return {
        rank: 8,
        value: 5,
        name: "Straight Flush",
      };
    }
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

  // Check for flush: pick the actual suit with >=5 cards
  if (isFlush(cards)) {
    const suitToCount = new Map<Suit["enumValues"][number], number>();
    for (const s of suits) {
      suitToCount.set(s, (suitToCount.get(s) ?? 0) + 1);
    }
    let flushSuit: typeof suits[number] | null = null;
    for (const s of Suit.enumValues) {
      const count = cards.filter((c) => getSuit(c) === s).length;
      if (count >= 5) {
        flushSuit = s;
        break;
      }
    }
    if (flushSuit) {
      const flushCards = sortedCards.filter((card) => getSuit(card) === flushSuit);
      if (flushCards.length > 0) {
        return {
          rank: 5,
          value: getRankValue(flushCards[0]!),
          name: "Flush",
        };
      }
    }
  }

  // Check for straight
  if (isStraight(cards)) {
    // For Ace-low straight, use 5 as the value
    if (
      values.includes(14) &&
      [2, 3, 4, 5].every((val) => values.includes(val))
    ) {
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
    .filter(([, count]) => count >= 2)
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

export type CardBase = Omit<
  Card,
  "id" | "gameId" | "playerId" | "handId" | "revealAtShowdown"
>;

// Generate a full deck of cards
export function generateDeck(): CardBase[] {
  const ranks = Rank.enumValues;
  const suits = Suit.enumValues;
  const deck: CardBase[] = [];

  for (const rank of ranks) {
    for (const suit of suits) {
      deck.push({
        rank,
        suit,
      });
    }
  }

  return deck;
}

// Get available cards by removing already dealt cards
export function getAvailableCards(
  deck: CardBase[],
  dealtCards: CardBase[]
): CardBase[] {
  return deck.filter((card) => {
    return !dealtCards.some(
      (dealtCard) =>
        dealtCard.rank === card.rank && dealtCard.suit === card.suit
    );
  });
}

// Get random cards from available cards
export function getRandomCards(
  availableCards: CardBase[],
  count: number
): CardBase[] {
  const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
