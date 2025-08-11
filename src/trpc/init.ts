import { getSupabaseServerClient } from "@/supabase/server";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export const createTRPCContext = async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const supabase = await getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  return {
    user,
    supabase,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error("Unauthorized");
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be non-null
    },
  });
});
