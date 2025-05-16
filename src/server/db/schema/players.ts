import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { actions } from "~/server/db/schema/actions";
import { type Card, cards } from "~/server/db/schema/cards";
import { games } from "~/server/db/schema/games";
import { timeouts } from "~/server/db/schema/timeouts";
import { users } from "~/server/db/schema/users";

export const players = pgTable("poker_players", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	gameId: uuid("game_id")
		.references(() => games.id, { onDelete: "cascade" })
		.notNull(),
	seat: integer("seat").notNull(),
	stack: integer("stack").notNull().default(1000),
	currentBet: integer("current_bet"),
	hasFolded: boolean("has_folded").default(false),
	isConnected: boolean("is_connected").default(true),
	lastSeen: timestamp("last_seen").defaultNow(),
	isButton: boolean("is_button").default(false),
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

export type PlayerWithCards = Player & { cards?: Card[] };
