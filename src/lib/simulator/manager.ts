import { db } from "@/db";
import { games } from "@/db/schema/games";
import { players } from "@/db/schema/players";
import { handleActionPure } from "@/lib/poker/engineAdapter";
import type { SimulatorConfig, StrategyConfig } from "./types";
import { makeRng } from "./rng";
import { makeStrategy } from "./strategies";
import { and, eq } from "drizzle-orm";

export type BotManagerOptions = {
  tableId: string;
};

export class BotManager {
  private tableId: string;
  private active = false;
  private paused = false;
  private timer: NodeJS.Timeout | null = null;
  private rng: () => number = Math.random;
  private lastObservedTurn: string | null = null;

  constructor(opts: BotManagerOptions) {
    this.tableId = opts.tableId;
  }

  async start() {
    this.active = true;
    await this.tick();
  }

  stop() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async tick() {
    if (!this.active) return;

    const [game] = await db.select().from(games).where(eq(games.id, this.tableId)).limit(1);
    if (!game) return this.scheduleNext(500);
    const config = (game.simulatorConfig as unknown as SimulatorConfig) || { enabled: false };

    if (!config.enabled || process.env.NODE_ENV === "production") {
      return this.scheduleNext(1000);
    }

    this.paused = !!config.paused;
    this.rng = makeRng(config.seed);

    if (this.paused) return this.scheduleNext(300);

    if (!game.currentPlayerTurn) return this.scheduleNext(250);

    const currentPlayerTurn = String(game.currentPlayerTurn);
    if (this.lastObservedTurn === currentPlayerTurn) {
      return this.scheduleNext(200);
    }

    // Check if the current player is controlled by a bot
    const [pl] = await db
      .select()
      .from(players)
      .where(and(eq(players.gameId, this.tableId), eq(players.id, currentPlayerTurn)))
      .limit(1);
    if (!pl) return this.scheduleNext(200);

    const strategyCfg: StrategyConfig | undefined = config.perSeatStrategy?.[currentPlayerTurn] || config.defaultStrategy;
    if (!strategyCfg) return this.scheduleNext(200);

    // Fetch a fresh pure state via engine adapter helper for accurate decisions
    const { dbGameToPureGame } = await import("@/lib/poker/engineAdapter");
    const pure = await dbGameToPureGame(this.tableId);

    if (pure.currentPlayerTurn !== currentPlayerTurn) {
      return this.scheduleNext(200);
    }

    const strat = makeStrategy(strategyCfg);
    const decision = strat.decide({ game: pure, playerId: currentPlayerTurn });
    if (!decision) return this.scheduleNext(200);

    const delays = config.delays ?? { minMs: 200, maxMs: 800, speedMultiplier: 1 };
    const jitter = delays.minMs + Math.floor(this.rng() * Math.max(0, delays.maxMs - delays.minMs + 1));
    const waitMs = Math.max(0, Math.floor(jitter / Math.max(0.1, delays.speedMultiplier ?? 1)));

    this.lastObservedTurn = currentPlayerTurn;

    this.timer = setTimeout(async () => {
      try {
        await handleActionPure({
          gameId: this.tableId,
          playerId: currentPlayerTurn,
          action: decision.action,
          amount: decision.amount,
          actorSource: "bot",
          botStrategy: strat.id,
        } as unknown as Parameters<typeof handleActionPure>[0]);
      } finally {
        // allow next turn
        this.lastObservedTurn = null;
        await this.tick();
      }
    }, waitMs);
  }

  private scheduleNext(ms: number) {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }
}