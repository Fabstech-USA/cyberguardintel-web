"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CAPTCHA_ROUTE_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/post-auth",
  "/sso-callback",
] as const;

function pathMayUseClerkCaptcha(pathname: string | null): boolean {
  if (pathname === null || pathname === "") return false;
  return CAPTCHA_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Clerk Smart CAPTCHA / Turnstile mounts into this element by id. If we leave it
 * visible globally, the widget can linger on the dashboard after sign-in. Only
 * show the host on routes where sign-in / sign-up / ticket flows run.
 */
export function ClerkCaptchaHost(): React.JSX.Element {
  const pathname = usePathname();
  const active = pathMayUseClerkCaptcha(pathname);

  return (
    <div
      id="clerk-captcha"
      className={cn(
        "pointer-events-auto fixed bottom-6 left-1/2 z-[200] flex w-full max-w-lg -translate-x-1/2 justify-center px-4",
        !active && "hidden",
      )}
      aria-hidden={!active}
    />
  );
}
