import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value) {
          request.cookies.set(name, value);
        },
        remove(name) {
          request.cookies.delete(name);
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dev-only impersonation: if a dev cookie is present, allow access
  // to protected routes as that user. We do not mutate supabase auth;
  // the trpc context will also honor this cookie.
  let isImpersonating = false;
  const devImpersonateUserId = request.cookies.get(
    "dev_impersonate_user_id"
  )?.value;
  if (process.env.NODE_ENV !== "production" && devImpersonateUserId) {
    isImpersonating = true;
  }

  if (!user && !isImpersonating && !isAuthPath(request.nextUrl.pathname)) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

export function shouldProtectPath(pathname: string) {
  const protectedRoutes = ["/dashboard", "/game"];
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

export function isAuthPath(pathname: string) {
  const authRoutes = [
    "/login",
    "/register",
    "/auth",
    "/api/trpc/admin.loginAsUser",
  ];
  return authRoutes.some((route) => pathname.startsWith(route));
}
