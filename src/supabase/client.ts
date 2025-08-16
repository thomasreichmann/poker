"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// src/supabase/client.ts
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const url = (() => {
  try {
    const u = new URL(rawUrl);
    if (
      typeof window !== "undefined" &&
      u.hostname === "localhost" &&
      window.location.hostname !== "localhost"
    ) {
      u.hostname = window.location.hostname; // keep port 54321
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
})();

const browserClient: SupabaseClient = createBrowserClient(url, supabaseAnonKey);

export function getSupabaseBrowserClient(): SupabaseClient {
  return browserClient;
}
