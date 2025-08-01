import { createClient } from "@supabase/supabase-js";
import { initTRPC } from "@trpc/server";
import { cookies } from "next/headers";
import { cache } from "react";
import superjson from "superjson";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */

  // Create a server-side Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Try to get the auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get("sb-access-token")?.value;

  let user = null;

  if (authToken) {
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(authToken);
      if (!error && authUser) {
        user = {
          id: authUser.id,
          email: authUser.email!,
          user_metadata: authUser.user_metadata,
        };
      }
    } catch (error) {
      // Auth token is invalid or expired
      console.log("Invalid auth token:", error);
    }
  }

  return {
    user,
    supabase,
  };
});

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
