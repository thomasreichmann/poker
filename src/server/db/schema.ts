import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgEnum,
	pgSchema,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

const authSchema = pgSchema("auth");

export const gameStatusEnum = pgEnum("game_status", ["waiting", "active", "completed"]);
export const roundTypeEnum = pgEnum("round_type", [
	"pre-flop",
	"flop",
	"turn",
	"river",
	"showdown",
]);
export const actionTypeEnum = pgEnum("action_type", [
	"bet",
	"check",
	"call",
	"raise",
	"fold",
	"timeout",
]);
export const ActionsEnum = z.enum(actionTypeEnum.enumValues);

const users = authSchema.table("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: text("email").notNull().unique(),
});

export const games = pgTable("poker_games", {
	id: uuid("id").defaultRandom().primaryKey(),
	status: gameStatusEnum("status").notNull(),
	currentRound: roundTypeEnum("current_round").default("pre-flop"),
	currentHighestBet: integer("current_highest_bet").default(0).notNull(),
	currentPlayerTurn: uuid("current_player_turn"),
	pot: integer("pot").default(0).notNull(),
	communityCards: text("community_cards").array().default([]),
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
}));

export const players = pgTable("poker_players", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
	seat: integer("seat").notNull(),
	stack: integer("stack").default(1000),
	holeCards: text("hole_cards").array().default([]),
	currentBet: integer("current_bet"),
	hasFolded: boolean("has_folded").default(false),
	isConnected: boolean("is_connected").default(true),
	lastSeen: timestamp("last_seen").defaultNow(),
});

export type Player = typeof players.$inferSelect;

export const playersRelations = relations(players, ({ one, many }) => ({
	game: one(games, {
		fields: [players.gameId],
		references: [games.id],
	}),
	actions: many(actions),
	timeoutsReceived: many(timeouts, { relationName: "playerTimeouts" }),
	timeoutsReported: many(timeouts, { relationName: "reportedTimeouts" }),
}));

export const actions = pgTable("poker_actions", {
	id: serial("id").primaryKey(),
	gameId: uuid("game_id")
		.references(() => games.id)
		.notNull(),
	playerId: uuid("player_id")
		.references(() => players.id)
		.notNull(),
	actionType: actionTypeEnum("action_type").notNull(),
	amount: integer("amount").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Action = typeof actions.$inferSelect;

export const actionsRelations = relations(actions, ({ one }) => ({
	game: one(games, {
		fields: [actions.gameId],
		references: [games.id],
	}),
	player: one(players, {
		fields: [actions.playerId],
		references: [players.id],
	}),
}));

export const timeouts = pgTable("poker_timeouts", {
	id: serial("id").primaryKey(),
	gameId: uuid("game_id").references(() => games.id),
	playerId: uuid("player_id").references(() => players.id),
	reportedBy: uuid("reported_by").references(() => players.id),
	timeoutAt: timestamp("timeout_at").defaultNow().notNull(),
});

export const timeoutsRelations = relations(timeouts, ({ one }) => ({
	game: one(games, {
		fields: [timeouts.gameId],
		references: [games.id],
	}),
	player: one(players, {
		fields: [timeouts.playerId],
		references: [players.id],
		relationName: "playerTimeouts",
	}),
	reporter: one(players, {
		fields: [timeouts.reportedBy],
		references: [players.id],
		relationName: "reportedTimeouts",
	}),
}));
