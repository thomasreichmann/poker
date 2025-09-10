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

  // Count occurrences of each rank
  const rankCounts = new Map<number, number>();
  values.forEach((value) => {
    rankCounts.set(value, (rankCounts.get(value) ?? 0) + 1);
  });

  // Helper: pack a vector of tie-break values into a single comparable number.
  // Use base-100 to avoid collisions (card ranks are <= 14).
  const pack = (nums: number[]) => nums.reduce((acc, v) => acc * 100 + v, 0);

  // Helper: get distinct rank values sorted high to low
  const distinctValuesDesc = [...new Set(values)].sort((a, b) => b - a);

  // Helper: determine highest straight high-card value in a list of cards
  const straightHigh = (vals: number[]): number | null => {
    const uniq = [...new Set(vals)].sort((a, b) => b - a);
    // Wheel straight (A-2-3-4-5)
    if (uniq.includes(14) && [5, 4, 3, 2].every((v) => uniq.includes(v))) {
      return 5;
    }
    for (let i = 0; i <= uniq.length - 5; i++) {
      const start = uniq[i]!;
      let ok = true;
      for (let d = 1; d < 5; d++) {
        if (!uniq.includes(start - d)) {
          ok = false;
          break;
        }
      }
      if (ok) return start;
    }
    return null;
  };

  // Check for straight flush
  if (isStraightFlush(cards)) {
    // Identify suit having the straight flush and compute its high card
    for (const suit of Suit.enumValues) {
      const suitCards = cards.filter((c) => getSuit(c) === suit);
      if (suitCards.length >= 5) {
        const high = straightHigh(suitCards.map(getRankValue));
        if (high) {
          return { rank: 8, value: high, name: "Straight Flush" };
        }
        // Handle wheel straight flush (A-2-3-4-5)
        const vals = suitCards.map(getRankValue);
        if (vals.includes(14) && [2, 3, 4, 5].every((v) => vals.includes(v))) {
          return { rank: 8, value: 5, name: "Straight Flush" };
        }
      }
    }
  }

  // Check for four of a kind
  {
    const quads = [...rankCounts.entries()]
      .filter(([, c]) => c === 4)
      .map(([v]) => v)
      .sort((a, b) => b - a);
    if (quads.length > 0) {
      const quad = quads[0]!;
      const kicker = distinctValuesDesc.find((v) => v !== quad) ?? 0;
      return { rank: 7, value: pack([quad, kicker]), name: "Four of a Kind" };
    }
  }

  // Check for full house (prefer highest triple, then highest remaining pair or second triple)
  {
    const triples = [...rankCounts.entries()]
      .filter(([, c]) => c >= 3)
      .map(([v]) => v)
      .sort((a, b) => b - a);
    if (triples.length > 0) {
      const primaryTriple = triples[0]!;
      // Build pair candidates from remaining ranks (including other triples counted as pair)
      const pairCandidates = [...rankCounts.entries()]
        .filter(([v, c]) => v !== primaryTriple && c >= 2)
        .map(([v]) => v)
        .sort((a, b) => b - a);
      if (pairCandidates.length > 0) {
        const pair = pairCandidates[0]!;
        return {
          rank: 6,
          value: pack([primaryTriple, pair]),
          name: "Full House",
        };
      }
      // Special case: two triples -> use second triple as pair
      if (triples.length >= 2) {
        const pairFromTriple = triples[1]!;
        return {
          rank: 6,
          value: pack([primaryTriple, pairFromTriple]),
          name: "Full House",
        };
      }
    }
  }

  // Check for flush: pick suit and encode top 5 flush kickers
  if (isFlush(cards)) {
    for (const s of Suit.enumValues) {
      const flushCards = sortedCards.filter((card) => getSuit(card) === s);
      if (flushCards.length >= 5) {
        const top5 = flushCards.slice(0, 5).map(getRankValue);
        return { rank: 5, value: pack(top5), name: "Flush" };
      }
    }
  }

  // Check for straight
  {
    const high = straightHigh(values);
    if (high) {
      return { rank: 4, value: high, name: "Straight" };
    }
  }

  // Check for three of a kind (top triple, then two highest kickers)
  {
    const triples = [...rankCounts.entries()]
      .filter(([, c]) => c === 3)
      .map(([v]) => v)
      .sort((a, b) => b - a);
    if (triples.length > 0) {
      const t = triples[0]!;
      const kickers = distinctValuesDesc.filter((v) => v !== t).slice(0, 2);
      return { rank: 3, value: pack([t, ...kickers]), name: "Three of a Kind" };
    }
  }

  // Check for two pair (two highest pairs + highest kicker)
  const pairs = Array.from(rankCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([value]) => value)
    .sort((a, b) => b - a);
  if (pairs.length >= 2) {
    const [p1, p2] = [pairs[0]!, pairs[1]!];
    const kicker = distinctValuesDesc.find((v) => v !== p1 && v !== p2) ?? 0;
    return { rank: 2, value: pack([p1, p2, kicker]), name: "Two Pair" };
  }

  // Check for one pair (highest pair + 3 kickers)
  if (pairs.length === 1) {
    const pair = pairs[0]!;
    const kickers = distinctValuesDesc.filter((v) => v !== pair).slice(0, 3);
    return { rank: 1, value: pack([pair, ...kickers]), name: "One Pair" };
  }

  // High card (top 5)
  return {
    rank: 0,
    value: pack(distinctValuesDesc.slice(0, 5)),
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
