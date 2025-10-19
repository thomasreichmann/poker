"use client";

export type LogFields = Record<string, unknown>;

export type AppLogger = {
  info: (obj: LogFields, msg?: string) => void;
  warn: (obj: LogFields, msg?: string) => void;
  error: (obj: LogFields, msg?: string) => void;
  debug: (obj: LogFields, msg?: string) => void;
  with: (fields: LogFields) => AppLogger;
};

function makeConsole(level: "info" | "warn" | "error" | "debug") {
  return (obj: LogFields, msg?: string) => {
    const prefix = msg ? `${msg} ` : "";
    try {
      const fn: (msg: string, ...rest: unknown[]) => void =
        level === "info"
          ? console.info
          : level === "warn"
          ? console.warn
          : level === "error"
          ? console.error
          : console.debug;
      fn(`${prefix}${JSON.stringify(obj)}`);
    } catch {}
  };
}

function makeLogger(baseFields: LogFields = {}): AppLogger {
  const info = (obj: LogFields, msg?: string) =>
    makeConsole("info")({ ...baseFields, ...obj }, msg);
  const warn = (obj: LogFields, msg?: string) =>
    makeConsole("warn")({ ...baseFields, ...obj }, msg);
  const error = (obj: LogFields, msg?: string) =>
    makeConsole("error")({ ...baseFields, ...obj }, msg);
  const debug = (obj: LogFields, msg?: string) =>
    makeConsole("debug")({ ...baseFields, ...obj }, msg);
  const withFn = (fields: LogFields) =>
    makeLogger({ ...baseFields, ...fields });
  return { info, warn, error, debug, with: withFn };
}

export const logger: AppLogger = makeLogger();
