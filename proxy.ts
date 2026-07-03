import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessRoute,
  getProfileForUserEmail,
  getSafeNextPath,
} from "@/lib/auth/permissions";
import { getSupabaseConfig } from "@/lib/supabaseConfig";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { url, anonKey } = getSupabaseConfig();
  const requestHeaders = new Headers(request.headers);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = getProfileForUserEmail(user?.email);

  if (!canAccessRoute(profile, pathname)) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = "/403";
    forbiddenUrl.search = "";

    return NextResponse.rewrite(forbiddenUrl, { status: 403 });
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getSafeNextPath(request.nextUrl.searchParams.get("next"));
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
