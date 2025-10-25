import pino, { LoggerOptions } from "pino";
// import pretty from "pino-pretty";
import "server-only";

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof document !== "undefined";
  } catch {
    return false;
  }
}

function isProduction() {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
}

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction() ? "info" : "debug"),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
};

export type LogFields = Record<string, unknown>;

export type AppLogger = pino.Logger & {
  with: (fields: LogFields) => AppLogger;
};

function attachWith(base: pino.Logger): AppLogger {
  const withFn = (fields: LogFields): AppLogger =>
    attachWith(base.child(fields));
  return Object.assign(base, { with: withFn });
}

async function createPinoLogger() {
  if (isBrowser()) {
    // Browser: use pino with pretty transport disabled, and map to console
    const logger = pino(baseOptions);
    return attachWith(logger);
  }

  // Node: pretty in dev (in-process stream), JSON in prod
  if (!isProduction()) {
    // Use in-process pretty stream to avoid worker/thread-stream issues in Next dev

    const { default: pretty } = await import("pino-pretty");
    const prettyStream = pretty({
      colorize: true,
      customPrettifiers: {
        name: (name, key, log, { colors }) => {
          const nameString = typeof name === "string" ? name : key;
          return colors.blue(nameString);
        },
      },
    });
    const logger = pino(baseOptions, prettyStream);
    return attachWith(logger);
  }

  const logger = pino(baseOptions);
  return attachWith(logger);
}

declare global {
  var __appLogger: AppLogger | undefined;
}

export const logger: AppLogger =
  process.env.NODE_ENV !== "production"
    ? globalThis.__appLogger ??
      (globalThis.__appLogger = await createPinoLogger())
    : await createPinoLogger();

export function freshStack<T extends Error>(e: T): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (e as any).stack;
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (e as any).stack;
  } catch {}
  return e;
}
