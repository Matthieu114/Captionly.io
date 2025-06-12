import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
  
}

export const config = {
  matcher: [
    /*
     * Run middleware only on specific routes that need authentication:
     * - Dashboard and protected pages
     * - Upload and process pages
     * - Edit pages
     * But NOT on:
     * - API routes (/api)
     * - Next.js internals (_next)
     * - Static files (images, fonts, etc.)
     * - Public pages (landing page, login)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|login|auth|$).*)"
  ]
};
