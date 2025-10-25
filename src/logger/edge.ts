export type EdgeLogger = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
  debug: (obj: Record<string, unknown>, msg?: string) => void;
  with: (fields: Record<string, unknown>) => EdgeLogger;
};

function isDev() {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

function makeConsole(level: "info" | "warn" | "error" | "debug") {
  return (obj: Record<string, unknown>, msg?: string) => {
    const prefix = msg ? `${msg} ` : "";
    const payload = isDev() ? JSON.stringify(obj) : JSON.stringify(obj);
    // edge runtime compatible
    try {
      const fn: (msg: string, ...rest: unknown[]) => void =
        level === "info"
          ? console.info
          : level === "warn"
          ? console.warn
          : level === "error"
          ? console.error
          : console.debug;
      fn(`${prefix}${payload}`);
    } catch {}
  };
}

export const edgeLogger: EdgeLogger = {
  info: makeConsole("info"),
  warn: makeConsole("warn"),
  error: makeConsole("error"),
  debug: makeConsole("debug"),
  with(fields) {
    return {
      info: (obj, msg) => edgeLogger.info({ ...fields, ...obj }, msg),
      warn: (obj, msg) => edgeLogger.warn({ ...fields, ...obj }, msg),
      error: (obj, msg) => edgeLogger.error({ ...fields, ...obj }, msg),
      debug: (obj, msg) => edgeLogger.debug({ ...fields, ...obj }, msg),
      with: (more) => edgeLogger.with({ ...fields, ...more }),
    };
  },
};
