"use client";

import { cubicBezier } from "motion";

export const motionDurations = {
  fast: 200,
  base: 300,
  slow: 450,
  celebrate: 600,
} as const;

export const motionEasings = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  entrance: "cubic-bezier(0.12, 0, 0.39, 0)",
  exit: "cubic-bezier(0.61, 1, 0.88, 1)",
} as const;

export const motionEasingFns = {
  standard: cubicBezier(0.2, 0, 0, 1),
  emphasized: cubicBezier(0.2, 0, 0, 1),
  entrance: cubicBezier(0.12, 0, 0.39, 0),
  exit: cubicBezier(0.61, 1, 0.88, 1),
} as const;

export const motionZ = {
  halo: 1,
  chips: 2,
  cards: 3,
  pot: 4,
  overlays: 10,
} as const;

export const motionTokens = {
  durations: motionDurations,
  easings: motionEasings,
  easingFns: motionEasingFns,
  z: motionZ,
} as const;