import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { actions } from "./actions";
import { type Card, cards } from "./cards";
import { games } from "./games";
import { timeouts } from "./timeouts";
import { users } from "./users";

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
  hasWon: boolean("has_won").default(false),
  showCards: boolean("show_cards").default(false),
  displayName: text("display_name"),
  // Mark player to leave the table after the current hand finishes
  leaveAfterHand: boolean("leave_after_hand").default(false),
  handRank: integer("hand_rank"),
  handValue: integer("hand_value"),
  handName: text("hand_name"),
}).enableRLS();

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

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
