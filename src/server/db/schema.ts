import { relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	doublePrecision,
	foreignKey,
	integer,
	pgEnum,
	pgSchema,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const actions = pgEnum("actions", ["fold", "call", "bet", "check"]);
export const ActionsEnum = z.enum(actions.enumValues);

const authSchema = pgSchema("auth");

export const users = authSchema.table("users", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull(),
});

export const publicTables = pgTable("public_tables", {
	id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	seatCount: smallint("seat_count").default(9).notNull(),
	pot: doublePrecision("pot").default(0).notNull(),
	currentTurn: smallint("current_turn").default(0).notNull(),
	button: smallint("button").default(0).notNull(),
	actions: actions().array().notNull(),
	bets: doublePrecision("bets").array().notNull(),
	stacks: doublePrecision("stacks").array().notNull(),
	communityCards: text("community_cards").array().notNull(),
	smallBlind: doublePrecision("small_blind").default(0).notNull(),
	bigBlind: doublePrecision("big_blind").default(0).notNull(),
});

export type SelectPublicTable = typeof publicTables.$inferSelect;

export const publicTableRelations = relations(publicTables, ({ many }) => ({
	privatePlayerState: many(privatePlayerState),
}));

export const privateTableState = pgTable(
	"private_table_state",
	{
		id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		remainingDeck: integer("remaining_deck").array().notNull(),
	},
	(table) => {
		return [
			foreignKey({
				columns: [table.id],
				foreignColumns: [publicTables.id],
			}).onDelete("cascade"),
		];
	},
);

export type SelectPrivateTableState = typeof privateTableState.$inferSelect;

export const privatePlayerState = pgTable(
	"private_player_state",
	{
		id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
		userId: uuid("user_id").notNull(),
		tableId: bigint("table_id", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		hand: integer("hand").array(),
		position: smallint("position").notNull(),
		folded: boolean("folded").default(false),
	},
	(table) => {
		return [
			uniqueIndex("user_table_state").using(
				"btree",
				table.userId.asc().nullsLast(),
				table.tableId.asc().nullsLast(),
			),
			uniqueIndex("table_position").using(
				"btree",
				table.tableId.asc().nullsLast(),
				table.position.asc().nullsLast(),
			),
			foreignKey({
				columns: [table.tableId],
				foreignColumns: [publicTables.id],
			}).onDelete("cascade"),
			foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
			}).onDelete("restrict"),
		];
	},
);

export type SelectPrivatePlayerState = typeof privatePlayerState.$inferSelect;
export type SelectPrivatePlayerStateWithTable = typeof privatePlayerState.$inferSelect & {
	publicTable: typeof publicTables.$inferSelect;
};

export const privatePlayerStateRelations = relations(privatePlayerState, ({ one }) => ({
	user: one(users, {
		fields: [privatePlayerState.userId],
		references: [users.id],
	}),
	publicTable: one(publicTables, {
		fields: [privatePlayerState.tableId],
		references: [publicTables.id],
	}),
}));
