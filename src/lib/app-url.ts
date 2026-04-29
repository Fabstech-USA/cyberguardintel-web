/**
 * Canonical origin for server-side redirects (invitation `redirectUrl`, links, etc.).
 * Set `NEXT_PUBLIC_APP_URL` in each environment (e.g. https://app.example.com).
 */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  // Vercel: production deployments should still set NEXT_PUBLIC_APP_URL to the
  // public domain you use in Clerk (custom domain). VERCEL_URL is the *.vercel.app host.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Full URL Clerk uses after an org invite is accepted (user is usually already signed in).
 * Must be allowlisted in Clerk Dashboard: Paths → Redirect URLs / allowed redirect URLs,
 * e.g. `http://localhost:3000/post-auth` and `https://your-domain.com/post-auth` (or wildcards your instance allows).
 * If this URL is missing from the allowlist, Clerk shows "cannot redirect to your application".
 */
export function getOrganizationInvitationRedirectUrl(): string {
  return `${getAppOrigin()}/post-auth`;
}
