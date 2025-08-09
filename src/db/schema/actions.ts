import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { ActionType } from "./actionTypes";
import { games } from "./games";
import { players } from "./players";

export const ActionTypeSchema = z.enum(ActionType.enumValues);

export const actions = pgTable("poker_actions", {
  id: serial("id").primaryKey(),
  gameId: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  playerId: uuid("player_id")
    .references(() => players.id, { onDelete: "set null" })
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
