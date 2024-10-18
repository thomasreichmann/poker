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

export const privateTableState = pgTable(
	"private_table_state",
	{
		id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		remainingDeck: integer("remaining_deck").array().notNull(),
	},
	(table) => {
		return {
			privateTableStateIdFkey: foreignKey({
				columns: [table.id],
				foreignColumns: [publicTables.id],
			}).onDelete("cascade"),
		};
	},
);

export const privatePlayerState = pgTable(
	"private_player_state",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
		userId: uuid("user_id").notNull(),
		tableId: bigint("table_id", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		hand: integer("hand").array(),
	},
	(table) => {
		return {
			userTableState: uniqueIndex("user_table_state").using(
				"btree",
				table.userId.asc().nullsLast(),
				table.tableId.asc().nullsLast(),
			),
			privatePlayerStateTableIdFkey: foreignKey({
				columns: [table.tableId],
				foreignColumns: [publicTables.id],
			}).onDelete("cascade"),
			privatePlayerStateUserIdFkey: foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
			}).onDelete("restrict"),
		};
	},
);
