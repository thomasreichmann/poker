import { NextRequest, NextResponse } from "next/server";

export function withLogging(
  next: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async function handler(req: NextRequest) {
    const requestId =
      req.headers.get("x-request-id") ||
      (globalThis.crypto && "randomUUID" in globalThis.crypto
        ? (globalThis.crypto.randomUUID as () => string)()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const userId = req.headers.get("x-user-id") || null;

    // edgeLogger.info({ requestId, method: req.method, url: req.nextUrl.pathname }, "request:start");
    try {
      const res = await next(req);
      // edgeLogger.info({ requestId, status: res.status, durationMs: Date.now() - start }, "request:end");
      try {
        res.headers.set("x-request-id", requestId);
        if (userId) res.headers.set("x-user-id", userId);
      } catch {}
      return res;
    } catch (err) {
      // edgeLogger.error({ requestId, err, durationMs: Date.now() - start }, "request:error");
      throw err;
    }
  };
}
