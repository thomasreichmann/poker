"use client";

import type { MotionSettings } from "./types";
import { playSequence } from "./sequences";

type Animate = (
  target: Element | Element[] | NodeListOf<Element> | string,
  keyframes: unknown,
  options?: unknown
) => { finished: Promise<void> };

type Stagger = (interval: number) => (index: number) => number;

export interface MotionLib {
  animate: Animate;
  stagger: Stagger;
}

let motionLib: MotionLib | null = null;
let getSettingsRef: (() => MotionSettings) | null = null;

export async function initializeMotion(getSettings: () => MotionSettings) {
  getSettingsRef = getSettings;
  if (typeof window === "undefined") return;
  if (motionLib) return;
  try {
    const mod = (await import("motion")) as unknown as {
      animate: Animate;
      stagger: Stagger;
    };
    motionLib = { animate: mod.animate, stagger: mod.stagger };
  } catch {
    motionLib = null;
  }
}

export function disposeMotion() {
  motionLib = null;
  getSettingsRef = null;
}

export async function play(
  name: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getSettingsRef) return;
  const settings = getSettingsRef();
  if (!settings.enabled || settings.preset === "none") return;
  if (!motionLib) {
    await initializeMotion(getSettingsRef);
  }
  if (!motionLib) return;
  await playSequence(name, payload, settings, motionLib);
}


