import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Matcher: Exclude static, image, API, and favicon routes
export const config = {
  matcher: [
    // Matches everything except:
    // - _next/static, _next/image
    // - favicon.ico
    // - any /api routes
    // - root (landing page)
    "/((?!api|_next/static|_next/image|favicon.ico|\\..*|$).*)"
  ]
};
