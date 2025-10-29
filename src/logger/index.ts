import pino, { LoggerOptions } from "pino";
// import pretty from "pino-pretty";
import "server-only";
import { captureLogOrigin } from "./source";

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

const LOG_ORIGIN_ENABLED = process.env.NODE_ENV !== "production";
const LOG_ORIGIN_ABS = process.env.LOG_ORIGIN_ABS !== "0"; // default ABS on
const LOG_ORIGIN_VENDOR_FALLBACK = process.env.LOG_ORIGIN_VENDOR_FALLBACK === "1";

function withOriginMixin(base: LoggerOptions): LoggerOptions {
  // Inject per-log origin when enabled
  return Object.assign({}, base, {
    mixin() {
      if (!LOG_ORIGIN_ENABLED) return {};
      try {
        const info = captureLogOrigin({
          allowFallbackToVendor: LOG_ORIGIN_VENDOR_FALLBACK,
        });
        if (!info) return {};
        const file = LOG_ORIGIN_ABS ? info.absPath : info.relPath;
        return {
          origin: {
            file,
            line: info.line,
            col: info.col,
            fn: info.functionName ?? undefined,
          },
        } as Record<string, unknown>;
      } catch {
        return {};
      }
    },
  } satisfies LoggerOptions);
}

async function createPinoLogger() {
  if (isBrowser()) {
    // Browser: use pino with pretty transport disabled, and map to console
    const logger = pino(withOriginMixin(baseOptions));
    return attachWith(logger);
  }

  // Node: pretty in dev (in-process stream), JSON in prod
  if (!isProduction()) {
    // Use in-process pretty stream to avoid worker/thread-stream issues in Next dev

    const { default: pretty } = await import("pino-pretty");
    const prettyStream = pretty({
      colorize: true,
      translateTime: "SYS:HH:MM:ss.l",
      messageFormat(log, messageKey) {
        try {
          const o = (log as Record<string, any>).origin as
            | { file: string; line?: number; col?: number }
            | undefined;
          if (!o) return (log as Record<string, any>)[messageKey] || "";
          const needUrl = process.env.LOG_ORIGIN_URL === "1";
          const file = needUrl
            ? `file://${o.file.startsWith("/") ? "" : "/"}${o.file}`
            : o.file;
          const hdr = `${file}:${o.line ?? ""}${o.col ? `:${o.col}` : ""}`;
          const cyan = "\x1b[36m",
            dim = "\x1b[2m",
            reset = "\x1b[0m";
          return `${cyan}${hdr}${reset} ${dim}—${reset} ${(log as Record<string, any>)[messageKey] || ""}`;
        } catch {
          return (log as Record<string, any>)[messageKey] || "";
        }
      },
      customPrettifiers: {
        name: (name, key, log, { colors }) => {
          const nameString = typeof name === "string" ? name : key;
          return colors.blue(nameString);
        },
      },
    });
    const logger = pino(withOriginMixin(baseOptions), prettyStream);
    return attachWith(logger);
  }

  const logger = pino(withOriginMixin(baseOptions));
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
