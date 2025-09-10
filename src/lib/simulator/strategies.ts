import type { GameState } from "@/lib/poker/types";
import type { StrategyConfig, StrategyId } from "@/lib/simulator/types";

export type StrategyDecision = {
  action: "fold" | "check" | "call" | "raise" | "bet";
  amount?: number;
};

export interface StrategyContext {
  game: GameState;
  playerId: string;
}

export interface BotStrategy {
  id: StrategyId;
  decide(ctx: StrategyContext): StrategyDecision | null;
}

export function alwaysFold(): BotStrategy {
  return {
    id: "always_fold",
    decide: (ctx) => {
      const me = ctx.game.players.find((p) => p.id === ctx.playerId);
      if (!me) return null;
      const toCall = (ctx.game.currentHighestBet ?? 0) - (me.currentBet ?? 0);
      if (toCall === 0) return { action: "check" };
      return { action: "fold" };
    },
  };
}

export function callAny(): BotStrategy {
  return {
    id: "call_any",
    decide: (ctx) => {
      const me = ctx.game.players.find((p) => p.id === ctx.playerId);
      if (!me) return null;
      const toCall = (ctx.game.currentHighestBet ?? 0) - (me.currentBet ?? 0);
      if (toCall <= 0) return { action: "check" };
      const amount = Math.min(toCall, me.stack);
      if (amount <= 0) return { action: "check" };
      return { action: "call" };
    },
  };
}

export function tightAggro(): BotStrategy {
  return {
    id: "tight_aggro",
    decide: (ctx) => {
      const me = ctx.game.players.find((p) => p.id === ctx.playerId);
      if (!me) return null;
      const toCall = (ctx.game.currentHighestBet ?? 0) - (me.currentBet ?? 0);
      if (ctx.game.currentRound === "pre-flop") {
        // Occasionally raise 3x BB if first-in, otherwise call
        if ((ctx.game.lastAction ?? "check") === "check" && toCall === 0) {
          const raiseTo = Math.max(
            ctx.game.bigBlind * 3,
            ctx.game.currentHighestBet
          );
          const delta = Math.max(1, raiseTo - (me.currentBet ?? 0));
          if (delta <= me.stack) return { action: "raise", amount: delta };
        }
      }
      if (toCall <= 0) return { action: "check" };
      const amount = Math.min(toCall, me.stack);
      if (amount <= 0) return { action: "check" };
      return { action: "call" };
    },
  };
}

export function loosePassive(): BotStrategy {
  return {
    id: "loose_passive",
    decide: (ctx) => {
      const me = ctx.game.players.find((p) => p.id === ctx.playerId);
      if (!me) return null;
      const toCall = (ctx.game.currentHighestBet ?? 0) - (me.currentBet ?? 0);
      if (toCall <= 0) return { action: "check" };
      const amount = Math.min(toCall, me.stack);
      if (amount <= 0) return { action: "check" };
      return { action: "call" };
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function scripted(_cfg?: StrategyConfig): BotStrategy {
  return {
    id: "scripted",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    decide: (_ctx) => {
      // Placeholder: not implemented yet
      return null;
    },
  };
}

export function human(): BotStrategy {
  return {
    id: "human",
    // Human/manual player: never auto-decide
    decide: () => null,
  };
}

export function makeStrategy(cfg?: StrategyConfig): BotStrategy {
  switch (cfg?.id) {
    case "always_fold":
      return alwaysFold();
    case "call_any":
      return callAny();
    case "tight_aggro":
      return tightAggro();
    case "loose_passive":
      return loosePassive();
    case "human":
      return human();
    case "scripted":
      return scripted(cfg);
    default:
      return callAny();
  }
}
