import { relations } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { PgEnumAction } from "./actionTypes";
import { actions } from "./actions";
import { type Card, cards } from "./cards";
import { type Player, players } from "./players";
import { timeouts } from "./timeouts";

export const roundTypeEnum = pgEnum("round_type", [
  "pre-flop",
  "flop",
  "turn",
  "river",
  "showdown",
]);

export const gameStatusEnum = pgEnum("game_status", [
  "waiting",
  "active",
  "completed",
]);

export const games = pgTable("poker_games", {
  id: uuid("id").defaultRandom().primaryKey(),
  handId: integer("hand_id").default(0).notNull(),
  status: gameStatusEnum("status").default("waiting"),
  currentRound: roundTypeEnum("current_round").default("pre-flop"),
  currentHighestBet: integer("current_highest_bet").default(0).notNull(),
  currentPlayerTurn: uuid("current_player_turn"),
  lastAggressorId: uuid("last_aggressor_id"),
  pot: integer("pot").default(0).notNull(),
  bigBlind: integer("big_blind").default(20).notNull(),
  smallBlind: integer("small_blind").default(10).notNull(),
  // Maximum time per turn in milliseconds (client/server timers)
  turnMs: integer("turn_ms").default(30000).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastAction: PgEnumAction("last_action").default("check"),
  lastBetAmount: integer("last_bet_amount").default(0),
  // New: simulator configuration stored per table (dev/staging only consumers)
  simulatorConfig: jsonb("simulator_config"),
});

export type Game = typeof games.$inferSelect;

export const gamesRelations = relations(games, ({ many, one }) => ({
  players: many(players),
  currentPlayer: one(players, {
    fields: [games.currentPlayerTurn],
    references: [players.id],
  }),
  lastAggressor: one(players, {
    fields: [games.lastAggressorId],
    references: [players.id],
  }),
  actions: many(actions),
  timeouts: many(timeouts),
  cards: many(cards),
}));

export type GameWithCards = Game & { cards?: Card[] };
export type GameWithPlayers = Game & { players?: Player[] };
