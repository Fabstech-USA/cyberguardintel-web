// Sentry edge-runtime configuration (middleware, edge API routes).
// Loaded by instrumentation.ts via register() when NEXT_RUNTIME === "edge".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});
