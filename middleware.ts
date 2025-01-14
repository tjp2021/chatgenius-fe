import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ["/", "/sign-in", "/sign-up"];
// Protected routes that require authentication
const protectedRoutes = ["/channels"];

export default authMiddleware({
  publicRoutes,
  afterAuth(auth, req) {
    console.log('🔒 Middleware executing for path:', req.nextUrl.pathname);
    console.log('👤 Auth state:', { 
      userId: auth.userId,
      isPublicRoute: publicRoutes.includes(req.nextUrl.pathname),
      isProtectedRoute: protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
    });

    // If the user is authenticated and trying to access a public route
    if (auth.userId && publicRoutes.includes(req.nextUrl.pathname)) {
      console.log('🔄 Authenticated user accessing public route - redirecting to /channels');
      const channelsUrl = new URL("/channels", req.url);
      return NextResponse.redirect(channelsUrl);
    }

    // If the user is not authenticated and trying to access a protected route
    if (!auth.userId && protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
      console.log('⚠️ Unauthenticated user accessing protected route - redirecting to /sign-in');
      const signInUrl = new URL("/sign-in", req.url);
      return NextResponse.redirect(signInUrl);
    }

    console.log('✅ Request proceeding normally');
    return NextResponse.next();
  },
  ignoredRoutes: ["/api/trpc"]
});

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except next internal routes and assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};
