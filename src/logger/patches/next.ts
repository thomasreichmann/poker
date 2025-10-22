import nextLogger from "next/dist/build/output/log";
import { logger } from "../index";

function getLogMethod(nextMethod: string) {
  const childLogger = logger.child({ name: "next.js", prefix: nextMethod });
  switch (nextMethod) {
    case "error":
      return childLogger.error.bind(childLogger);
    case "warn":
      return childLogger.warn.bind(childLogger);
    case "trace":
      return childLogger.trace.bind(childLogger);
    default:
      return childLogger.info.bind(childLogger);
  }
}

// Reassign exported properties to allow redefining them (Next defines them non-configurable)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cachePath = require.resolve("next/dist/build/output/log");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const cacheObject = require.cache[cachePath];
if (cacheObject) {
  cacheObject.exports = { ...cacheObject.exports };
  Object.keys((nextLogger as unknown as { prefixes: Record<string, string> }).prefixes).forEach(
    (method) => {
      Object.defineProperty(cacheObject.exports, method, {
        value: getLogMethod(method),
        configurable: true,
        writable: true,
        enumerable: true,
      });
    },
  );
}
