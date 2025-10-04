import { type Action } from "@/db/schema/actions";
import { type Card } from "@/db/schema/cards";
import { type Game } from "@/db/schema/games";
import { type Player } from "@/db/schema/players";

export type GameSnapshot = {
  game: Game;
  players: Player[];
  cards: Card[];
  actions: Action[];
};

export type GameViewModel = {
  yourDbPlayer: Player | null;
  isYourTurn: boolean;
  playersBySeat: Player[];
  playersByView: Player[];
  activePlayerIndex: number;
  activePlayerIndexByView: number;
  phaseLabel: string;
  callAmount: number;
  minRaiseTotal: number;
  maxRaiseTotal: number;
  canCheck: boolean;
  canCall: boolean;
  connectedCount: number;
  playerIdToCards: Map<string, { suit: string; rank: string; id: string }[]>;
  communityCards: { suit: string; rank: string; id: string }[];
};
