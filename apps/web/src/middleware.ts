import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/verify");

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  // If refresh token is invalid/expired, clear stale cookies and redirect to login
  if (error && !isAuthPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    });
    return response;
  }

  // If not logged in and trying to access protected routes, redirect to login
  if (!user && !isAuthPage && !isApiRoute && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and on auth pages, redirect to feed
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // Admin route protection: check is_admin flag
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }
  }

  // Rewrite /@username → /profile/username (after auth checks)
  const atMatch = request.nextUrl.pathname.match(/^\/@([a-zA-Z0-9_-]+)$/);
  if (atMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${atMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  // Rewrite /username → /profile/username (bare username without @)
  const knownRoutes = [
    "feed", "login", "signup", "forgot-password", "verify",
    "onboarding", "post", "profile", "settings", "notifications",
    "bookmarks", "leaderboard", "academy", "firms", "api", "auth",
    "compare", "search", "chat", "journal", "portfolio",
    "analytics", "calendar", "sentiments", "referrals",
    "challenges", "news", "compose", "admin",
  ];
  const bareMatch = request.nextUrl.pathname.match(/^\/([a-zA-Z0-9_-]+)$/);
  if (bareMatch && !knownRoutes.includes(bareMatch[1])) {
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${bareMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
