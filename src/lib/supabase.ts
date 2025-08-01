import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Types for auth
export type User = {
  id: string;
  email: string;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
};

export type AuthError = {
  message: string;
  status?: number;
};
