export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  chips: number;
  position: number;
  cards: PlayingCard[];
  currentBet: number;
  totalBet: number;
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  action?: "fold" | "call" | "raise" | "check" | "bet";
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export type GamePhase =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "waiting";

export interface GameState {
  phase: GamePhase;
  pot: number;
  currentBet: number;
  activePlayerIndex: number;
  communityCards: PlayingCard[];
  players: Player[];
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  testingMode: boolean;
}
