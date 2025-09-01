"use client";

import type React from "react";

export type MotionPreset = "default" | "none";

export interface MotionSettings {
  enabled: boolean;
  debugOutlines: boolean;
  speedMultiplier: number; // higher = faster
  preset: MotionPreset;
}

export const DEFAULT_SETTINGS: MotionSettings = {
  enabled: true,
  debugOutlines: false,
  speedMultiplier: 1,
  preset: "default",
};

export interface MotionEvent {
  id: string;
  name: string;
  at: number;
  payload?: Record<string, unknown>;
}

export type AnimAttrs = React.HTMLAttributes<HTMLElement>;

export interface MotionContextValue {
  settings: MotionSettings;
  setSettings: (updater: (prev: MotionSettings) => MotionSettings) => void;
  toggleEnabled: () => void;
  setDebugOutlines: (value: boolean) => void;
  setSpeedMultiplier: (value: number) => void;
  setPreset: (value: MotionPreset) => void;
  events: MotionEvent[];
  emit: (name: string, payload?: Record<string, unknown>) => void;
  clearEvents: () => void;
  getAnimAttrs: (
    tag: string,
    options?: {
      id?: string | number;
      role?: string;
      sequenceIndex?: number;
      totalInSequence?: number;
      delayMs?: number;
    }
  ) => AnimAttrs;
}

