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

export const debug: DebugSink = {
  log: (...args) => {
    if (!isDev()) return;
    try {
      console.log("[rt]", ...args);
    } catch {}
  },
  warn: (...args) => {
    if (!isDev()) return;
    try {
      console.warn("[rt]", ...args);
    } catch {}
  },
  error: (...args) => {
    if (!isDev()) return;
    try {
      console.error("[rt]", ...args);
    } catch {}
  },
};
