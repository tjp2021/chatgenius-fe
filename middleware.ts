import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  
  // If not signed in and trying to access protected route, redirect to sign-in
  ignoredRoutes: ["/api/trpc"],
});

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except public ones
    '/((?!.+\\.[\\w]+$|_next|sign-in|sign-up|favicon.ico).*)',
  ]
};
