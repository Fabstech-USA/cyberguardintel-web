"use client";

// App Router's global-error boundary — catches errors thrown in the root
// layout itself, which regular error.tsx boundaries can't reach. Recommended
// by Sentry so those errors still get reported.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#errors-from-nested-react-server-components
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* NextError renders a minimal, dependency-free fallback — the root
            layout (and its providers) may be what's broken, so this can't
            reuse app components. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
