import { db } from "@/db";
import { simulatorJobs } from "@/db/schema/simulatorJobs";
import { and, eq, lte, sql } from "drizzle-orm";

export type EnqueueOptions = {
	gameId: string;
	playerId?: string | null;
	handId?: number;
	runAtMs?: number; // delay from now in ms
	payload?: Record<string, unknown>;
};

export async function enqueueSimulatorJob(opts: EnqueueOptions): Promise<void> {
	const runAt = new Date(Date.now() + Math.max(0, opts.runAtMs ?? 0));
	try {
		await db.insert(simulatorJobs).values({
			gameId: opts.gameId,
			playerId: opts.playerId ?? null,
			handId: opts.handId ?? 0,
			runAt,
			status: "pending",
			payload: (opts.payload ?? null) as unknown as object | null,
		});
	} catch {
		// Ignore unique violation for duplicate pending job
	}
}

export async function claimDueSimulatorJobs(limit = 10) {
	return await db.transaction(async (tx) => {
		await tx.execute(sql`SET LOCAL lock_timeout = '100ms'`);
		// Take due, pending jobs by marking as processing and locking them
		const due = await tx
			.select()
			.from(simulatorJobs)
			.where(and(eq(simulatorJobs.status, "pending"), lte(simulatorJobs.runAt, new Date())))
			.orderBy(simulatorJobs.runAt)
			.limit(limit);

		const claimed: typeof due = [];
		for (const job of due) {
			const [updated] = await tx
				.update(simulatorJobs)
				.set({ status: "processing", lockedAt: new Date(), attempts: (job.attempts ?? 0) + 1 })
				.where(and(eq(simulatorJobs.id, job.id), eq(simulatorJobs.status, "pending")))
				.returning();
			if (updated) claimed.push(updated);
		}
		return claimed;
	});
}

export async function completeJob(id: number) {
	await db.update(simulatorJobs).set({ status: "completed", lockedAt: null }).where(eq(simulatorJobs.id, id));
}

export async function failJob(id: number, error: string, retryInMs?: number) {
	const next = retryInMs ? new Date(Date.now() + retryInMs) : null;
	await db
		.update(simulatorJobs)
		.set({ status: next ? "pending" : "failed", error, runAt: next ?? new Date(), lockedAt: null })
		.where(eq(simulatorJobs.id, id));
}