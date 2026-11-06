import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const pathname = request.nextUrl.pathname;
    const isStaticFile = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|map|json)$/i.test(pathname);
    const isPublicAsset =
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      isStaticFile;

    // Fast-path: Skip Supabase auth calls completely for static assets & internal Next.js requests
    if (isPublicAsset) {
      return supabaseResponse;
    }

    // Support all Vercel + Supabase integration naming variations
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return supabaseResponse;
    }

    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith("sb-") || c.name.includes("auth-token")
    );

    // Fast-path: If user has no auth cookie and is on an auth route, no remote call needed
    if (!hasAuthCookie && isAuthRoute) {
      return supabaseResponse;
    }

    // Fast-path: If user has no auth cookie and is requesting a protected route, redirect immediately
    if (!hasAuthCookie && !isAuthRoute) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // User has auth cookies: instantiate client to validate and refresh session
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If session expired or invalid and trying to access a protected app route
    if (!user && !isAuthRoute) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // If user is authenticated and visits /login, redirect to dashboard
    if (user && pathname === "/login") {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware safe fallback:", error);
    const pathname = request.nextUrl.pathname;
    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
    if (!isAuthRoute) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }
}
