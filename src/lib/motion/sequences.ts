"use client";

import type { MotionLib } from "./adapter";
import type { MotionSettings } from "./types";

function secs(baseMs: number, settings: MotionSettings): number {
  const multiplier = settings.speedMultiplier || 1;
  const ms = Math.max(0, Math.round(baseMs / Math.max(0.1, multiplier)));
  return ms / 1000;
}

function safeQueryAll(selector: string): Element[] {
  if (typeof window === "undefined") return [];
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function maybeOutline(elements: Element[], settings: MotionSettings) {
  if (!settings.debugOutlines) return;
  for (const el of elements) {
    const style = (el as HTMLElement).style;
    if (!style) continue;
    if (!style.outline) style.outline = "1px dashed rgba(16,185,129,0.6)";
    if (!style.outlineOffset) style.outlineOffset = "2px";
  }
}

async function sequenceDemoFlip(
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  const cards = safeQueryAll('[data-anim="card"]');
  if (cards.length === 0) return;
  maybeOutline(cards, settings);
  const target = cards[0];
  await lib.animate(
    target,
    {
      transform: [
        "rotateY(0deg) scale(1)",
        "rotateY(90deg) scale(0.98)",
        "rotateY(180deg) scale(1)",
      ],
    },
    { duration: secs(600, settings), easing: "ease-in-out" }
  ).finished;
}

async function sequenceCommunityReveal(
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  const container = safeQueryAll('[data-anim="community"]');
  if (container.length === 0) return;
  maybeOutline(container, settings);
  const cards = safeQueryAll('[data-anim="community"] [data-anim="card"]');
  if (cards.length === 0) return;
  maybeOutline(cards, settings);

  const base = secs(400, settings);
  const delay = lib.stagger(secs(100, settings));
  await lib.animate(
    cards,
    {
      transform: [
        "translateY(10px) rotate(-3deg)",
        "translateY(0px) rotate(0deg)",
      ],
      opacity: [0, 1],
    },
    { duration: base, delay }
  ).finished;
}

async function sequenceSeatTurn(
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  const playerId = String(payload?.playerId ?? "");
  const selector = playerId
    ? `[data-anim="seat"][data-anim-id="${CSS.escape(playerId)}"]`
    : '[data-anim="seat"]';
  const seats = safeQueryAll(selector);
  if (seats.length === 0) return;
  maybeOutline(seats, settings);
  await lib.animate(
    seats,
    {
      boxShadow: [
        "0 0 0 0 rgba(16,185,129,0.0)",
        "0 0 0 10px rgba(16,185,129,0.25)",
        "0 0 0 0 rgba(16,185,129,0.0)",
      ],
    },
    { duration: secs(800, settings), easing: "ease-in-out" }
  ).finished;
}

async function sequenceSeatFold(
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  const playerId = String(payload?.playerId ?? "");
  const root = playerId
    ? `[data-anim="seat"][data-anim-id="${CSS.escape(playerId)}"]`
    : '[data-anim="seat"]';
  const cards = safeQueryAll(`${root} [data-anim="card"]`);
  if (cards.length === 0) return;
  maybeOutline(cards, settings);
  await lib.animate(
    cards,
    {
      opacity: [1, 0],
      transform: [
        "rotate(0deg) translateY(0px)",
        "rotate(-10deg) translateY(10px)",
      ],
    },
    { duration: secs(350, settings), delay: lib.stagger(secs(80, settings)) }
  ).finished;
}

async function sequencePotCollect(
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  const target = safeQueryAll('[data-anim="community"]');
  if (target.length === 0) return;
  maybeOutline(target, settings);
  await lib.animate(
    target,
    {
      transform: [
        "scale(1) translateY(0px)",
        "scale(1.05) translateY(-4px)",
        "scale(1) translateY(0px)",
      ],
    },
    { duration: secs(500, settings), easing: "ease-in-out" }
  ).finished;
}

export async function playSequence(
  name: string,
  payload: Record<string, unknown> | undefined,
  settings: MotionSettings,
  lib: MotionLib
) {
  switch (name) {
    case "demo:flip":
      return sequenceDemoFlip(payload, settings, lib);
    case "community:reveal":
      return sequenceCommunityReveal(payload, settings, lib);
    case "seat:turn":
      return sequenceSeatTurn(payload, settings, lib);
    case "seat:fold":
      return sequenceSeatFold(payload, settings, lib);
    case "pot:collect":
      return sequencePotCollect(payload, settings, lib);
    default:
      return Promise.resolve();
  }
}
