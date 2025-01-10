import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { AuthObject } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-up/sso-callback",
    "/sign-in/sso-callback",
    "/sign-up",
    "/sign-in",
  ],
  
  afterAuth(auth: AuthObject, req: NextRequest) {
    console.log('🔵 [Auth Middleware] Request:', {
      path: req.nextUrl.pathname,
      isPublicRoute: ["/", "/sign-up/sso-callback", "/sign-in/sso-callback", "/sign-up", "/sign-in"].includes(req.nextUrl.pathname),
      hasUser: !!auth.userId,
      hasSession: !!auth.sessionId,
    });

    // If user is signed in and on the landing page, redirect to channels
    if (auth.userId && req.nextUrl.pathname === "/") {
      console.log('🔵 [Auth Middleware] Redirecting authenticated user from landing to channels');
      return NextResponse.redirect(new URL("/channels", req.url));
    }

    // If user is not signed in and trying to access protected route
    // BUT allow access to public routes including the landing page
    if (!auth.userId && 
        !req.nextUrl.pathname.startsWith('/sign-in') && 
        !req.nextUrl.pathname.startsWith('/sign-up') && 
        !req.nextUrl.pathname.startsWith('/') // Don't redirect from root
    ) {
      console.log('🔴 [Auth Middleware] Unauthorized access attempt:', req.nextUrl.pathname);
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    console.log('✅ [Auth Middleware] Request authorized');
    return NextResponse.next();
  },

  debug: true,
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhook (backend webhooks)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhook).*)',
    '/',
  ],
};
