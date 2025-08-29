import { NextResponse } from "next/server";
import { z } from "zod";
import { createCallerFactory } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { createTRPCContext } from "@/trpc/init";

const bodySchema = z.object({
  gameId: z.string().uuid(),
  handId: z.number().int().optional(),
  expectedPlayerId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true, skipped: "prod" }, { status: 200 });
  }

  const secret = process.env.SIM_BOT_SECRET;
  const header = req.headers.get("x-sim-bot-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const baseCtx = await createTRPCContext();
  const caller = createCallerFactory(appRouter)({ ...baseCtx, internalSimAuth: true });

  try {
    const result = await caller.simBot.performOneMove(parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message ?? "error" }, { status: 500 });
  }
}