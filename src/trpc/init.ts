import { db } from "@/db";
import { users } from "@/db/schema/users";
import { getSupabaseServerClient } from "@/supabase/server";
import { initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import superjson from "superjson";
import { getLoggerWithRequest } from "@/logger/request-context";

export const createTRPCContext = async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const supabase = await getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  let user = userData.user;

  // Dev-only impersonation (header takes precedence per-tab; cookie fallback)
  if (process.env.NODE_ENV !== "production") {
    const hdr = await headers();
    const headerUserId = hdr.get("x-dev-impersonate-user-id");
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get("dev_impersonate_user_id")?.value;
    const impersonateUserId = headerUserId || cookieUserId;
    if (impersonateUserId) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, impersonateUserId))
        .limit(1);
      const row = rows[0];
      if (row) {
        user = {
          id: row.id,
          email: row.email,
          user_metadata: {},
          aud: "authenticated",
          app_metadata: {},
          created_at: new Date().toISOString(),
          factors: null,
          identities: null,
          phone: "",
          role: "authenticated",
          updated_at: new Date().toISOString(),
        } as unknown as typeof user;
      }
    }
  }

  return {
    user,
    supabase,
    log: getLoggerWithRequest(),
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

// Dev-only delay middleware to simulate network latency in tRPC calls
const devDelayMiddleware = t.middleware(async ({ ctx, next }) => {
  if (process.env.NODE_ENV === "production") {
    return next();
  }
  const min = Number(100);
  const max = Number(350);
  const delayMs = Math.max(
    0,
    Math.floor(Math.random() * (max - min + 1)) + min
  );
  if (delayMs > 0) {
    ctx.log.debug({ delayMs }, "trpc.devDelay");
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return next();
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure.use(devDelayMiddleware);

// Protected procedure that requires authentication
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
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

// Non-production only procedure
export const nonProdProcedure = baseProcedure.use(({ next }) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Operation not allowed in production");
  }
  return next();
});

// Dev-only procedure (non-prod + role check via server guard at call sites)
export const devOnlyProcedure = protectedProcedure.use(({ next }) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Operation not allowed in production");
  }
  return next();
});
