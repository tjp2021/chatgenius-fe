import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/"],
  // Make sure API routes are matched
  ignoredRoutes: [
    "/api/socket/io",
    // Add other public routes here
  ]
});

export const config = {
  matcher: [
    // Match all paths except static files and socket.io
    "/((?!.*\\..*|_next).*)",
    "/(api|trpc)(.*)"
  ],
};
