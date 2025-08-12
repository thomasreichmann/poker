import { db } from "@/db";
import { users } from "@/db/schema/users";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .orderBy(asc(users.email));

  return NextResponse.json({ users: rows });
}
