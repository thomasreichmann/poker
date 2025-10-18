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

export type AppLogger = ReturnType<typeof pino> & {
  with: (fields: LogFields) => AppLogger;
};

function createPinoLogger() {
  if (isBrowser()) {
    // Browser: use pino with pretty transport disabled, and map to console
    const logger = pino(baseOptions);
    const withFn = (fields: LogFields): AppLogger => {
      // In the browser, we just attach fields into messages via bindings
      const child = logger.child(fields);
      // @ts-expect-error extend
      child.with = withFn as any;
      return child as AppLogger;
    };
    // @ts-expect-error extend
    (logger as any).with = withFn;
    return logger as AppLogger;
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
  const withFn = (fields: LogFields): AppLogger => {
    const child = logger.child(fields);
    // @ts-expect-error extend
    child.with = withFn as any;
    return child as AppLogger;
  };
  // @ts-expect-error extend
  (logger as any).with = withFn;
  return logger as AppLogger;
}

export const logger: AppLogger = createPinoLogger();
