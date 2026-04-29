import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * (auth) — public sign-in / sign-up (URLs do not include the route group name).
 * Sign-in: /sign-in, sign-up: /sign-up
 */
const isPublicAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/post-auth(.*)",
  "/sso-callback(.*)",
]);

/**
 * (dashboard) — require a signed-in user. Route group names are not part of the URL,
 * so we match the real path prefixes under `src/app/(dashboard)/`.
 */
const isDashboardRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/dashboard(.*)",
  "/soc2(.*)",
  "/hipaa(.*)",
  "/integrations(.*)",
  "/settings(.*)",
  "/evidence(.*)",
  "/audit(.*)",
]);

/**
 * Dashboard paths a signed-in user may visit *without* an active org on their
 * session. Everything else under `isDashboardRoute` forces the user through the
 * org-creation wizard first, so we can guarantee every Clerk account is tied
 * to an Organization (Clerk's "Organizations required" setting is off, so this
 * middleware is the source of truth).
 */
const isNoOrgAllowedRoute = createRouteMatcher(["/onboarding(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublicAuthRoute(req)) {
    return;
  }

  if (isDashboardRoute(req)) {
    // 1. Require a signed-in user. Short-circuits with a redirect to sign-in
    //    if the session is missing.
    const { orgId } = await auth.protect();

    // 2. Require an active org on the session — except on /onboarding itself,
    //    which is where we *send* users to create one. Users who have a
    //    membership but no active org get bounced to /onboarding, which then
    //    forwards to /post-auth to activate their existing membership.
    if (!orgId && !isNoOrgAllowedRoute(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
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
