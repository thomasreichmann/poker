import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ userId: z.uuid() });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  // Set a short-lived cookie for impersonation (e.g., 7 days in dev)
  res.cookies.set("dev_impersonate_user_id", parsed.data.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dev_impersonate_user_id", "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }
  const cookieStore = await cookies();
  const userId = cookieStore.get("dev_impersonate_user_id")?.value || null;
  return NextResponse.json({ userId });
}
