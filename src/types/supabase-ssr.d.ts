declare module "@supabase/ssr" {
  // Minimal type declarations to satisfy the compiler; real types come from the package at runtime
  export function createBrowserClient(
    url: string,
    key: string
  ): import("@supabase/supabase-js").SupabaseClient;

  export function createServerClient(
    url: string,
    key: string,
    opts: {
      cookies: {
        get(name: string): string | undefined;
        set(name: string, value: string, options?: never): void;
        remove(name: string, options?: never): void;
      };
    }
  ): import("@supabase/supabase-js").SupabaseClient;
}
