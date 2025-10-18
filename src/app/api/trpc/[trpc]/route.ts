import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getLoggerWithRequest } from "@/logger/request-context";
import { randomUUID } from "node:crypto";

const handler = (req: Request) => {
  const id = randomUUID();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const ctx = await createTRPCContext();
      const log = getLoggerWithRequest().with({ system: "trpc", requestId: id });
      log.info({ path: req.url }, "trpc.request");
      return { ...ctx, log } as typeof ctx & { log: typeof log };
    },
    onError(opts) {
      const log = getLoggerWithRequest().with({ system: "trpc" });
      log.error({ path: opts.path, error: opts.error }, "trpc.error");
    },
    responseMeta() {
      return {
        headers: new Headers({ "x-request-id": id }),
      };
    },
  });
};
export { handler as GET, handler as POST };
