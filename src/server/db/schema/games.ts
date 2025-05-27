import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { actions } from "./actions";
import { type Card, cards } from "./cards";
import { players } from "./players";
import { timeouts } from "./timeouts";

export const roundTypeEnum = pgEnum("round_type", [
	"pre-flop",
	"flop",
	"turn",
	"river",
	"showdown",
]);

export const gameStatusEnum = pgEnum("game_status", ["waiting", "active", "completed"]);

export const games = pgTable("poker_games", {
	id: uuid("id").defaultRandom().primaryKey(),
	status: gameStatusEnum("status").default("waiting"),
	currentRound: roundTypeEnum("current_round").default("pre-flop"),
	currentHighestBet: integer("current_highest_bet").default(0).notNull(),
	currentPlayerTurn: uuid("current_player_turn"),
	pot: integer("pot").default(0).notNull(),
	bigBlind: integer("big_blind").default(20).notNull(),
	smallBlind: integer("small_blind").default(10).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Game = typeof games.$inferSelect;

export const gamesRelations = relations(games, ({ many, one }) => ({
	players: many(players),
	currentPlayer: one(players, {
		fields: [games.currentPlayerTurn],
		references: [players.id],
	}),
	actions: many(actions),
	timeouts: many(timeouts),
	cards: many(cards),
}));

export type GameWithCards = Game & { cards?: Card[] };
