import { db } from "@/db";
import { games } from "@/db/schema/games";
import { enqueueSimulatorJob, claimDueSimulatorJobs, completeJob, failJob } from "@/lib/simulator/queue";
import type { SimulatorConfig, StrategyConfig } from "@/lib/simulator/types";
import { eq } from "drizzle-orm";
import { dbGameToPureGame, handleActionPure } from "@/lib/poker/engineAdapter";
import { makeStrategy } from "@/lib/simulator/strategies";
import { makeRng } from "@/lib/simulator/rng";

export async function processDueSimulatorJobs(limit = 5) {
	const jobs = await claimDueSimulatorJobs(limit);
	let processed = 0;
	for (const job of jobs) {
		try {
			const [game] = await db.select().from(games).where(eq(games.id, job.gameId)).limit(1);
			if (!game) {
				await completeJob(job.id);
				continue;
			}
			const config = (game.simulatorConfig as unknown as SimulatorConfig) || { enabled: false };
			if (!config.enabled || config.paused) {
				await completeJob(job.id);
				continue;
			}

			const pure = await dbGameToPureGame(job.gameId);
			const currentPlayer = pure.currentPlayerTurn ?? undefined;
			if (!currentPlayer) {
				await completeJob(job.id);
				continue;
			}
			const strategyCfg: StrategyConfig | undefined =
				config.perSeatStrategy?.[currentPlayer] || config.defaultStrategy;
			if (!strategyCfg || strategyCfg.id === "human") {
				await completeJob(job.id);
				continue;
			}

			const rng = makeRng(config.seed);
			const delays = config.delays ?? { minMs: 200, maxMs: 800, speedMultiplier: 1 };
			const jitter = delays.minMs + Math.floor(rng() * Math.max(0, (delays.maxMs ?? delays.minMs) - delays.minMs + 1));
			const waitMs = Math.max(0, Math.floor(jitter / Math.max(0.1, delays.speedMultiplier ?? 1)));

			// If job became due early, and we need to respect delay, reschedule it
			if (waitMs > 0 && job.attempts <= 1) {
				await failJob(job.id, "reschedule for delay", waitMs);
				continue;
			}

			const strat = makeStrategy(strategyCfg);
			const decision = strat.decide({ game: pure, playerId: currentPlayer });
			if (!decision) {
				await completeJob(job.id);
				continue;
			}

			const nextGame = await handleActionPure({
				gameId: job.gameId,
				playerId: currentPlayer,
				action: decision.action,
				amount: decision.amount,
				actorSource: "bot",
				botStrategy: strat.id,
			});

			await completeJob(job.id);
			processed++;

			// Schedule next job for next player's turn if still enabled
			if (nextGame.currentPlayerTurn && config.enabled && !config.paused) {
				const nextJitter = delays.minMs + Math.floor(rng() * Math.max(0, (delays.maxMs ?? delays.minMs) - delays.minMs + 1));
				const nextWaitMs = Math.max(0, Math.floor(nextJitter / Math.max(0.1, delays.speedMultiplier ?? 1)));
				await enqueueSimulatorJob({
					gameId: nextGame.id,
					playerId: String(nextGame.currentPlayerTurn),
					handId: nextGame.handId ?? 0,
					runAtMs: nextWaitMs,
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			await failJob(job.id, message, Math.min(30_000, 1_000 * job.attempts ** 2));
		}
	}
	return processed;
}