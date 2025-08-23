import { pgEnum, pgTable, serial, timestamp, uuid, integer, jsonb, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

export const simJobStatusEnum = pgEnum("sim_job_status", [
	"pending",
	"processing",
	"completed",
	"failed",
]);

type PendingLiteral = "pending";

export const simulatorJobs = pgTable(
	"poker_simulator_jobs",
	{
		id: serial("id").primaryKey(),
		gameId: uuid("game_id").notNull(),
		playerId: uuid("player_id"),
		handId: integer("hand_id").default(0).notNull(),
		runAt: timestamp("run_at").defaultNow().notNull(),
		status: simJobStatusEnum("status").default("pending").notNull(),
		attempts: integer("attempts").default(0).notNull(),
		payload: jsonb("payload"),
		error: text("error"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		lockedAt: timestamp("locked_at"),
	},
	(table) => ({
		dueIdx: index("idx_sim_jobs_due").on(table.runAt).where(eq(table.status, "pending" as PendingLiteral)),
		statusIdx: index("idx_sim_jobs_status").on(table.status),
		uniqPending: uniqueIndex("uniq_sim_jobs_pending")
			.on(table.gameId, table.handId, table.playerId)
			.where(eq(table.status, "pending" as PendingLiteral)),
	})
);