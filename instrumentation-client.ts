// Client-side Sentry init (Next.js App Router file convention, stable since
// v15.3). Runs after the HTML document loads and before React hydrates.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Vercel exposes NEXT_PUBLIC_VERCEL_ENV to the client automatically
  // ("production" | "preview" | "development") when "Automatically expose
  // System Environment Variables" is enabled in Project Settings.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.1 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.1 : 0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});
