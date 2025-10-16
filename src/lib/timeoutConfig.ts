export const TIMEOUT_CFG = {
  // Small grace to let the primary (turn holder) win; keep UX snappy
  observerGraceMs: 180,
  // Base slot for non-actor staggering; grows with seat distance
  baseSlotMs: 80,
  // Jitter to avoid herding within the same slot bucket
  slotJitterMs: 30,
  // Cap the additive slot delay to remain responsive
  maxDelayMs: 2500,
} as const;

export type TimeoutConfig = typeof TIMEOUT_CFG;
