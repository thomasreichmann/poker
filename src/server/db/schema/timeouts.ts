import { relations } from "drizzle-orm";
import { pgTable, serial, timestamp, uuid } from "drizzle-orm/pg-core";
import { games } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";

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
