import type { Action } from "@/db/schema/actions";
import type { Card } from "@/db/schema/cards";
import type { Game } from "@/db/schema/games";
import type { Player } from "@/db/schema/players";
import type { GameEvent } from "@/lib/realtime/publisher";
import type { CachedGameData } from "../../_hooks/realtime/applyBroadcastToCache";
import type { BroadcastPayload } from "../types";

const now = Date.now();
const gameId = "mock-game-table";

const baseGame: Game = {
  id: gameId,
  handId: 101,
  status: "active",
  currentRound: "flop",
  currentHighestBet: 80,
  currentPlayerTurn: "player-2",
  lastAggressorId: "player-1",
  pot: 260,
  bigBlind: 40,
  smallBlind: 20,
  turnMs: 30_000,
  updatedAt: new Date(now - 5_000),
  lastAction: "raise",
  lastBetAmount: 80,
  turnTimeoutAt: new Date(now + 20_000),
};

const players: Player[] = [
  {
    id: "player-1",
    userId: "mock-user",
    gameId,
    seat: 0,
    stack: 1280,
    currentBet: 80,
    hasFolded: false,
    isConnected: true,
    lastSeen: new Date(now - 1_000),
    isButton: true,
    hasWon: false,
    showCards: false,
    displayName: "Você",
    leaveAfterHand: false,
    handRank: null,
    handValue: null,
    handName: null,
  },
  {
    id: "player-2",
    userId: "villain-1",
    gameId,
    seat: 1,
    stack: 880,
    currentBet: 80,
    hasFolded: false,
    isConnected: true,
    lastSeen: new Date(now - 800),
    isButton: false,
    hasWon: false,
    showCards: false,
    displayName: "Ana",
    leaveAfterHand: false,
    handRank: null,
    handValue: null,
    handName: null,
  },
  {
    id: "player-3",
    userId: "villain-2",
    gameId,
    seat: 2,
    stack: 720,
    currentBet: 40,
    hasFolded: false,
    isConnected: true,
    lastSeen: new Date(now - 650),
    isButton: false,
    hasWon: false,
    showCards: false,
    displayName: "Carlos",
    leaveAfterHand: false,
    handRank: null,
    handValue: null,
    handName: null,
  },
  {
    id: "player-4",
    userId: "villain-3",
    gameId,
    seat: 3,
    stack: 640,
    currentBet: 40,
    hasFolded: false,
    isConnected: true,
    lastSeen: new Date(now - 600),
    isButton: false,
    hasWon: false,
    showCards: false,
    displayName: "Marina",
    leaveAfterHand: false,
    handRank: null,
    handValue: null,
    handName: null,
  },
];

const cards: Card[] = [
  {
    id: 1,
    handId: baseGame.handId,
    gameId,
    playerId: null,
    revealAtShowdown: false,
    rank: "A",
    suit: "spades",
  },
  {
    id: 2,
    handId: baseGame.handId,
    gameId,
    playerId: null,
    revealAtShowdown: false,
    rank: "Q",
    suit: "spades",
  },
  {
    id: 3,
    handId: baseGame.handId,
    gameId,
    playerId: null,
    revealAtShowdown: false,
    rank: "Q",
    suit: "clubs",
  },
  {
    id: 4,
    handId: baseGame.handId,
    gameId,
    playerId: null,
    revealAtShowdown: false,
    rank: "9",
    suit: "hearts",
  },
  {
    id: 11,
    handId: baseGame.handId,
    gameId,
    playerId: "player-1",
    revealAtShowdown: true,
    rank: "K",
    suit: "clubs",
  },
  {
    id: 12,
    handId: baseGame.handId,
    gameId,
    playerId: "player-1",
    revealAtShowdown: true,
    rank: "K",
    suit: "diamonds",
  },
];

const actions: Action[] = [
  {
    id: 1,
    gameId,
    playerId: "player-1",
    handId: baseGame.handId,
    actionType: "raise",
    amount: 80,
    actorSource: "human",
    botStrategy: null,
    createdAt: new Date(now - 6_000),
  },
  {
    id: 2,
    gameId,
    playerId: "player-2",
    handId: baseGame.handId,
    actionType: "call",
    amount: 40,
    actorSource: "human",
    botStrategy: null,
    createdAt: new Date(now - 5_500),
  },
  {
    id: 3,
    gameId,
    playerId: "player-3",
    handId: baseGame.handId,
    actionType: "call",
    amount: 80,
    actorSource: "human",
    botStrategy: null,
    createdAt: new Date(now - 5_000),
  },
];

export const mockGameSnapshot: CachedGameData = {
  game: baseGame,
  players,
  cards,
  actions,
};

export type MockScriptEvent =
  | {
      delayMs: number;
      kind: "broadcast";
      payload: BroadcastPayload;
    }
  | {
      delayMs: number;
      kind: "custom";
      event: GameEvent;
    };

export const mockBroadcastScript: MockScriptEvent[] = [
  {
    delayMs: 800,
    kind: "broadcast",
    payload: {
      table: "poker_games",
      event: "UPDATE",
      newRow: {
        id: baseGame.id,
        current_round: "turn",
        turn_timeout_at: new Date(now + 25_000).toISOString(),
        updated_at: new Date(now + 800).toISOString(),
      },
      oldRow: {
        id: baseGame.id,
      },
    },
  },
  {
    delayMs: 1_600,
    kind: "broadcast",
    payload: {
      table: "poker_players",
      event: "UPDATE",
      newRow: {
        id: "player-2",
        game_id: baseGame.id,
        current_bet: 120,
        stack: 760,
        last_seen: new Date(now + 1_600).toISOString(),
      },
      oldRow: {
        id: "player-2",
      },
    },
  },
  {
    delayMs: 2_400,
    kind: "broadcast",
    payload: {
      table: "poker_cards",
      event: "INSERT",
      newRow: {
        id: 50,
        hand_id: baseGame.handId,
        game_id: baseGame.id,
        player_id: null,
        reveal_at_showdown: false,
        rank: "2",
        suit: "clubs",
      },
      oldRow: {},
    },
  },
  {
    delayMs: 3_200,
    kind: "custom",
    event: {
      type: "state-updated",
      gameId: baseGame.id,
      lastActionId: 4,
      updatedAt: new Date(now + 3_200).toISOString(),
      payload: { source: "mock-script" },
    },
  },
];
