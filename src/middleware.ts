import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  
  // After sign in, redirect to /channels
  afterSignInUrl: "/channels",
  
  // If not signed in and trying to access protected route, redirect to sign-in
  afterSignOutUrl: "/",
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
