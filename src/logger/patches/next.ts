import * as nextLogger from "next/dist/build/output/log";

import { logger } from "../index";

const getLogMethod = (nextMethod: string) => {
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
};

const cachePath = require.resolve("next/dist/build/output/log");
const cacheObject = require.cache[cachePath];

// This is required to forcibly redefine all properties on the logger.
// From Next 13 and onwards they're defined as non-configurable, preventing them from being patched.
cacheObject!.exports = { ...cacheObject!.exports };

Object.keys(nextLogger.prefixes).forEach((method) => {
  Object.defineProperty(cacheObject!.exports, method, {
    value: getLogMethod(method),
  });
});
