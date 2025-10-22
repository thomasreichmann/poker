// Patch Next's dev request logging to route through our pino logger
// The original module prints directly to process.stdout, bypassing console and Next's logger
// We override its exported logRequests function at module init time.

import { logger } from "../index";

// Ensure the module is loaded so it's present in require.cache
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("next/dist/server/dev/log-requests");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cachePath = require.resolve("next/dist/server/dev/log-requests");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const cacheObject = require.cache[cachePath];

if (cacheObject) {
  const originalExports = cacheObject.exports as {
    logRequests: (opts: {
      request: { method: string; url: string; // plus other fields we don't rely on
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [k: string]: any;
      };
      response: { statusCode: number };
      loggingConfig: unknown;
      requestDurationInMs: number;
    }) => void;
    ignoreLoggingIncomingRequests: (request: { url: string }, loggingConfig: unknown) => boolean;
  };

  const originalIgnore = originalExports.ignoreLoggingIncomingRequests;

  // Allow redefining exported properties (Next marks them non-configurable in some cases)
  cacheObject.exports = { ...cacheObject.exports };

  Object.defineProperty(cacheObject.exports, "logRequests", {
    value: function patchedLogRequests(opts: {
      request: { method: string; url: string };
      response: { statusCode: number };
      loggingConfig: unknown;
      requestDurationInMs: number;
    }) {
      try {
        if (!originalIgnore?.(opts.request, opts.loggingConfig)) {
          const child = logger.child({ name: "next.js", prefix: "request" });
          child.info(
            {
              method: opts.request.method,
              url: opts.request.url,
              status: opts.response.statusCode,
              durationMs: opts.requestDurationInMs,
            },
            "HTTP request",
          );
        }
      } catch {
        // Swallow to avoid interfering with Next dev server
      }
      // Intentionally do not call the original to prevent duplicate stdout logs
    },
    configurable: true,
    writable: true,
    enumerable: true,
  });
}
