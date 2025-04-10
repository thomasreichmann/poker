import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, serial, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { games } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";

export const ActionType = pgEnum("action_type", [
	"bet",
	"check",
	"call",
	"raise",
	"fold",
	"timeout",
]);
export const ActionTypeSchema = z.enum(ActionType.enumValues);

export const actions = pgTable("poker_actions", {
	id: serial("id").primaryKey(),
	gameId: uuid("game_id")
		.references(() => games.id)
		.notNull(),
	playerId: uuid("player_id")
		.references(() => players.id)
		.notNull(),
	actionType: ActionType("action_type").notNull(),
	amount: integer("amount"),
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
