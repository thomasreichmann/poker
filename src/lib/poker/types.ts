// Pure TypeScript types for the poker game engine
// These types are decoupled from database schema and external dependencies

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
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type ActionType = "bet" | "check" | "call" | "raise" | "fold";
export type GameStatus = "waiting" | "active" | "completed";
export type RoundType = "pre-flop" | "flop" | "turn" | "river" | "showdown";

export interface HandEvaluation {
  rank: number;
  value: number;
  name: string;
}

export interface GameAction {
  playerId: string;
  action: ActionType;
  amount?: number;
}

export interface Player {
  id: string;
  seat: number;
  stack: number;
  currentBet: number;
  hasFolded: boolean;
  isButton: boolean;
  hasWon: boolean;
  showCards: boolean;
  handRank?: number;
  handValue?: number;
  handName?: string;
  holeCards: Card[];
}

export interface GameState {
  id: string;
  status: GameStatus;
  currentRound: RoundType;
  currentHighestBet: number;
  currentPlayerTurn?: string;
  lastAggressorId?: string;
  pot: number;
  bigBlind: number;
  smallBlind: number;
  lastAction?: ActionType;
  lastBetAmount: number;
  players: Player[];
  communityCards: Card[];
  deck: Card[];
  handId: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  newGameState: GameState;
  nextAction?: "advance_round" | "next_player" | "end_game" | "showdown";
}

export interface WinnerResult {
  winners: Player[];
  evaluations: Array<{
    player: Player;
    evaluation: HandEvaluation;
  }>;
}

export interface GameTransition {
  fromState: GameState;
  action: GameAction;
  toState: GameState;
  isValid: boolean;
  error?: string;
}
