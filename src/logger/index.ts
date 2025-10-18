import pino, { LoggerOptions } from "pino";

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

export type AppLogger = pino.Logger & { with: (fields: LogFields) => AppLogger };

function attachWith(base: pino.Logger): AppLogger {
  const withFn = (fields: LogFields): AppLogger => attachWith(base.child(fields));
  return Object.assign(base, { with: withFn });
}

function createPinoLogger() {
  if (isBrowser()) {
    // Browser: use pino with pretty transport disabled, and map to console
    const logger = pino(baseOptions);
    return attachWith(logger);
  }

  // Node: pretty in dev, JSON in prod
  const transport = isProduction()
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
        },
      };

  const logger = pino({ ...baseOptions, transport });
  return attachWith(logger);
}

export const logger: AppLogger = createPinoLogger();
