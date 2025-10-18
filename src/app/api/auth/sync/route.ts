import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getLoggerWithRequest } from "@/logger/request-context";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  getLoggerWithRequest().info(
    { hasAccess: Boolean(body?.accessToken), hasRefresh: Boolean(body?.refreshToken) },
    "auth.sync"
  );
  const accessToken = body?.accessToken as string | undefined;
  const refreshToken = body?.refreshToken as string | undefined;

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { ok: false, error: "Missing tokens" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options?: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
