import { relations } from "drizzle-orm";
import { pgEnum, pgTable, serial, uuid } from "drizzle-orm/pg-core";
import { games } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";

export const Rank = pgEnum("rank", [
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
	"A",
]);

export const Suit = pgEnum("suit", ["hearts", "diamonds", "clubs", "spades"]);

export const cards = pgTable("cards", {
	id: serial("id").primaryKey(),
	gameId: uuid("game_id").references(() => games.id),
	playerId: uuid("player_id").references(() => players.id),
	rank: Rank("rank").notNull(),
	suit: Suit("suit").notNull(),
});

export type Card = typeof cards.$inferSelect;

export const cardsRelations = relations(cards, ({ one }) => ({
	game: one(games, {
		fields: [cards.gameId],
		references: [games.id],
	}),
	player: one(players, {
		fields: [cards.playerId],
		references: [players.id],
	}),
}));
