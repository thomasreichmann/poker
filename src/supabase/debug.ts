export type DebugSink = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

function isDev() {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

import { logger } from "@/logger";

export const debug: DebugSink = {
  log: (...args) => {
    if (!isDev()) return;
    try {
      logger.debug({ args }, "rt.log");
    } catch {}
  },
  warn: (...args) => {
    if (!isDev()) return;
    try {
      logger.warn({ args }, "rt.warn");
    } catch {}
  },
  error: (...args) => {
    if (!isDev()) return;
    try {
      logger.error({ args }, "rt.error");
    } catch {}
  },
};
