// Next.js server/edge instrumentation entrypoint (App Router file convention).
// https://nextjs.org/docs/app/guides/instrumentation
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors thrown while rendering (App Router nested Server Components,
// Route Handlers, and Server Actions) that Next.js's own error boundaries
// wouldn't otherwise surface to Sentry.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
