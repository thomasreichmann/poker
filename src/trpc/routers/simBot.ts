import { db } from "@/db";
import { games } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { handleActionPure, dbGameToPureGame } from "@/lib/poker/engineAdapter";
import { makeRng } from "@/lib/simulator/rng";
import { makeStrategy } from "@/lib/simulator/strategies";
import type { SimulatorConfig, StrategyConfig } from "@/lib/simulator/types";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, simInternalProcedure } from "../init";

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

export const simBotRouter = createTRPCRouter({
  performOneMove: simInternalProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        handId: z.number().int().optional(),
        expectedPlayerId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Global gate
      if (process.env.SIM_BOT_ENABLED === "false") {
        return { ok: true, skipped: "global-disabled" } as const;
      }

      // Load fresh game
      const [gameRow] = await db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);
      if (!gameRow) return { ok: true, skipped: "game-not-found" } as const;

      // Per-game gate
      const config: SimulatorConfig = (gameRow.simulatorConfig as unknown as SimulatorConfig) || ({ enabled: false } as SimulatorConfig);
      if (!config.enabled) return { ok: true, skipped: "sim-disabled" } as const;

      // Idempotency guards
      if (typeof input.handId === "number" && gameRow.handId !== input.handId) {
        return { ok: true, skipped: "hand-advanced" } as const;
      }
      if (!gameRow.currentPlayerTurn) {
        return { ok: true, skipped: "no-turn" } as const;
      }
      if (input.expectedPlayerId && input.expectedPlayerId !== gameRow.currentPlayerTurn) {
        return { ok: true, skipped: "turn-changed" } as const;
      }

      // Determine strategy for current player
      const currentPlayerTurn = String(gameRow.currentPlayerTurn);
      const [pl] = await db
        .select()
        .from(players)
        .where(and(eq(players.gameId, input.gameId), eq(players.id, currentPlayerTurn)))
        .limit(1);
      if (!pl) return { ok: true, skipped: "player-not-found" } as const;

      const strategyCfg: StrategyConfig | undefined =
        (config.perSeatStrategy && config.perSeatStrategy[currentPlayerTurn]) || config.defaultStrategy;
      if (!strategyCfg) return { ok: true, skipped: "no-strategy" } as const;
      if (strategyCfg.id === "human") return { ok: true, skipped: "not-bot" } as const;

      // Fresh pure state to decide
      const pure = await dbGameToPureGame(input.gameId);
      if (pure.handId !== gameRow.handId) return { ok: true, skipped: "hand-advanced" } as const;
      if (pure.currentPlayerTurn !== currentPlayerTurn) return { ok: true, skipped: "turn-changed" } as const;

      const strat = makeStrategy(strategyCfg);
      const decision = strat.decide({ game: pure, playerId: currentPlayerTurn });
      if (!decision) return { ok: true, skipped: "no-decision" } as const;

      console.log("[sim-bot] action", { action: decision.action, amount: decision.amount ?? null, strategy: strat.id });

      // Persist exactly one action via engine
      await handleActionPure({
        gameId: input.gameId,
        playerId: currentPlayerTurn,
        action: decision.action,
        amount: decision.amount,
        actorSource: "bot",
        botStrategy: strat.id,
      } as unknown as Parameters<typeof handleActionPure>[0]);

      // Reload to decide whether to schedule next hop
      const [afterRow] = await db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);
      if (!afterRow || !afterRow.currentPlayerTurn) return { ok: true, done: true } as const;

      const nextPlayerId = String(afterRow.currentPlayerTurn);
      const nextStrategyCfg: StrategyConfig | undefined =
        (config.perSeatStrategy && config.perSeatStrategy[nextPlayerId]) || config.defaultStrategy;

      if (nextStrategyCfg && nextStrategyCfg.id !== "human") {
        // Jitter based on config
        const delays = config.delays ?? { minMs: 1500, maxMs: 2500, speedMultiplier: 1 };
        const rng = makeRng(config.seed);
        const jitter =
          delays.minMs + Math.floor(rng() * Math.max(0, (delays.maxMs - delays.minMs + 1)));
        const delayMs = Math.max(0, Math.floor(jitter / Math.max(0.1, delays.speedMultiplier ?? 1)));

        console.log("[sim-bot] next-hop", {
          gameId: input.gameId,
          handId: afterRow.handId,
          expectedPlayerId: nextPlayerId,
          delay: delayMs,
        });

        const baseUrl = resolveBaseUrl();
        const secret = process.env.SIM_BOT_SECRET || "";
        // Fire-and-forget; outer request must trigger via scheduler route
        await fetch(`${baseUrl}/api/internal/sim/schedule`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-sim-bot-secret": secret,
          },
          body: JSON.stringify({
            gameId: input.gameId,
            handId: afterRow.handId,
            expectedPlayerId: nextPlayerId,
            delayMs,
          }),
        });
      }

      return { ok: true, done: true } as const;
    }),
});