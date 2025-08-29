import { db } from "@/db";
import { games } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { and, eq } from "drizzle-orm";
import { makeRng } from "./rng";
import type { SimulatorConfig, StrategyConfig } from "./types";

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

export async function scheduleNextBotMoveIfNeeded(gameId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.SIM_BOT_ENABLED === "false") return;

  const [row] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!row) return;

  const config: SimulatorConfig = (row.simulatorConfig as unknown as SimulatorConfig) || ({ enabled: false } as SimulatorConfig);
  if (!config.enabled || config.paused) return;
  if (!row.currentPlayerTurn) return;

  const currentPlayerId = String(row.currentPlayerTurn);
  const [pl] = await db
    .select()
    .from(players)
    .where(and(eq(players.gameId, gameId), eq(players.id, currentPlayerId)))
    .limit(1);
  if (!pl) return;

  const strategyCfg: StrategyConfig | undefined =
    (config.perSeatStrategy && config.perSeatStrategy[currentPlayerId]) || config.defaultStrategy;
  if (!strategyCfg || strategyCfg.id === "human") return;

  const delays = config.delays ?? { minMs: 1800, maxMs: 2600, speedMultiplier: 1 };
  const rng = makeRng(config.seed);
  const jitter = delays.minMs + Math.floor(rng() * Math.max(0, (delays.maxMs - delays.minMs + 1)));
  const delayMs = Math.max(0, Math.floor(jitter / Math.max(0.1, delays.speedMultiplier ?? 1)));

  const baseUrl = getBaseUrl();
  const secret = process.env.SIM_BOT_SECRET || "";

  console.log("[sim-bot] schedule_request", {
    gameId,
    handId: row.handId,
    expectedPlayerId: currentPlayerId,
    delay: delayMs,
  });

  await fetch(`${baseUrl}/api/internal/sim/schedule`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sim-bot-secret": secret,
    },
    body: JSON.stringify({
      gameId,
      handId: row.handId,
      expectedPlayerId: currentPlayerId,
      delayMs,
    }),
  });
}