import { getLoggerWithRequest } from "@/logger/request-context";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { randomUUID } from "node:crypto";

const handler = (req: Request) => {
  const id = randomUUID();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => createTRPCContext({ req, requestId: id }),
    onError({ error, path, type }) {
      getLoggerWithRequest().error(error);
    },
    responseMeta() {
      return {
        headers: new Headers({ "x-request-id": id }),
      };
    },
  });
};
export { handler as GET, handler as POST };
