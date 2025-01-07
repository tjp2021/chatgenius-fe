import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
  // Public routes are routes that don't require authentication
  publicRoutes: [
    "/", // Landing page
    "/api/webhook/clerk", // Webhook endpoint (if you still have it)
  ],
  
  // Routes that can be accessed while signed out
  ignoredRoutes: [
    "/((?!api|trpc))(_next.*|.+.[w]+$)", // Ignore static files
  ],

  // Ensure auth state is propagated to all pages
  debug: process.env.NODE_ENV === 'development',
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
