import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * (auth) — public sign-in / sign-up (URLs do not include the route group name).
 * Sign-in: /sign-in, sign-up: /sign-up
 */
const isPublicAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

/**
 * (dashboard) — require a signed-in user. Route group names are not part of the URL,
 * so we match the real path prefixes under `src/app/(dashboard)/`.
 */
const isDashboardRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/soc2(.*)",
  "/hipaa(.*)",
  "/integrations(.*)",
  "/settings(.*)",
  "/evidence(.*)",
  "/audit(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublicAuthRoute(req)) {
    return;
  }

  if (isDashboardRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
