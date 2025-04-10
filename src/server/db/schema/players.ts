import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actions } from "~/server/db/schema/actions";
import { cards } from "~/server/db/schema/cards";
import { games } from "~/server/db/schema/games";
import { timeouts } from "~/server/db/schema/timeouts";
import { users } from "~/server/db/schema/users";

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
	cards: many(cards),
}));
