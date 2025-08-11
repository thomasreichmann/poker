"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

export function getSupabaseBrowserClient(): SupabaseClient {
  return browserClient;
}
