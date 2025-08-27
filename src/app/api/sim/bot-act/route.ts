import { Receiver } from "@upstash/qstash";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { eq } from "drizzle-orm";
import { dbGameToPureGame, handleActionPure } from "@/lib/poker/engineAdapter";
import type { PokerAction } from "@/db/schema/actionTypes";
import type { SimulatorConfig, StrategyConfig } from "@/lib/simulator/types";
import { makeStrategy } from "@/lib/simulator/strategies";
import { maybeScheduleBot } from "@/lib/simulator/scheduler";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function botsGloballyEnabled(): boolean {
  return String(process.env.SIM_BOT_ENABLED || "").toLowerCase() === "true";
}

type BotActPayload = {
  gameId: string;
  expectedPlayerId: string;
  handId: number;
  scheduleKey: string;
};

async function verifyRequest(req: Request, rawBody: string): Promise<boolean> {
  if (isProduction()) return false;

  // Prefer QStash signature when provided
  const sig = req.headers.get("upstash-signature") || req.headers.get("Upstash-Signature");
  if (sig) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY || "";
    if (!currentSigningKey) return false;
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    try {
      const ok = await receiver.verify({ signature: sig, body: rawBody, url: req.url });
      return ok;
    } catch {
      return false;
    }
  }

  // Fallback for local dev: shared secret header
  const devSecret = process.env.SIM_BOT_SECRET;
  if (!devSecret) return false;
  const provided = req.headers.get("x-sim-bot-secret");
  return provided === devSecret;
}

export async function POST(req: Request): Promise<Response> {
  if (isProduction()) return new Response("disabled", { status: 200 });
  if (!botsGloballyEnabled()) return new Response("bot disabled", { status: 200 });

  const raw = await req.text();
  const ok = await verifyRequest(req, raw);
  if (!ok) return new Response("unauthorized", { status: 401 });

  let payload: BotActPayload;
  try {
    payload = JSON.parse(raw) as BotActPayload;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const { gameId, expectedPlayerId, handId, scheduleKey } = payload;

  try {
    // Load game row for config and quick checks
    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) return new Response("ok", { status: 200 });

    const config = (game.simulatorConfig as unknown as SimulatorConfig) || { enabled: false };
    if (!config.enabled || config.paused) return new Response("ok", { status: 200 });

    // Idempotency / state checks
    if ((game.handId ?? 0) !== handId) return new Response("ok", { status: 200 });
    if (!game.currentPlayerTurn || String(game.currentPlayerTurn) !== expectedPlayerId)
      return new Response("ok", { status: 200 });

    // Build pure state for strategy decision
    const pure = await dbGameToPureGame(gameId);
    if ((pure.handId ?? 0) !== handId) return new Response("ok", { status: 200 });
    if (pure.currentPlayerTurn !== expectedPlayerId) return new Response("ok", { status: 200 });

    const stratCfg: StrategyConfig | undefined =
      (config.perSeatStrategy && config.perSeatStrategy[expectedPlayerId]) || config.defaultStrategy;
    if (!stratCfg || stratCfg.id === "human") return new Response("ok", { status: 200 });

    const strat = makeStrategy(stratCfg);
    const decision = strat.decide({ game: pure, playerId: expectedPlayerId });
    if (!decision) return new Response("ok", { status: 200 });

    console.log("[sim-bot] acting", { gameId, scheduleKey, decision: decision.action, amount: decision.amount });

    await handleActionPure({
      gameId,
      playerId: expectedPlayerId,
      action: decision.action as PokerAction,
      amount: decision.amount,
      actorSource: "bot",
      botStrategy: strat.id,
    });

    // Chain next potential bot turn
    await maybeScheduleBot(gameId);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[sim-bot] webhook error", err);
    // Return 200 to avoid retries if state moved on; logs will capture errors
    return new Response("ok", { status: 200 });
  }
}

