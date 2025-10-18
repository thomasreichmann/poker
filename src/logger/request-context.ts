import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "./index";

export type RequestContext = {
  requestId: string;
  userId?: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | null {
  try {
    return storage.getStore() ?? null;
  } catch {
    return null;
  }
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getLoggerWithRequest(): typeof logger {
  const ctx = getRequestContext();
  return ctx ? logger.with({ requestId: ctx.requestId, userId: ctx.userId }) : logger;
}
