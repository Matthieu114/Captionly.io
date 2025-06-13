import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Create a new response
  const response = NextResponse.next();

  // Create a Supabase client using cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0
          });
        }
      }
    }
  );

  // Refresh the session
  const {
    data: { session }
  } = await supabase.auth.getSession();

  // Define protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/upload", "/process", "/edit"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Only redirect to login if:
  // 1. User is not authenticated (no session)
  // 2. They're trying to access a protected route
  // 3. They're not already on login/auth pages
  if (
    !session &&
    isProtectedRoute &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    // const url = request.nextUrl.clone();
    // url.pathname = "/login";
    // url.searchParams.set("redirect", request.nextUrl.pathname);
    // return NextResponse.redirect(url);
  }

  return response;
}
