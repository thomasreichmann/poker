import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Get the current pathname
  const { pathname } = req.nextUrl;

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/game"];
  const authRoutes = ["/login", "/register"];

  // Check if the current path starts with any protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Get auth token from request headers or cookies
  const authToken =
    req.cookies.get("sb-access-token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  let hasValidSession = false;

  if (authToken) {
    try {
      // Create Supabase client to verify token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(authToken);
      hasValidSession = !error && !!user;
    } catch (error) {
      console.log("Auth verification error:", error);
      hasValidSession = false;
    }
  }

  // If user is trying to access a protected route without being logged in
  if (isProtectedRoute && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isAuthRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
