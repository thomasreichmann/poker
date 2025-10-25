import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { authRouter } from "./auth";
import { devRouter } from "./dev";
import { gameRouter } from "./game";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  game: gameRouter,
  dev: devRouter,
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query((opts) => {
      throw new Error("test");
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
