import pino, { LoggerOptions } from "pino";
// import pretty from "pino-pretty";
import path from "node:path";
import { captureLogOrigin } from "./source";
// Skip server-only check in standalone scripts/tests
// It will still be checked by Next.js during bundling
try {
  if (typeof process !== "undefined" && process.env.NEXT_RUNTIME) {
    require("server-only");
  }
} catch {
  // Ignore in standalone scripts
}

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

    const LOG_ORIGIN_ENABLED = process.env.NODE_ENV !== "production";
    const LOG_ORIGIN_VENDOR_FALLBACK =
      process.env.LOG_ORIGIN_VENDOR_FALLBACK === "1";

    const options: LoggerOptions = {
      ...baseOptions,
      mixin() {
        if (!LOG_ORIGIN_ENABLED) return {};
        const info = captureLogOrigin({
          allowFallbackToVendor: LOG_ORIGIN_VENDOR_FALLBACK,
        });
        if (!info) return {};
        // Extract just the filename from the absolute path
        const fileName = path.basename(info.absPath);
        return {
          origin: {
            file: fileName, // Just the filename for display
            absPath: info.absPath, // Full absolute path for clickability
            line: info.line,
            col: info.col,
            fn: info.functionName ?? undefined,
          },
        };
      },
    };

    const prettyStream = pretty({
      colorize: true,
      ignore: "origin,system", // Hide the origin key from output (it's only used for formatting)
      customPrettifiers: {
        name: (name, key, log, { colors }) => {
          const nameString = typeof name === "string" ? name : key;
          return colors.blue(nameString);
        },
        requestId: (requestId) => {
          if (typeof requestId === "string" && requestId.length >= 8) {
            return requestId.slice(-8);
          }
          return String(requestId);
        },
        path: (path) => {
          try {
            return typeof path === "string"
              ? decodeURIComponent(path)
              : String(path);
          } catch {
            // If decoding fails, return the original path as string
            return String(path);
          }
        },
      },
      messageFormat(log, messageKey): string {
        const o = (
          log as {
            origin?: {
              file: string;
              absPath?: string;
              line: number;
              col?: number;
              fn?: string;
            };
          }
        ).origin;
        const message = String(log[messageKey] || "");
        if (!o) return message;

        // Format: filename.ts:line:col
        const displayText = `${o.file}:${o.line}${o.col ? `:${o.col}` : ""}`;

        // Make it clickable using terminal hyperlink escape sequences (OSC 8)
        // Format: \x1b]8;;file:///absolute/path.ts:line:col\x1b\\displayText\x1b]8;;\x1b\\
        const cyan = "\x1b[36m";
        const dim = "\x1b[2m";
        const reset = "\x1b[0m";

        let clickableHeader: string;
        if (o.absPath) {
          // Use terminal hyperlink format for clickability
          const url = `cursor://file${o.absPath}:${o.line}${
            o.col ? `:${o.col}` : ""
          }`;
          clickableHeader = `\x1b]8;;${url}\x1b\\${cyan}${displayText}${reset}\x1b]8;;\x1b\\`;
        } else {
          // Fallback if absPath not available
          clickableHeader = `${cyan}${displayText}${reset}`;
        }

        return `${clickableHeader} ${dim}—${reset} ${message}`;
      },
    });
    const logger = pino(options, prettyStream);
    return attachWith(logger);
  }

  const logger = pino(baseOptions);
  return attachWith(logger);
}

declare global {
  var __appLogger: AppLogger | undefined;
  var __appLoggerPromise: Promise<AppLogger> | undefined;
}

// Module-level state
let loggerInstance: AppLogger | undefined;

// Initialize the logger immediately when the module loads
const loggerInitPromise: Promise<AppLogger> =
  globalThis.__appLoggerPromise ??
  (globalThis.__appLoggerPromise = createPinoLogger().then((logger) => {
    loggerInstance = logger;
    if (process.env.NODE_ENV !== "production") {
      globalThis.__appLogger = logger;
    }
    return logger;
  }));

// Export a Proxy that provides access to the logger
// The logger initializes immediately on module load, so by the time
// application code runs, it should be ready
export const logger = new Proxy({} as AppLogger, {
  get(_target, prop) {
    if (!loggerInstance) {
      throw new Error(
        `Logger not yet initialized. Tried to access property: ${String(
          prop
        )}. ` +
          `For standalone scripts, use: await initLogger() before accessing logger.`
      );
    }
    const value = loggerInstance[prop as keyof AppLogger];
    return typeof value === "function" ? value.bind(loggerInstance) : value;
  },
});

/**
 * Ensures the logger is fully initialized.
 * Call this in standalone scripts before using the logger.
 */
export async function initLogger(): Promise<AppLogger> {
  return loggerInitPromise;
}
