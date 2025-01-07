import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { AuthObject } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export default authMiddleware({
  // Only the landing page and Clerk webhook are public
  publicRoutes: [
    "/",
    "/api/webhook/clerk",
  ],
  
  afterAuth(auth: AuthObject, req: NextRequest) {
    // If user is signed in and on the landing page, redirect to channels
    if (auth.userId && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/channels", req.url));
    }

    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/',
  ],
};
