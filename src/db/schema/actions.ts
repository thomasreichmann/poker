import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { PgEnumAction, PgEnumActorSource } from "./actionTypes";
import { games } from "./games";
import { players } from "./players";

export const ActionTypeSchema = z.enum(PgEnumAction.enumValues);

export const actions = pgTable("poker_actions", {
  id: serial("id").primaryKey(),
  gameId: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  playerId: uuid("player_id").references(() => players.id, {
    onDelete: "set null",
  }),
  // New: store the hand identifier at the time of the action for export convenience
  handId: integer("hand_id").default(0).notNull(),
  actionType: PgEnumAction("action_type").notNull(),
  amount: integer("amount"),
  // New: source and optional strategy annotation
  actorSource: PgEnumActorSource("actor_source").default("human").notNull(),
  botStrategy: text("bot_strategy"),
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
