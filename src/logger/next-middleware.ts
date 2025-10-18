import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runWithRequestContext } from "./request-context";
import { logger } from "./index";

export function withLogging(next: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async function handler(req: NextRequest) {
    const requestId = req.headers.get("x-request-id") || randomUUID();
    const userId = req.headers.get("x-user-id") || null;

    const start = Date.now();
    return await runWithRequestContext({ requestId, userId }, async () => {
      const log = logger.with({ requestId, userId });
      log.info({ method: req.method, url: req.nextUrl.pathname }, "request:start");
      try {
        const res = await next(req);
        const ms = Date.now() - start;
        log.info({ status: res.status, durationMs: ms }, "request:end");
        return res;
      } catch (err) {
        const ms = Date.now() - start;
        log.error({ err, durationMs: ms }, "request:error");
        throw err;
      }
    });
  };
}
