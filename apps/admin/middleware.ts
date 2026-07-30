import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie on every request and bounces
 * unauthenticated visitors to /login. Fine-grained role checks live in
 * lib/auth.ts (requireStaff) — this is only the outer wall.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/guard/login") ||
    pathname.startsWith("/ambassador/login");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // API adapters answer 401 themselves; pages bounce to the right login
    if (pathname.startsWith("/guard/api")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    url.pathname = pathname.startsWith("/guard")
      ? "/guard/login"
      : pathname.startsWith("/ambassador")
        ? "/ambassador/login"
        : "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webmanifest|js|json)$).*)"],
};
