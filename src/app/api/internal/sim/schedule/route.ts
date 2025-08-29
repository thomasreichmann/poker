import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

const bodySchema = z.object({
  gameId: z.string().uuid(),
  handId: z.number().int().optional(),
  expectedPlayerId: z.string().uuid().optional(),
  delayMs: z.number().int().min(0).max(10000).default(2000),
});

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

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

  const { delayMs, ...payload } = parsed.data;
  const baseUrl = getBaseUrl();

  console.log("[sim-bot] schedule", { ...payload, delay: delayMs });

  waitUntil(
    (async () => {
      await new Promise((res) => setTimeout(res, delayMs));
      try {
        await fetch(`${baseUrl}/api/internal/sim/invoke`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-sim-bot-secret": secret,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Intentionally minimal logging
        console.log("[sim-bot] schedule_error", { error: (err as Error)?.message });
      }
    })()
  );

  return NextResponse.json({ ok: true, scheduled: true });
}