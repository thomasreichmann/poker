import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  pgView,
  serial,
  uuid,
} from "drizzle-orm/pg-core";
import { games } from "./games";
import { players } from "./players";

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

export const cards = pgTable("poker_cards", {
  id: serial("id").primaryKey(),
  handId: integer("hand_id").default(0).notNull(),
  gameId: uuid("game_id").references(() => games.id),
  playerId: uuid("player_id").references(() => players.id),
  revealAtShowdown: boolean("reveal_at_showdown").default(false),
  rank: Rank("rank").notNull(),
  suit: Suit("suit").notNull(),
}).enableRLS();

export const cardsView = pgView("cards").as((qb) => qb.select().from(cards));

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
