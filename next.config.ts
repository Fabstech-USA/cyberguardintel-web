import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Two years, subdomains included; safe because the app is HTTPS-only in prod.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs-dist load a worker file from disk; bundling breaks that path.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Silences source-map-upload logs unless SENTRY_AUTH_TOKEN is set (CI-only;
  // uploads are skipped gracefully in local/dev builds without it).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Routes client-side Sentry requests through the app's own domain
  // (avoids ad-blockers dropping requests to ingest.sentry.io).
  tunnelRoute: "/monitoring",

  // Keeps source maps out of the client bundle after they're uploaded
  // (this SDK version deletes them post-upload by default; no flag needed).
  disableLogger: true,

  // Vercel Cron Monitors auto-instrumentation isn't used yet — skip the
  // extra build-time work.
  automaticVercelMonitors: false,
});
