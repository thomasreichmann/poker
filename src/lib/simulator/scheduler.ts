import { Client } from "@upstash/qstash";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { eq } from "drizzle-orm";
import type { SimulatorConfig, StrategyConfig } from "@/lib/simulator/types";
import { makeRng } from "@/lib/simulator/rng";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function botsGloballyEnabled(): boolean {
  // Default disabled unless explicitly enabled
  return String(process.env.SIM_BOT_ENABLED || "").toLowerCase() === "true";
}

function getPublicBaseUrl(): string {
  // Explicit env for simulator webhook base URL
  if (process.env.SIM_BOT_BASE_URL) return String(process.env.SIM_BOT_BASE_URL);
  // Back-compat: accept PUBLIC_BASE_URL if provided
  if (process.env.PUBLIC_BASE_URL) return String(process.env.PUBLIC_BASE_URL);
  // As a last resort, do not guess. Return empty string so caller can skip.
  return "";
}

type SchedulePayload = {
  gameId: string;
  expectedPlayerId: string;
  handId: number;
  scheduleKey: string;
};

export async function maybeScheduleBot(gameId: string): Promise<void> {
  try {
    if (isProduction()) return; // hard disabled in production
    if (!botsGloballyEnabled()) return;

    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return;

    const config = (game.simulatorConfig as unknown as SimulatorConfig) || { enabled: false };
    if (!config.enabled || config.paused) return;

    const currentPlayerId = game.currentPlayerTurn ? String(game.currentPlayerTurn) : null;
    const handId = game.handId ?? 0;
    if (!currentPlayerId) return;

    const stratCfg: StrategyConfig | undefined =
      (config.perSeatStrategy && config.perSeatStrategy[currentPlayerId]) || config.defaultStrategy;
    if (!stratCfg) return;
    if (stratCfg.id === "human") return; // do not schedule for human seats

    const delays = config.delays ?? { minMs: 200, maxMs: 800, speedMultiplier: 1 };
    const rng = makeRng(config.seed);
    const jitter =
      Math.max(0, delays.minMs) +
      Math.floor(rng() * Math.max(0, (delays.maxMs ?? 0) - (delays.minMs ?? 0) + 1));
    const waitMs = Math.max(0, Math.floor(jitter / Math.max(0.1, delays.speedMultiplier ?? 1)));
    const delaySeconds = Math.max(1, Math.round(waitMs / 1000));

    const scheduleKey = `${gameId}:${handId}:${currentPlayerId}`;

    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      console.log("[sim-bot] QSTASH_TOKEN not set; skipping schedule", { gameId, scheduleKey });
      return;
    }

    const client = new Client({ token });
    const baseUrl = getPublicBaseUrl();
    if (!baseUrl) {
      console.log("[sim-bot] SIM_BOT_BASE_URL not set; skipping schedule", { gameId, scheduleKey });
      return;
    }
    const url = `${baseUrl}/api/sim/bot-act`;
    const payload: SchedulePayload = {
      gameId,
      expectedPlayerId: currentPlayerId,
      handId,
      scheduleKey,
    };

    const res = await client.publishJSON({
      url,
      body: payload,
      delay: delaySeconds,
      deduplicationId: scheduleKey,
    });

    console.log("[sim-bot] scheduled", { gameId, scheduleKey, delaySeconds, messageId: res.messageId });
  } catch (err) {
    console.error("[sim-bot] schedule error", err);
  }
}

