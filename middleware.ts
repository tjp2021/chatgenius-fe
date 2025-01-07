import { clerkMiddleware } from "@clerk/nextjs";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|.*\\..*|api|trpc).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
