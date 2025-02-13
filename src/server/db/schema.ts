import { relations } from "drizzle-orm";
import {
	bigint,
	doublePrecision,
	foreignKey,
	integer,
	pgSchema,
	pgTable,
	smallint,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");

const users = authSchema.table("users", {
	id: uuid("id").primaryKey(),
});

export const publicTables = pgTable("public_tables", {
	id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	pot: doublePrecision("pot").default(0),
	currentTurn: smallint("current_turn").default(0),
	button: smallint("button").default(0),
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
	publicTable: one(publicTables, {
		fields: [privatePlayerState.tableId],
		references: [publicTables.id],
	}),
}));
