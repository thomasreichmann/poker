export type StrategyId =
  | "always_fold"
  | "call_any"
  | "tight_aggro"
  | "loose_passive"
  | "scripted";

export interface StrategyConfig {
  id: StrategyId;
  // Optional extra data for scripted strategies
  script?: unknown;
}

export interface DelayConfig {
  minMs: number; // inclusive
  maxMs: number; // inclusive
  speedMultiplier?: number; // default 1.0
}

export interface SimulatorConfig {
  enabled: boolean;
  paused?: boolean;
  // Map of playerId -> strategy config
  perSeatStrategy?: Record<string, StrategyConfig>;
  // Default strategy to use when seat not specified
  defaultStrategy?: StrategyConfig;
  // Global action delay windows
  delays?: DelayConfig;
  // Determinism controls
  seed?: string;
  // Optional prearranged deck description (string DSL or explicit array)
  deckScript?: string;
}