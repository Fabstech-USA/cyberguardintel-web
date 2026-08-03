// Sentry server-side (Node.js runtime) configuration.
// Loaded by instrumentation.ts via register() when NEXT_RUNTIME === "nodejs".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Distinguishes events by deploy target within the same Sentry project —
  // Vercel sets VERCEL_ENV to "production" | "preview" | "development"
  // automatically (requires "Automatically expose System Environment
  // Variables" enabled in Vercel Project Settings, which this project has on).
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // Ties errors to the exact deployed commit for source-map-mapped stack traces.
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Keep volume/cost low by default; raise for a Sentry Performance investigation.
  tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 0,

  // Only spam Sentry with real problems, not local noise.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  debug: false,
});
